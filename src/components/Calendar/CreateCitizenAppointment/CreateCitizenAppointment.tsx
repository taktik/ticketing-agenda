import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { CodeStub, DecryptedAddress, DecryptedCalendarItem, DecryptedPatient, DecryptedTelecom, EncryptedAddress, EncryptedPatient, EncryptedTelecom, RecoveryDataKey, TelecomType, User } from '@icure/cardinal-sdk'
import { Button, Divider, Form, notification, Steps } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'

// --- API ---
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { useSendEmailMutation } from '../../../core/api/emailApi'
import { useCreateDecryptedPatientMutation, useInitializeExchangeDataMutation, useLazyGetEncryptedPatientByIdQuery, useUpdateEncryptedPatientMutation } from '../../../core/api/patientApi'
import { useCreateExchangeDataRecoveryMutation } from '../../../core/api/recoveryApi'
import { useCreateUpdateUserMutation, useLazyGetUserByEmailQuery } from '../../../core/api/userApi'

// --- HELPERS ---
import { EMAIL_APPOINTMENT_CONFIRMATION, EMAIL_SENDER, MANAGE_APPOINTMENT_ROUTE } from '../../../constants'
import { Lang } from '../../../helpers/types'
import { calculateNumericEventTimes, getStringProperty, getTranslationForEntity } from '../../common/helpers'

// --- COMPONENTS ---
import { CitizenReservationProvider, useCitizenReservation } from '../../../core/contexts/CitizenReservationContext'
import { useHierarchyContext } from '../../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../../core/contexts/PermissionContext'
import { CustomModal } from '../../common/CustomModal'
import { StepAppointmentReview } from './appointmentSteps/StepAppointmentReview'
import { StepCreateEventResult } from './appointmentSteps/StepCreateEventResult'
import { StepPersonalInformation } from './appointmentSteps/StepPersonalInformation'
import { StepProcedureSelector } from './appointmentSteps/StepProcedureSelector'
import { StepTimeSlotSelector } from './appointmentSteps/StepTimeSlotSelector'
import { PersonalInfo } from './CitizenReservationTypes'

const { Step } = Steps

enum AppointmentStep {
  PROCEDURE = 0,
  TIMESLOT = 1,
  PERSONAL_INFO = 2,
  REVIEW = 3,
  RESULT = 4,
}

interface CreateEventProps {
  isVisible: boolean
  onClose: () => void
}

interface CitizenInputData {
  email: string
  firstName: string
  lastName: string
  language: string
  mobilePhone?: string
  dateOfBirth?: number
}

const CreateCitizenAppointmentContent = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  // 1. Context Access
  const {
    drafts,
    timeSlot,
    setPersonalInfo,
    isValidProcedureStep,
    availableProcedures, // <--- We need this for metadata lookup
  } = useCitizenReservation()

  const { adminRoot, siteRoot } = useHierarchyContext()
  const { dataOwnerId } = usePermissionContext()

  // 2. Local State
  const [currentStep, setCurrentStep] = useState<AppointmentStep>(AppointmentStep.PROCEDURE)
  const [creationStatus, setCreationStatus] = useState<'loading' | 'success' | 'failure' | null>(null)

  // 3. API
  const [getUserByMailLazy] = useLazyGetUserByEmailQuery()
  const [getPatientByIdLazy] = useLazyGetEncryptedPatientByIdQuery()
  const [createUpdateUser] = useCreateUpdateUserMutation()
  const [createDecryptedPatient] = useCreateDecryptedPatientMutation()
  const [updateEncryptedPatient] = useUpdateEncryptedPatientMutation()
  const [createUpdateEvent] = useCreateUpdateCalendarItemMutation()
  const [initializePatientExchangeDatas] = useInitializeExchangeDataMutation()
  const [createRecoveryDataKey] = useCreateExchangeDataRecoveryMutation()
  const [sendConfirmationEmail] = useSendEmailMutation()

  const [api, notificationContextHolder] = notification.useNotification()

  // 4. Time Helper
  const combineDateAndTime = useCallback((slot: { date: dayjs.Dayjs; time: dayjs.Dayjs }) => {
    return slot.date.hour(slot.time.hour()).minute(slot.time.minute()).second(0)
  }, [])

  // --- PATIENT FLOW HELPERS ---

  const buildDecryptedContactPayload = useCallback(
    (email: string, mobilePhone?: string) => ({
      patientAddress: new DecryptedAddress({
        telecoms: [new DecryptedTelecom({ telecomType: TelecomType.Email, telecomNumber: email }), new DecryptedTelecom({ telecomType: TelecomType.Mobile, telecomNumber: mobilePhone })],
      }),
    }),
    [],
  )

  const buildEncryptedContactPayload = useCallback(
    (email: string, mobilePhone?: string) => ({
      patientAddress: new EncryptedAddress({
        telecoms: [new EncryptedTelecom({ telecomType: TelecomType.Email, telecomNumber: email }), new EncryptedTelecom({ telecomType: TelecomType.Mobile, telecomNumber: mobilePhone })],
      }),
    }),
    [],
  )

  const handleNewCitizenFlow = useCallback(
    async (userData: CitizenInputData) => {
      const patientId = v4()
      const { patientAddress } = buildDecryptedContactPayload(userData.email, userData.mobilePhone)

      const citizenPatient = await createDecryptedPatient(
        new DecryptedPatient({
          id: patientId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          languages: [userData.language],
          dateOfBirth: userData.dateOfBirth,
          addresses: [patientAddress],
        }),
      ).unwrap()

      if (!citizenPatient) throw new Error('Failed to create patient.')

      const citizenUser = await createUpdateUser(
        new User({
          id: v4(),
          patientId,
          mobilePhone: userData.mobilePhone,
          email: userData.email,
          login: userData.email,
          name: `${userData.firstName.trim()} ${userData.lastName.trim()}`,
        }),
      ).unwrap()

      if (!citizenUser) throw new Error('Failed to create user.')

      return { citizenUser, citizenPatient }
    },
    [createDecryptedPatient, createUpdateUser, buildDecryptedContactPayload],
  )

  const handleExistingCitizenFlow = useCallback(
    async (patientUser: User, userData: CitizenInputData) => {
      let citizenUser = patientUser

      if (userData.mobilePhone && userData.mobilePhone !== citizenUser.mobilePhone) {
        const updated = await createUpdateUser(new User({ ...citizenUser, mobilePhone: userData.mobilePhone })).unwrap()
        if (updated) citizenUser = updated
      }

      const foundPatient = citizenUser.patientId ? (await getPatientByIdLazy(citizenUser.patientId)).data : undefined
      let citizenPatient: EncryptedPatient | DecryptedPatient

      if (foundPatient) {
        citizenPatient = new EncryptedPatient({ ...foundPatient })
        const { patientAddress } = buildEncryptedContactPayload(userData.email, userData.mobilePhone)

        const hasLanguageChanged = userData.language && userData.language !== (citizenPatient.languages?.[0] || '')
        const hasBirthDateChanged = userData.dateOfBirth && userData.dateOfBirth !== citizenPatient.dateOfBirth
        const needsNameUpdate = !citizenPatient.firstName
        const hasContactChanged = (userData.mobilePhone && userData.mobilePhone !== citizenUser.mobilePhone) || userData.email !== citizenUser.email

        if (hasLanguageChanged || hasBirthDateChanged || needsNameUpdate || hasContactChanged) {
          const updated = await updateEncryptedPatient(
            new EncryptedPatient({
              ...citizenPatient,
              languages: hasLanguageChanged ? [userData.language] : citizenPatient.languages,
              dateOfBirth: hasBirthDateChanged ? userData.dateOfBirth : citizenPatient.dateOfBirth,
              firstName: needsNameUpdate ? userData.firstName : citizenPatient.firstName,
              lastName: needsNameUpdate ? userData.lastName : citizenPatient.lastName,
              addresses: hasContactChanged ? [patientAddress] : citizenPatient.addresses,
            }),
          ).unwrap()
          if (updated) citizenPatient = updated
        }
      } else {
        const patientId = v4()
        const { patientAddress } = buildDecryptedContactPayload(userData.email, userData.mobilePhone)
        const createdPatient = await createDecryptedPatient(
          new DecryptedPatient({
            id: patientId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            languages: [userData.language],
            dateOfBirth: userData.dateOfBirth,
            addresses: [patientAddress],
          }),
        ).unwrap()

        if (!createdPatient) throw new Error('Failed to create patient record.')
        citizenPatient = createdPatient

        const updatedUser = await createUpdateUser(new User({ ...citizenUser, patientId: citizenPatient.id })).unwrap()
        if (updatedUser) citizenUser = updatedUser
      }

      return { citizenUser, citizenPatient }
    },
    [createUpdateUser, getPatientByIdLazy, updateEncryptedPatient, createDecryptedPatient, buildEncryptedContactPayload, buildDecryptedContactPayload],
  )

  const getOrCreateCitizenProfile = useCallback(
    async (info: PersonalInfo) => {
      const { email, countryCode, phoneNumber, language, birthDate, firstName, lastName } = info
      if (!email) throw new Error('Email is required')

      const normalizedData: CitizenInputData = {
        email,
        firstName,
        lastName,
        language,
        mobilePhone: countryCode && phoneNumber ? `${countryCode}${phoneNumber}` : undefined,
        dateOfBirth: birthDate ? Number(dayjs(birthDate).format('YYYYMMDD')) : undefined,
      }

      const { data: citizenUser } = await getUserByMailLazy(email)
      return citizenUser ? handleExistingCitizenFlow(new User({ ...citizenUser }), normalizedData) : handleNewCitizenFlow(normalizedData)
    },
    [getUserByMailLazy, handleExistingCitizenFlow, handleNewCitizenFlow],
  )

  // --- CREATION LOGIC ---

  const createAppointments = useCallback(
    async (citizenUser: User, citizenPatient: EncryptedPatient | DecryptedPatient, info: PersonalInfo) => {
      if (!citizenUser || !citizenPatient?.id || !adminRoot?.id || !siteRoot?.id || !timeSlot) {
        throw new Error('Missing critical information for creation.')
      }

      let rollingStartTime = combineDateAndTime(timeSlot)

      const creationPromises = drafts.map(async (draft) => {
        // --- LOOKUP METADATA ---
        const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)
        const siteVariant = group?.siteVariants.find((sv) => sv.id === draft.siteVariantId)

        // Safety check
        if (!draft.calendarItemType || !draft.agenda || !draft.site || !draft.duration || !group || !siteVariant) {
          throw new Error('Incomplete draft data')
        }

        const duration = draft.duration
        const numericTimes = calculateNumericEventTimes(rollingStartTime, duration)
        if (!numericTimes) throw new Error('Time calc error')

        // Move time forward for next appointment
        rollingStartTime = rollingStartTime.add(duration, 'minute')

        const newEvent = new DecryptedCalendarItem({
          id: v4(),
          patientId: citizenPatient.id,
          title: group.displayTextByLanguage[info.language] || group.displayTextByLanguage['FR'],
          calendarItemTypeId: draft.calendarItemType.id,
          duration: duration,
          agendaId: draft.agenda.id,
          phoneNumber: info.countryCode && info.phoneNumber ? `${info.countryCode}${info.phoneNumber}` : undefined,
          startTime: numericTimes.startTime,
          endTime: numericTimes.endTime,
          addressText: siteVariant.siteLocation,
          tags: [
            new CodeStub({ id: 'APPOINTMENT', code: group.id, type: 'APPOINTMENT', version: '1' }),
            new CodeStub({ id: 'APPOINTMENT|LAST_AUTHOR', code: citizenUser.id, type: 'APPOINTMENT|LAST_AUTHOR', version: '1' }),
            // QBetter metadata is retrieved from the UI Hierarchy objects
            new CodeStub({ id: 'APPOINTMENT|QBETTER_SERVICE_ID', code: getStringProperty(draft.site.publicProperties, 'SITE|QBETTER_LOCATION_ID'), type: 'APPOINTMENT|QBETTER_SERVICE_ID', version: '1' }),
            new CodeStub({
              id: 'APPOINTMENT|QBETTER_LOCATION_ID',
              code: getStringProperty(draft.calendarItemType.publicProperties, 'CALENDARITEMTYPE|QBETTER_SERVICE_ID'),
              type: 'APPOINTMENT|QBETTER_LOCATION_ID',
              version: '1',
            }),
          ],
        })

        return createUpdateEvent({
          calendarItem: newEvent,
          patient: citizenPatient,
          delegates: { adminRootId: adminRoot.id, siteRootId: siteRoot.id },
        }).unwrap()
      })

      const results = await Promise.allSettled(creationPromises)
      return results.filter((r): r is PromiseFulfilledResult<DecryptedCalendarItem> => r.status === 'fulfilled' && !!r.value).map((r) => r.value)
    },
    [drafts, adminRoot, siteRoot, createUpdateEvent, timeSlot, combineDateAndTime, availableProcedures],
  )

  // --- EMAIL LOGIC ---

  const sendEmails = useCallback(
    async (recoveryDataKey: RecoveryDataKey, citizenUser: User, citizenPatient: EncryptedPatient | DecryptedPatient, calendarItems: DecryptedCalendarItem[], info: PersonalInfo) => {
      if (!citizenUser.email) throw new Error('No valid email')

      let rollingStartTime = combineDateAndTime(timeSlot!)

      for (const draft of drafts) {
        // --- LOOKUP METADATA ---
        const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)
        const siteVariant = group?.siteVariants.find((sv) => sv.id === draft.siteVariantId)

        if (!draft.calendarItemType || !draft.agenda || !draft.duration || !group || !siteVariant) continue

        // Calculate timing for this specific email
        const duration = draft.duration
        const endTime = rollingStartTime.add(duration, 'minute')

        // Match created item
        const itemStartTime = Number(rollingStartTime.format('YYYYMMDDHHmmss'))
        const calendarItem = calendarItems.find((ci) => ci.startTime === itemStartTime)

        // Prepare Variables
        const langCode = info.language === 'Nederlands' ? 'nl' : 'fr'
        const safeLang: Lang = langCode

        // Display Strings
        const serviceName = getTranslationForEntity(draft.agenda.properties, 'SERVICE', safeLang)
        const procedureName = getTranslationForEntity(draft.calendarItemType.publicProperties, 'CALENDARITEMTYPE', safeLang)

        const dateFormat = rollingStartTime.format('DD/MM/YYYY')
        const timeFormat = `${rollingStartTime.format('HH[h]mm')} - ${endTime.format('HH[h]mm')}`

        const params = new URLSearchParams()
        params.append('recoveryData', JSON.stringify({ delegateId: dataOwnerId, recoveryKey: recoveryDataKey.asHexString() }))
        if (calendarItem) params.append('calendarItemId', calendarItem.id)
        const url = `${MANAGE_APPOINTMENT_ROUTE}?${params.toString()}`

        const hasProcedure = !!siteVariant.procedureDetails?.trim()
        const processId = EMAIL_APPOINTMENT_CONFIRMATION[safeLang][hasProcedure ? 'withProcedureDetails' : 'withoutProcedureDetails']

        await sendConfirmationEmail({
          receiver: citizenUser.email,
          from: EMAIL_SENDER,
          processId,
          cc: [],
          bcc: [],
          variables: {
            firstName: citizenPatient.firstName,
            lastName: citizenPatient.lastName,
            email: citizenUser.email,
            mobilePhone: citizenUser.mobilePhone,
            service: serviceName,
            procedure: procedureName,
            date: dateFormat,
            time: timeFormat,
            location: siteVariant.siteLocation,
            url: url,
            procedureDetails: siteVariant.procedureDetails,
          },
        })

        // Advance time loop
        rollingStartTime = endTime
      }
    },
    [drafts, dataOwnerId, sendConfirmationEmail, timeSlot, combineDateAndTime, availableProcedures],
  )

  // --- MAIN HANDLER ---

  const handleAppointmentCreation = useCallback(async () => {
    try {
      setCreationStatus('loading')
      setCurrentStep(AppointmentStep.RESULT)

      if (!dataOwnerId) throw new Error('No valid delegateId')

      const personalInfo = await form.validateFields(['personalInfo']).then((v) => v.personalInfo as PersonalInfo)

      const { citizenUser, citizenPatient } = await getOrCreateCitizenProfile(personalInfo)

      await initializePatientExchangeDatas(citizenPatient.id).unwrap()

      const calendarItems = await createAppointments(citizenUser, citizenPatient, personalInfo)
      if (!calendarItems.length) throw new Error('No appointments created')

      const recoveryDataKey = await createRecoveryDataKey(citizenPatient.id).unwrap()
      if (!recoveryDataKey) throw new Error('No recovery key')

      await sendEmails(recoveryDataKey, citizenUser, citizenPatient, calendarItems, personalInfo)

      setCreationStatus('success')
    } catch (err) {
      console.error(err)
      setCreationStatus('failure')
      api.error({ message: t('validation.unexpected_error') })
    }
  }, [form, dataOwnerId, getOrCreateCitizenProfile, initializePatientExchangeDatas, createAppointments, createRecoveryDataKey, sendEmails, t, api])

  // --- NAVIGATION ---

  const next = useCallback(async () => {
    try {
      if (currentStep === AppointmentStep.PERSONAL_INFO) {
        const values = await form.validateFields(['personalInfo'])
        setPersonalInfo(values.personalInfo)
      }
      setCurrentStep((p) => p + 1)
    } catch {
      api.error({ message: t('content.complete_required_fields') })
    }
  }, [currentStep, form, setPersonalInfo, api, t])

  const prev = useCallback(() => setCurrentStep((p) => p - 1), [])

  const reset = useCallback(() => {
    setCurrentStep(0)
    form.resetFields()
    setCreationStatus(null)
    onClose()
  }, [form, onClose])

  // --- RENDER ---

  const steps = useMemo(
    () => [
      { title: t('content.procedure'), icon: <ToolOutlined /> },
      { title: t('content.date_and_time'), icon: <CalendarOutlined /> },
      { title: t('content.your_info'), icon: <UserOutlined /> },
      { title: t('content.confirm'), icon: <CheckCircleOutlined /> },
    ],
    [t],
  )

  const isNextDisabled = useMemo(() => {
    if (currentStep === AppointmentStep.PROCEDURE) return !isValidProcedureStep
    if (currentStep === AppointmentStep.TIMESLOT) return !timeSlot
    return false
  }, [currentStep, isValidProcedureStep, timeSlot])

  const renderStep = () => {
    switch (currentStep) {
      case AppointmentStep.PROCEDURE:
        return <StepProcedureSelector />
      case AppointmentStep.TIMESLOT:
        return <StepTimeSlotSelector />
      case AppointmentStep.PERSONAL_INFO:
        return <StepPersonalInformation />
      case AppointmentStep.REVIEW:
        return <StepAppointmentReview />
      case AppointmentStep.RESULT:
        return <StepCreateEventResult creationStatus={creationStatus} />
      default:
        return null
    }
  }

  return (
    <CustomModal isVisible={true} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={1100}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
        {notificationContextHolder}
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((s) => (
            <Step key={s.title} title={s.title} icon={s.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical" initialValues={{ personalInfo: { countryCode: '+32', language: 'Français', birthDate: dayjs() } }}>
          <div style={{ minHeight: '350px' }}>{renderStep()}</div>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > 0 && currentStep < AppointmentStep.RESULT && (
                <Button size="large" onClick={prev}>
                  {t('content.previous')}
                </Button>
              )}
            </div>
            <div>
              {currentStep < AppointmentStep.REVIEW && (
                <Button size="large" type="primary" onClick={next} disabled={isNextDisabled}>
                  {t('content.next')}
                </Button>
              )}
              {currentStep === AppointmentStep.REVIEW && (
                <Button size="large" type="primary" onClick={handleAppointmentCreation}>
                  {t('content.confirm_booking_button')}
                </Button>
              )}
              {currentStep === AppointmentStep.RESULT && (
                <Button size="large" type="primary" onClick={reset}>
                  {t('content.close')}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

// === WRAPPER ===
export const CreateCitizenAppointment = (props: CreateEventProps) => {
  if (!props.isVisible) return null
  return (
    <CitizenReservationProvider>
      <CreateCitizenAppointmentContent {...props} />
    </CitizenReservationProvider>
  )
}

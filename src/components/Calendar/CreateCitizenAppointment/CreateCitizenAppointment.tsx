import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { CodeStub, DecryptedAddress, DecryptedCalendarItem, DecryptedPatient, DecryptedTelecom, EncryptedAddress, EncryptedPatient, EncryptedTelecom, RecoveryDataKey, TelecomType, User } from '@icure/cardinal-sdk'
import { Button, Divider, Form, Steps } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { EMAIL_APPOINTMENT_CONFIRMATION, EMAIL_SENDER, EmailTemplateKey, MANAGE_APPOINTMENT_ROUTE } from '../../../constants'
import { PropagationStatus, WaitForPropagationResult, useLazyGetPropagationStatusQuery, waitForPropagation } from '../../../core/api/appointmentPollingApi'
import { calendarItemApiRtk, CalendarItemTags, useCreateUpdateCalendarItemMutation, useDeleteCalendarItemByIdMutation } from '../../../core/api/calendarItemApi'
import { useSendEmailMutation } from '../../../core/api/emailApi'
import { useCreateDecryptedPatientMutation, useInitializeExchangeDataMutation, useLazyGetEncryptedPatientByIdQuery, useUpdateEncryptedPatientMutation } from '../../../core/api/patientApi'
import { useCreateExchangeDataRecoveryMutation } from '../../../core/api/recoveryApi'
import { useCreateUpdateUserMutation, useLazyGetUserByEmailQuery } from '../../../core/api/userApi'
import { CitizenReservationProvider, useCitizenReservation } from '../../../core/contexts/CitizenReservationContext'
import { useHierarchyContext } from '../../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../../core/contexts/PermissionContext'
import { useAppDispatch } from '../../../core/hooks'
import { CustomModal } from '../../common/CustomModal'
import { calculateNumericEventTimes, combineDateAndTime, detectLanguage, getStringProperty, getTranslationForEntity } from '../../common/helpers'
import { CalendarItemTag, ConfirmationCodeSpecialValue, EntityType, PropertyId } from '../../../core/api/fetchType'
import { StepAppointmentReview } from './appointmentSteps/StepAppointmentReview'
import { StepCreateEventResult } from './appointmentSteps/StepCreateEventResult'
import { StepPersonalInformation } from './appointmentSteps/StepPersonalInformation'
import { StepProcedureSelector } from './appointmentSteps/StepProcedureSelector'
import { StepTimeSlotSelector } from './appointmentSteps/StepTimeSlotSelector'
import { AppointmentStep, CreatedAppointmentSummary, CreatedAppointmentSummaryItem, CreationStatus, PersonalInfo } from '../../../types/citizenReservationTypes'
import { useNotificationHelper } from '../../../core/hooks/useNotificationHelper'

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
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const { drafts, timeSlot, setPersonalInfo, isValidProcedureStep, availableProcedures } = useCitizenReservation()

  const { adminRoot, siteRoot } = useHierarchyContext()
  const { dataOwnerId } = usePermissionContext()

  const [currentStep, setCurrentStep] = useState<AppointmentStep>(AppointmentStep.PROCEDURE)
  const [creationStatus, setCreationStatus] = useState<CreationStatus | null>(null)
  const [appointmentSummary, setAppointmentSummary] = useState<CreatedAppointmentSummary | null>(null)

  const [getUserByMailLazy] = useLazyGetUserByEmailQuery()
  const [getPatientByIdLazy] = useLazyGetEncryptedPatientByIdQuery()
  const [createUpdateUser] = useCreateUpdateUserMutation()
  const [createDecryptedPatient] = useCreateDecryptedPatientMutation()
  const [updateEncryptedPatient] = useUpdateEncryptedPatientMutation()
  const [createUpdateEvent] = useCreateUpdateCalendarItemMutation()
  const [initializePatientExchangeDatas] = useInitializeExchangeDataMutation()
  const [createRecoveryDataKey] = useCreateExchangeDataRecoveryMutation()
  const [deleteEvent] = useDeleteCalendarItemByIdMutation()
  const [sendConfirmationEmail] = useSendEmailMutation()
  const [triggerPolling] = useLazyGetPropagationStatusQuery()

  const { openNotification, notificationContextHolder } = useNotificationHelper()

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

      if (!adminRoot?.id || !siteRoot?.id) throw new Error('Missing adminRoot or siteRoot')

      const citizenPatient = await createDecryptedPatient({
        patient: new DecryptedPatient({
          id: patientId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          languages: [userData.language],
          dateOfBirth: userData.dateOfBirth,
          addresses: [patientAddress],
        }),
        delegates: { adminRootId: adminRoot.id, siteRootId: siteRoot.id },
      }).unwrap()

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
      const previousMobilePhone = citizenUser.mobilePhone
      const previousEmail = citizenUser.email

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
        const hasContactChanged = (userData.mobilePhone && userData.mobilePhone !== previousMobilePhone) || userData.email !== previousEmail

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
        if (!adminRoot?.id || !siteRoot?.id) throw new Error('Missing adminRoot or siteRoot')
        const patientId = v4()
        const { patientAddress } = buildDecryptedContactPayload(userData.email, userData.mobilePhone)
        const createdPatient = await createDecryptedPatient({
          patient: new DecryptedPatient({
            id: patientId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            languages: [userData.language],
            dateOfBirth: userData.dateOfBirth,
            addresses: [patientAddress],
          }),
          delegates: { adminRootId: adminRoot.id, siteRootId: siteRoot.id },
        }).unwrap()

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

  const createAppointments = useCallback(
    async (citizenUser: User, citizenPatient: EncryptedPatient | DecryptedPatient, info: PersonalInfo) => {
      if (!citizenUser || !citizenPatient?.id || !adminRoot?.id || !siteRoot?.id || !timeSlot) {
        throw new Error('Missing critical information for creation.')
      }

      const startTime = combineDateAndTime(timeSlot)
      if (!startTime) throw new Error('Invalid time slot')
      let rollingStartTime = startTime

      const creationPromises = drafts.map(async (draft) => {
        const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)
        const siteVariant = group?.siteVariants.find((sv) => sv.id === draft.siteVariantId)

        if (!draft.calendarItemType || !draft.agenda || !draft.site || !draft.duration || !group || !siteVariant) {
          throw new Error('Incomplete draft data')
        }

        const numericTimes = calculateNumericEventTimes(rollingStartTime, draft.duration)
        if (!numericTimes) throw new Error('Time calculation error')

        rollingStartTime = rollingStartTime.add(draft.duration, 'minute')

        const newEvent = new DecryptedCalendarItem({
          id: v4(),
          title: draft.calendarItemType.name,
          calendarItemTypeId: draft.calendarItemType.id,
          duration: draft.duration,
          agendaId: draft.agenda.id,
          phoneNumber: info.countryCode && info.phoneNumber ? `${info.countryCode}${info.phoneNumber}` : undefined,
          startTime: numericTimes.startTime,
          endTime: numericTimes.endTime,
          addressText: siteVariant.siteLocation,
          tags: [
            new CodeStub({ id: CalendarItemTag.APPOINTMENT, code: group.id, type: CalendarItemTag.APPOINTMENT, version: '1' }),
            new CodeStub({ id: CalendarItemTag.APPOINTMENT_LAST_AUTHOR, code: citizenUser.id, type: CalendarItemTag.APPOINTMENT_LAST_AUTHOR, version: '1' }),
            new CodeStub({
              id: CalendarItemTag.APPOINTMENT_QBETTER_SERVICE_ID,
              code: getStringProperty(draft.agenda.properties, PropertyId.SERVICE_QBETTER_SERVICE_ID),
              type: CalendarItemTag.APPOINTMENT_QBETTER_SERVICE_ID,
              version: '1',
            }),
            new CodeStub({
              id: CalendarItemTag.APPOINTMENT_QBETTER_LOCATION_ID,
              code: getStringProperty(draft.site.publicProperties, PropertyId.SITE_QBETTER_LOCATION_ID),
              type: CalendarItemTag.APPOINTMENT_QBETTER_LOCATION_ID,
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
      const successes = results.filter((r): r is PromiseFulfilledResult<DecryptedCalendarItem> => r.status === 'fulfilled' && !!r.value).map((r) => r.value)
      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length > 0) {
        await Promise.allSettled(successes.map((s) => deleteEvent({ calendarItemId: s.id }).unwrap()))
        throw new Error(`Failed to create ${failures.length} of ${drafts.length} appointment(s)`)
      }
      return successes
    },
    [drafts, adminRoot, siteRoot, createUpdateEvent, timeSlot, availableProcedures, deleteEvent],
  )

  const sendEmails = useCallback(
    async (recoveryDataKey: RecoveryDataKey, citizenUser: User, citizenPatient: EncryptedPatient | DecryptedPatient, calendarItems: DecryptedCalendarItem[], info: PersonalInfo, qBetterCodes: Record<string, string>) => {
      if (!citizenUser.email) throw new Error('No valid email')

      const emailStartTime = combineDateAndTime(timeSlot!)
      if (!emailStartTime) throw new Error('Invalid time slot')
      let rollingStartTime = emailStartTime

      for (const draft of drafts) {
        const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)
        const siteVariant = group?.siteVariants.find((sv) => sv.id === draft.siteVariantId)

        if (!draft.calendarItemType || !draft.agenda || !draft.duration || !group || !siteVariant) continue

        const duration = draft.duration
        const endTime = rollingStartTime.add(duration, 'minute')

        const itemStartTime = Number(rollingStartTime.format('YYYYMMDDHHmmss'))
        const calendarItem = calendarItems.find((ci) => ci.startTime === itemStartTime)

        let confirmationCode = ''
        if (calendarItem && qBetterCodes[calendarItem.id]) {
          const code = qBetterCodes[calendarItem.id]
          if (code !== ConfirmationCodeSpecialValue.SKIPPED && code !== ConfirmationCodeSpecialValue.NONE) {
            confirmationCode = code
          }
        }

        const safeLang = detectLanguage([info.language])

        const serviceName = getTranslationForEntity(draft.agenda.properties, EntityType.SERVICE, safeLang) || draft.agenda.name || ''
        const procedureName = getTranslationForEntity(draft.calendarItemType.publicProperties, EntityType.CALENDARITEMTYPE, safeLang) || draft.calendarItemType.name || ''

        const dateFormat = rollingStartTime.format('DD/MM/YYYY')
        const timeFormat = `${rollingStartTime.format('HH[h]mm')} - ${endTime.format('HH[h]mm')}`

        const params = new URLSearchParams()
        params.append('recoveryData', JSON.stringify({ delegateId: dataOwnerId, recoveryKey: recoveryDataKey.asHexString() }))
        if (calendarItem) params.append('calendarItemId', calendarItem.id)
        const url = `${MANAGE_APPOINTMENT_ROUTE}?${params.toString()}`

        const hasProcedure = !!siteVariant.procedureDetails?.trim()
        const hasCC = !!confirmationCode

        let templateKey: EmailTemplateKey

        if (hasProcedure) {
          templateKey = hasCC ? EmailTemplateKey.WITH_PROCEDURE_DETAILS_AND_CC : EmailTemplateKey.WITH_PROCEDURE_DETAILS
        } else {
          templateKey = hasCC ? EmailTemplateKey.WITHOUT_PROCEDURE_DETAILS_AND_CC : EmailTemplateKey.WITHOUT_PROCEDURE_DETAILS
        }

        const processId = EMAIL_APPOINTMENT_CONFIRMATION[safeLang][templateKey]

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
            validationCode: confirmationCode,
          },
        }).unwrap()
        rollingStartTime = endTime
      }
    },
    [drafts, dataOwnerId, sendConfirmationEmail, timeSlot, availableProcedures],
  )

  const ensurePropagationOrRollback = useCallback(
    async (items: DecryptedCalendarItem[]) => {
      const results: WaitForPropagationResult[] = await Promise.all(items.map((item) => waitForPropagation(triggerPolling, item.id)))
      const hasFailure = results.some((r) => r.status === PropagationStatus.FAILED || r.status === 'TIMEOUT')

      if (!hasFailure) {
        const codeMap: Record<string, string> = {}
        results.forEach((r) => {
          if ('icureAppointmentId' in r) {
            codeMap[r.icureAppointmentId] = r.confirmationCode ?? ''
          }
        })
        return codeMap
      }

      // On any failure, roll back ALL created iCure calendar items.
      // Items that reached QBetter will be cancelled when iCure deletion is detected by the backend.
      // Items that failed QBetter propagation are cleaned up from iCure.
      await Promise.allSettled(items.map((item) => deleteEvent({ calendarItemId: item.id }).unwrap()))
      throw new Error('Propagation failed for one or more appointments')
    },
    [triggerPolling, deleteEvent],
  )

  const buildAppointmentSummary = useCallback(
    (calendarItems: DecryptedCalendarItem[], qBetterCodes: Record<string, string>, info: PersonalInfo): CreatedAppointmentSummary => {
      const safeLang = detectLanguage([info.language])
      const startTime = combineDateAndTime(timeSlot!)
      if (!startTime) return { items: [] }

      let rollingStartTime = startTime
      const items: CreatedAppointmentSummaryItem[] = []

      for (const draft of drafts) {
        const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)
        const siteVariant = group?.siteVariants.find((sv) => sv.id === draft.siteVariantId)
        if (!draft.calendarItemType || !draft.agenda || !draft.duration || !group || !siteVariant) continue

        const endTime = rollingStartTime.add(draft.duration, 'minute')
        const itemStartTime = Number(rollingStartTime.format('YYYYMMDDHHmmss'))
        const calendarItem = calendarItems.find((ci) => ci.startTime === itemStartTime)

        let confirmationCode = ''
        if (calendarItem && qBetterCodes[calendarItem.id]) {
          const code = qBetterCodes[calendarItem.id]
          if (code !== ConfirmationCodeSpecialValue.SKIPPED && code !== ConfirmationCodeSpecialValue.NONE) {
            confirmationCode = code
          }
        }

        const serviceName = getTranslationForEntity(draft.agenda.properties, EntityType.SERVICE, safeLang) || draft.agenda.name || ''
        const procedureName = getTranslationForEntity(draft.calendarItemType.publicProperties, EntityType.CALENDARITEMTYPE, safeLang) || draft.calendarItemType.name || ''

        items.push({
          procedureName,
          serviceName,
          date: rollingStartTime.format('DD/MM/YYYY'),
          time: `${rollingStartTime.format('HH[h]mm')} - ${endTime.format('HH[h]mm')}`,
          location: siteVariant.siteLocation,
          procedureDetails: siteVariant.procedureDetails || undefined,
          confirmationCode: confirmationCode || undefined,
        })

        rollingStartTime = endTime
      }

      return { items }
    },
    [drafts, timeSlot, availableProcedures],
  )

  const handleAppointmentCreation = useCallback(async () => {
    try {
      setCreationStatus(CreationStatus.LOADING)
      setCurrentStep(AppointmentStep.RESULT)

      if (!dataOwnerId) throw new Error('No valid delegateId')

      const { personalInfo } = form.getFieldsValue(true)

      const { citizenUser, citizenPatient } = await getOrCreateCitizenProfile(personalInfo)

      await initializePatientExchangeDatas(citizenPatient.id).unwrap()

      const calendarItems = await createAppointments(citizenUser, citizenPatient, personalInfo)
      if (!calendarItems.length) throw new Error('No appointments created')

      const recoveryDataKey = await createRecoveryDataKey(citizenPatient.id).unwrap()
      if (!recoveryDataKey) throw new Error('No recovery key')

      const qBetterCodes = await ensurePropagationOrRollback(calendarItems)

      // Email is non-critical: appointments are confirmed in QBetter at this point.
      // A failure here means the citizen won't get a confirmation email, but the booking exists.
      try {
        await sendEmails(recoveryDataKey, citizenUser, citizenPatient, calendarItems, personalInfo, qBetterCodes)
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr)
        openNotification('warning', t('validation.appointments_created_email_failed'))
      }

      setAppointmentSummary(buildAppointmentSummary(calendarItems, qBetterCodes, personalInfo))
      setCreationStatus(CreationStatus.SUCCESS)
    } catch (err) {
      console.error('Appointment creation failed:', err)
      setCreationStatus(CreationStatus.FAILURE)
      openNotification('error', t('validation.unexpected_error'))
    } finally {
      dispatch(calendarItemApiRtk.util.invalidateTags([CalendarItemTags.CalendarItem]))
    }
  }, [
    dispatch,
    form,
    dataOwnerId,
    getOrCreateCitizenProfile,
    initializePatientExchangeDatas,
    createAppointments,
    createRecoveryDataKey,
    ensurePropagationOrRollback,
    sendEmails,
    t,
    openNotification,
    buildAppointmentSummary,
  ])

  const next = useCallback(async () => {
    try {
      if (currentStep === AppointmentStep.PERSONAL_INFO) {
        const values = await form.validateFields()
        setPersonalInfo(values.personalInfo)
      }
      setCurrentStep((p) => p + 1)
    } catch {
      openNotification('error', t('content.complete_required_fields'))
    }
  }, [currentStep, form, setPersonalInfo, openNotification, t])

  const prev = useCallback(() => setCurrentStep((p) => p - 1), [])

  const reset = useCallback(() => {
    setCurrentStep(0)
    form.resetFields()
    setCreationStatus(null)
    setAppointmentSummary(null)
    onClose()
  }, [form, onClose])

  const stepItems = useMemo(
    () => [
      { key: 'procedure', title: t('content.procedure'), icon: <ToolOutlined /> },
      { key: 'timeslot', title: t('content.date_and_time'), icon: <CalendarOutlined /> },
      { key: 'info', title: t('content.your_info'), icon: <UserOutlined /> },
      { key: 'confirm', title: t('content.confirm'), icon: <CheckCircleOutlined /> },
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
        return <StepCreateEventResult creationStatus={creationStatus} appointmentSummary={appointmentSummary} />
      default:
        return null
    }
  }

  return (
    <CustomModal isVisible={true} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={1200}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
        {notificationContextHolder}
        <Steps current={currentStep} items={stepItems} style={{ marginBottom: 32 }} />

        <Form form={form} layout="vertical" initialValues={{ personalInfo: { countryCode: '+32', language: 'Français' } }}>
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
                <Button size="large" type="primary" onClick={reset} disabled={creationStatus === CreationStatus.LOADING}>
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

export const CreateCitizenAppointment = (props: CreateEventProps) => {
  if (!props.isVisible) return null
  return (
    <CitizenReservationProvider>
      <CreateCitizenAppointmentContent {...props} />
    </CitizenReservationProvider>
  )
}

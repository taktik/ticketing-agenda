import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { CodeStub, DecryptedAddress, DecryptedCalendarItem, DecryptedPatient, DecryptedTelecom, RecoveryDataKey, TelecomType, User } from '@icure/cardinal-sdk'
import { Button, Divider, Form, message, notification, Steps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { EMAIL_APPOINTMENT_CONFIRMATION_FR, EMAIL_APPOINTMENT_CONFIRMATION_NL, EMAIL_SENDER, MANAGE_APPOINTMENT_ROUTE } from '../../../constants'
import { useGetAgendasByAuthorIds } from '../../../core/api/agendaApi'
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { useSendEmailMutation } from '../../../core/api/emailApi'
import { useCreateOrUpdatePatientMutation, useInitializeExchangeDataMutation, useLazyGetDecryptedPatientByIdQuery, useSharePatientWithManyMutation } from '../../../core/api/patientApi'
import { useCreateExchangeDataRecoveryMutation } from '../../../core/api/recoveryApi'
import { useCreateUpdateUserMutation, useLazyGetUserByEmailQuery } from '../../../core/api/userApi'
import { useRoot } from '../../../core/hooks/useRoot'
import { useSites } from '../../../core/hooks/useSites'
import { ProcedureSelection, ProcedureWithTimeAndSelections, transformProceduresForSelection } from '../../../helpers/transformProcedures'
import { CustomModal } from '../../common/CustomModal'
import { calculateNumericEventTimes, getTranslationForEntity } from '../../common/helpers'
import { StepAppointmentReview } from './appointmentSteps/StepAppointmentReview'
import { StepCreateEventResult } from './appointmentSteps/StepCreateEventResult'
import { StepPersonalInformation } from './appointmentSteps/StepPersonalInformation'
import { StepProcedureSelector } from './appointmentSteps/StepProcedureSelector'
import { StepTimeSlotSelector } from './appointmentSteps/StepTimeSlotSelector'

const { Step } = Steps

export const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

export const appointmentDuration = (formValues: AppointmentForm, procedures: ProcedureSelection[]): number => {
  // Get the array of procedures the user has selected in the form
  const formProcedures = formValues.procedures

  // Use the .reduce() method to iterate over each selected procedure and sum up their durations
  const totalDuration = formProcedures.reduce((total, currentFormProcedure) => {
    // 1. Find the main procedure group (e.g., "Demande de passeport") from the master list
    // using the ID stored in the form.
    const masterProcedure = procedures.find((p) => p.id === currentFormProcedure.procedureSelectionId)
    if (!masterProcedure) {
      return total // If not found, add nothing and move to the next item
    }

    // 2. From that group, find the specific site variant the user chose
    // using the site ID stored in the form.
    const siteVariant = masterProcedure.siteVariants.find((sv) => sv.siteId === currentFormProcedure.site)
    if (!siteVariant) {
      return total
    }

    // 3. From that site variant, find the specific attendee/quantity variant
    // using the quantity stored in the form.
    const procedureVariant = siteVariant.variants.find((pv) => pv.attendees === currentFormProcedure.quantity)
    if (!procedureVariant) {
      return total
    }

    // 4. If we successfully found the exact variant, add its duration to the running total.
    return total + (procedureVariant.duration || 0)
  }, 0)

  return totalDuration
}

export const findProcedureData = (selections: ProcedureSelection[], formProcedure: FormProcedure) => {
  if (!selections || !formProcedure.procedureSelectionId) {
    return { masterProcedure: undefined, siteVariant: undefined, procedureVariant: undefined }
  }

  const masterProcedure = selections.find((proc) => proc.id === formProcedure.procedureSelectionId)
  if (!masterProcedure) {
    return { masterProcedure: undefined, siteVariant: undefined, procedureVariant: undefined }
  }

  const siteVariant = formProcedure.site ? masterProcedure.siteVariants.find((sv) => sv.siteId === formProcedure.site) : undefined
  if (!siteVariant) {
    return { masterProcedure, siteVariant: undefined, procedureVariant: undefined }
  }

  const procedureVariant = formProcedure.quantity ? siteVariant.variants.find((pv) => pv.attendees === formProcedure.quantity) : undefined

  return { masterProcedure, siteVariant, procedureVariant }
}

export const formatDateTime = (dateForm: dayjs.Dayjs | undefined, timeForm: dayjs.Dayjs | undefined) => {
  const date = dateForm
  const time = timeForm
  if (!date || !time) return 'N/A'

  const hour = timeForm.hour()
  const minute = timeForm.minute()

  const combinedDateTime = date.hour(hour).minute(minute)

  return combinedDateTime.format('LLLL')
}

/**
 * Combines a dayjs date object and a dayjs time object into a single dayjs object.
 * @param {TimeSlot} timeslot - An object containing the date and time.
 * @returns {Dayjs | null} - A new dayjs object with the combined date and time, or null if invalid.
 */
export const combineDateAndTime = (timeslot: TimeSlot): Dayjs | null => {
  const { date, time } = timeslot

  // Check if both inputs are valid dayjs objects
  if (!date || !date.isValid() || !time || !time.isValid()) {
    console.error('Invalid date or time provided for combination.')
    return null
  }

  // Start with the date, then set the hour, minute, and second from the time object.
  // Setting seconds and milliseconds to 0 ensures consistency.
  const combinedDateTime = date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0)

  return combinedDateTime
}

export interface FormProcedure {
  procedureSelectionId: string
  site: string
  quantity: number
}

interface PersonalInfo {
  firstName: string
  lastName: string
  phoneNumber: number
  countryCode: string
  language: string
  birthDate: Date
  email: string
}

interface TimeSlot {
  date: Dayjs
  time: dayjs.Dayjs
}

export interface AppointmentForm {
  procedures: FormProcedure[]
  timeslot: TimeSlot
  personalInfo: PersonalInfo
}

interface CreateEventProps {
  isVisible: boolean
  onClose: () => void
}

enum AppointmentStep {
  PROCEDURE = 0,
  TIMESLOT = 1,
  PERSONAL_INFO = 2,
  REVIEW = 3,
  RESULT = 4,
}

export const CreateEvent = ({ isVisible, onClose }: CreateEventProps) => {
  const { t, i18n } = useTranslation()
  const [creationStatus, setCreationStatus] = useState<'loading' | 'success' | 'failure' | null>(null)
  const [currentStep, setCurrentStep] = useState<AppointmentStep>(AppointmentStep.PROCEDURE)
  const [form] = Form.useForm<AppointmentForm>()

  const formValues: AppointmentForm = form.getFieldsValue(true)

  const { sites } = useSites()

  const watchedProcedures = Form.useWatch('procedures', form)
  const watchedSelectedTime = Form.useWatch(['timeslot', 'time'], form)
  const watchedPersonalInfo = Form.useWatch('personalInfo', form)

  const { adminRoot, siteRoot, isAdminRootLoading, isSiteRootLoading } = useRoot()

  const siteIds = useMemo(() => (sites ?? []).map((site) => site.id), [sites])

  const { data: allAgendas, isLoading: isAgendasLoading } = useGetAgendasByAuthorIds({ skip: !siteIds, authorIds: siteIds ?? [] })

  const filteredAgenda = useMemo(() => (allAgendas ?? []).filter((agenda) => siteIds.includes(agenda.author ?? '')), [allAgendas, siteIds])
  const agendaIds = useMemo(() => (filteredAgenda ?? []).map((agenda) => agenda.id), [filteredAgenda])

  const { data: allProcedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesForMultipleAgendasQuery(agendaIds, { skip: !agendaIds || agendaIds.length === 0 })

  const selections = useMemo(() => transformProceduresForSelection(allProcedures?.flat() ?? [], allAgendas ?? [], sites ?? []), [allProcedures, allAgendas, sites])

  const isLoading = useMemo(() => isAgendasLoading || isProceduresLoading || isSiteRootLoading || isAdminRootLoading, [isAgendasLoading, isProceduresLoading, isSiteRootLoading, isAdminRootLoading])

  const [getUserByMailLazy] = useLazyGetUserByEmailQuery()
  const [getPatientByIdLazy] = useLazyGetDecryptedPatientByIdQuery()
  const [createUpdateUser] = useCreateUpdateUserMutation()
  const [createUpdatePatient] = useCreateOrUpdatePatientMutation()
  const [createUpdateEvent] = useCreateUpdateCalendarItemMutation()
  const [initializePatientExchangeDatas] = useInitializeExchangeDataMutation()
  const [createRecoveryDataKey] = useCreateExchangeDataRecoveryMutation()
  const [sharePatient] = useSharePatientWithManyMutation()
  const [sendConfirmationEmail] = useSendEmailMutation()

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  const steps = [
    { title: t('content.procedure'), icon: <ToolOutlined /> },
    { title: t('content.date_and_time'), icon: <CalendarOutlined /> },
    { title: t('content.your_info'), icon: <UserOutlined /> },
    { title: t('content.confirm'), icon: <CheckCircleOutlined /> },
  ]

  const getOrCreateCitizenProfile = async () => {
    const { personalInfo } = formValues

    if (!personalInfo) {
      throw new Error('Personal information is missing and required to create an appointment.')
    }

    const { email, countryCode, phoneNumber, language, birthDate, firstName, lastName } = personalInfo
    if (!email) {
      throw new Error('User email is required but was not provided.')
    }

    if (!adminRoot?.id || !siteRoot?.id) {
      throw new Error('Required root or site information missing. Cannot proceed.')
    }

    const newPhoneNumber = countryCode && phoneNumber ? `${countryCode}${phoneNumber}` : undefined
    const newBirthDate = birthDate ? Number(dayjs(birthDate).format('YYYYMMDD')) : undefined

    // Find user by email
    const { data: existingUser } = await getUserByMailLazy(email)

    if (existingUser) {
      // --- USER EXISTS ---
      let citizenUser = new User({ ...existingUser })

      // 1. Update user's phone if it changed
      if (newPhoneNumber && newPhoneNumber !== citizenUser.mobilePhone) {
        const updatedUser = await createUpdateUser(new User({ ...citizenUser, mobilePhone: newPhoneNumber })).unwrap()
        if (!updatedUser) throw new Error("Failed to update user's phone number.")
        citizenUser = updatedUser
      }

      // 2. Find or initialize the associated patient
      let citizenPatient: DecryptedPatient
      if (citizenUser.patientId) {
        const { data: foundPatient } = await getPatientByIdLazy(citizenUser.patientId)
        if (foundPatient) {
          citizenPatient = new DecryptedPatient({ ...foundPatient })
        } else {
          // Found user but patient was deleted/missing, create a new one
          citizenPatient = new DecryptedPatient({ id: v4(), firstName, lastName })
        }
      } else {
        // User exists but has no patientId, create a new one
        citizenPatient = new DecryptedPatient({ id: v4(), firstName, lastName })
      }

      // 3. Check if patient record needs updates
      const hasLanguageChanged = language && language !== (citizenPatient.languages?.[0] || '')
      const hasBirthDateChanged = newBirthDate && newBirthDate !== citizenPatient.dateOfBirth
      const needsNameUpdate = !citizenPatient.firstName
      const hasPhoneOrEmailChanged = (newPhoneNumber && newPhoneNumber !== citizenUser.mobilePhone) || email !== citizenUser.email

      const patientEmail = new DecryptedTelecom({
        telecomType: TelecomType.Email,
        telecomNumber: email,
      })

      const patientPhone = new DecryptedTelecom({
        telecomType: TelecomType.Mobile,
        telecomNumber: newPhoneNumber,
      })

      const patientAddress = new DecryptedAddress({
        telecoms: [patientEmail, patientPhone],
      })

      if (hasLanguageChanged || hasBirthDateChanged || needsNameUpdate || hasPhoneOrEmailChanged) {
        const patientPayload = new DecryptedPatient({
          ...citizenPatient,
          languages: hasLanguageChanged ? [language!] : citizenPatient.languages,
          dateOfBirth: hasBirthDateChanged ? newBirthDate : citizenPatient.dateOfBirth,
          firstName: needsNameUpdate ? firstName : citizenPatient.firstName,
          lastName: needsNameUpdate ? lastName : citizenPatient.lastName,
          addresses: hasPhoneOrEmailChanged ? [patientAddress] : citizenPatient.addresses,
        })
        const updatedPatient = await createUpdatePatient(patientPayload).unwrap()
        if (updatedPatient) {
          citizenPatient = updatedPatient
        }
      }
      const sharedPatient = await sharePatient({
        patient: citizenPatient,
        delegates: [siteRoot.id, adminRoot.id],
      }).unwrap()
      if (sharedPatient) citizenPatient = sharedPatient

      return { citizenUser, citizenPatient }
    } else {
      // --- USER DOES NOT EXIST ---
      // 1. Create a new Patient record first
      const patientId = v4()

      const patientEmail = new DecryptedTelecom({
        telecomType: TelecomType.Email,
        telecomNumber: email,
      })

      const patientPhone = new DecryptedTelecom({
        telecomType: TelecomType.Mobile,
        telecomNumber: newPhoneNumber,
      })

      const patientAddress = new DecryptedAddress({
        telecoms: [patientEmail, patientPhone],
      })
      const newPatientPayload = new DecryptedPatient({ id: patientId, languages: [language], dateOfBirth: newBirthDate, firstName, lastName, addresses: [patientAddress] })
      let citizenPatient = await createUpdatePatient(newPatientPayload).unwrap()
      if (!citizenPatient) {
        throw new Error('Failed to create a new patient record.')
      }

      // 2. Create the new User and link it to the new Patient
      const newUserPayload = new User({ id: v4(), patientId, mobilePhone: newPhoneNumber, email, login: email, name: `${firstName.trim()} ${lastName.trim()}` })
      const citizenUser = await createUpdateUser(newUserPayload).unwrap()
      if (!citizenUser) {
        // This is where an orphaned patient record could be left
        throw new Error('Failed to create a new user record after creating patient.')
      }

      const sharedPatient = await sharePatient({
        patient: citizenPatient,
        delegates: [siteRoot.id, adminRoot.id],
      }).unwrap()
      if (sharedPatient) citizenPatient = sharedPatient

      return { citizenUser, citizenPatient }
    }
  }

  const createAppointments = async (citizenUser: User, citizenPatient: DecryptedPatient) => {
    try {
      const { personalInfo, procedures, timeslot } = formValues

      if (!personalInfo) {
        throw new Error('Personal information is missing and required to create an appointment.')
      }
      if (!timeslot) {
        throw new Error('Timeslot information is missing and required to create an appointment.')
      }
      if (!citizenUser || !citizenPatient?.id) {
        throw new Error('Could not retrieve or create a valid user/patient profile.')
      }
      if (!adminRoot?.id || !siteRoot?.id) {
        throw new Error('Required root or site information missing. Cannot proceed.')
      }

      let currentStartTime = combineDateAndTime(timeslot)

      if (!currentStartTime) {
        throw new Error('Timeslot information is missing and required to create an appointment.')
      }

      const proceduresWithTime: ProcedureWithTimeAndSelections[] = []

      for (const item of procedures) {
        const { procedureVariant, masterProcedure, siteVariant } = findProcedureData(selections, {
          procedureSelectionId: item.procedureSelectionId,
          site: item.site,
          quantity: item.quantity,
        })

        if (!procedureVariant) {
          throw new Error(`Procedure data for ${item.procedureSelectionId} is incomplete. Cannot calculate times.`)
        }

        const durationInMinutes = procedureVariant.duration
        const numericTimes = calculateNumericEventTimes(currentStartTime, durationInMinutes)
        if (!numericTimes) {
          throw new Error(`Failed to calculate numeric time for procedure ${item.procedureSelectionId}`)
        }

        proceduresWithTime.push({
          procedure: item,
          specificTimeslot: numericTimes,
          masterProcedure: masterProcedure,
          siteVariant: siteVariant,
          procedureVariant: procedureVariant,
        })

        currentStartTime = currentStartTime.add(durationInMinutes, 'minute')
      }

      const eventsCreationPromises = proceduresWithTime.map(async (procWithTime) => {
        const { procedure: item, specificTimeslot: eventTimes, masterProcedure, siteVariant, procedureVariant } = procWithTime

        if (!masterProcedure || !siteVariant || !procedureVariant) {
          throw new Error(`Procedure data for selection ID ${item.procedureSelectionId} is incomplete.`)
        }

        const newEvent = new DecryptedCalendarItem({
          id: v4(),
          patientId: citizenPatient.id,
          title: masterProcedure.displayText,
          calendarItemTypeId: procedureVariant.procedureId,
          duration: procedureVariant.duration,
          agendaId: siteVariant.agendaId,
          phoneNumber: personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined,
          startTime: eventTimes?.startTime,
          endTime: eventTimes?.endTime,
          addressText: siteVariant.siteLocation,
          tags: [new CodeStub({ id: 'APPOINTMENT|1', code: 'APPOINTMENT', type: 'APPOINTMENT', version: '1' })],
        })

        return createUpdateEvent({ calendarItem: newEvent, patient: citizenPatient, delegates: [adminRoot.id, siteRoot.id] }).unwrap()
      })
      await Promise.allSettled(eventsCreationPromises)
    } catch (error: unknown) {
      console.error('An error occurred during appointment creation:', error)
      openNotification('error', t('validation.unexpected_error'), error instanceof Error ? error.message : 'An unknown error occurred.')
    }
  }

  const computeUrl = useCallback((recoveryDataKey: RecoveryDataKey) => {
    const path = MANAGE_APPOINTMENT_ROUTE
    const params = new URLSearchParams()
    params.append('recoveryData', recoveryDataKey.asHexString())
    return `${path}?${params.toString()}`
  }, [])

  const computeEmailPayload = useCallback(
    (
      recoveryDataKey: RecoveryDataKey,
      citizenUser: User,
      citizenPatient: DecryptedPatient,
      serviceName: string,
      procedureName: string,
      specificTimeslot: {
        start: dayjs.Dayjs
        end: dayjs.Dayjs
      },
      siteLocation: string,
      lang: string,
      procedureDetails: string,
    ) => {
      const dateFormat = specificTimeslot.start.format('DD/MM/YYYY')
      const heureFormat = `${specificTimeslot.start.format('HH[h]mm')} - ${specificTimeslot.end.format('HH[h]mm')}`
      const url = computeUrl(recoveryDataKey)

      return {
        receiver: citizenUser.email!,
        from: EMAIL_SENDER,
        processId: lang === 'nl' ? EMAIL_APPOINTMENT_CONFIRMATION_NL : EMAIL_APPOINTMENT_CONFIRMATION_FR,
        variables: {
          firstName: citizenPatient.firstName,
          lastName: citizenPatient.lastName,
          email: citizenUser.email,
          mobilePhone: citizenUser.mobilePhone,
          service: serviceName,
          procedure: procedureName,
          date: dateFormat,
          time: heureFormat,
          location: siteLocation,
          url: url,
          procedureDetails: procedureDetails,
        },
      }
    },
    [computeUrl],
  )

  const sendEmails = useCallback(
    async (recoveryDataKey: RecoveryDataKey | undefined, citizenUser: User, citizenPatient: DecryptedPatient) => {
      try {
        if (!recoveryDataKey) throw new Error('No valid recoveryDataKey')
        if (!citizenUser.email) throw new Error('No valid email')
        const { procedures, timeslot } = formValues

        let currentStartTime = combineDateAndTime(timeslot)

        if (!currentStartTime) {
          throw new Error('Timeslot information is missing and required to send an email.')
        }

        for (const procedure of procedures) {
          const { masterProcedure, siteVariant, procedureVariant } = findProcedureData(selections, {
            procedureSelectionId: procedure.procedureSelectionId,
            site: procedure.site,
            quantity: procedure.quantity,
          })
          if (!masterProcedure || !siteVariant || !procedureVariant) {
            return Promise.reject(new Error(`Procedure data for ${procedure.procedureSelectionId} is incomplete.`))
          }
          const durationInMinutes = procedureVariant.duration
          const endTime = currentStartTime.add(durationInMinutes, 'minute')
          const specificTimeslot = {
            start: currentStartTime,
            end: endTime,
          }
          const appointmentService = allAgendas.find((agenda) => agenda.id === siteVariant.agendaId)
          const appointmentProcedure = (allProcedures ?? []).flat().find((procedure) => procedure.id === procedureVariant.procedureId)

          const lang = citizenPatient.languages[0] === 'Néerlandais' ? 'nl' : 'fr'

          const serviceName = getTranslationForEntity(appointmentService?.properties, 'SERVICE', lang) || masterProcedure.serviceName
          const procedureName = getTranslationForEntity(appointmentProcedure?.publicProperties, 'CALENDARITEMTYPE', lang) || masterProcedure.procedureName
          const siteLocation = siteVariant.siteLocation

          const emailPayload = computeEmailPayload(recoveryDataKey, citizenUser, citizenPatient, serviceName, procedureName, specificTimeslot, siteLocation, lang, siteVariant.procedureDetails)
          await sendConfirmationEmail(emailPayload)
          currentStartTime = currentStartTime.add(durationInMinutes, 'minute')
        }
      } catch (emailError) {
        console.error(console.error(`Failed to send confirmation email for appt: `, emailError))
      }
    },
    [formValues, selections, computeEmailPayload, sendConfirmationEmail, allAgendas, allProcedures],
  )

  const handleRecoveryDataKey = useCallback(async (citizenPatient: DecryptedPatient) => {
    try {
      await initializePatientExchangeDatas(citizenPatient.id).unwrap()
      return await createRecoveryDataKey(citizenPatient.id).unwrap()
    } catch (error) {
      throw new Error(`Error processing recovery data key: ${(error as Error).message}`)
    }
  }, [])

  const next = useCallback(async () => {
    try {
      await form.validateFields()
      setCurrentStep((prevStep) => prevStep + 1)
    } catch (err) {
      openNotification('error', t('content.complete_required_fields'), '')
    }
  }, [form, t, setCurrentStep, openNotification])

  const prev = useCallback(() => setCurrentStep((prevStep) => prevStep - 1), [setCurrentStep])

  const reset = useCallback(() => {
    setCurrentStep(0)
    form.resetFields()
    form.setFieldsValue({ procedures: [{ procedureSelectionId: undefined, quantity: 1 }] })
    onClose()
  }, [setCurrentStep, form, onClose])

  const handleAppointmentCreation = useCallback(async () => {
    try {
      setCreationStatus('loading')
      setCurrentStep((prevStep) => prevStep + 1)
      await form.validateFields()
      const { citizenUser, citizenPatient } = await getOrCreateCitizenProfile()
      await createAppointments(citizenUser, citizenPatient)
      const recoveryDataKey = await handleRecoveryDataKey(citizenPatient)
      await sendEmails(recoveryDataKey, citizenUser, citizenPatient)
      setCreationStatus('success')
    } catch (err) {
      setCreationStatus('failure')
      openNotification('error', t('content.complete_required_fields'), '')
    }
  }, [form, createAppointments, openNotification, getOrCreateCitizenProfile, t])

  const stepContent = [
    <StepProcedureSelector selections={selections} isProcedureLoading={isLoading} form={form} key={'procedureStep'} />,
    <StepTimeSlotSelector form={form} formProcedure={formValues.procedures} selections={selections} key={'TimeStep'} />,
    <StepPersonalInformation key={'InformationStep'} />,
    <StepAppointmentReview formValues={form.getFieldsValue(true)} selections={selections} key={'reviewStep'} />,
    <StepCreateEventResult creationStatus={creationStatus} key={'resultStep'} />,
  ]

  const initialFormValues = {
    timeslot: {
      date: dayjs(),
      time: undefined,
    },
    personalInfo: {
      countryCode: '+32',
      language: 'Français',
      birthDate: dayjs(),
    },
  }

  const disabledRules = [!watchedProcedures || watchedProcedures.length === 0 || !watchedProcedures.every((p) => p && p.procedureSelectionId), !watchedSelectedTime]
  const isNextButtonDisabled = disabledRules[currentStep] ?? false

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={1100}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
        {notificationContextHolder}
        {messageContextHolder}
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} icon={item.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical" initialValues={initialFormValues}>
          <div style={{ minHeight: '350px' }}>{stepContent[currentStep]}</div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > AppointmentStep.PROCEDURE && currentStep < AppointmentStep.RESULT && (
                <Button size="large" onClick={prev}>
                  {t('content.previous')}
                </Button>
              )}
            </div>
            <div>
              {currentStep < AppointmentStep.REVIEW && (
                <Button size="large" type="primary" onClick={next} disabled={isNextButtonDisabled}>
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

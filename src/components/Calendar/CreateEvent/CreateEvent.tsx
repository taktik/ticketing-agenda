import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { DecryptedCalendarItem, DecryptedPatient, HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Divider, Form, message, notification, Steps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useGetAgendasQuery } from '../../../core/api/agendaApi'
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { useGetServicesForMultipleSitesQuery } from '../../../core/api/healthcarePartyApi'
import { useCreateOrUpdatePatientMutation, useLazyGetPatientByIdQuery } from '../../../core/api/patientApi'
import { useCreateUpdateUserMutation, useLazyGetUserByEmailQuery } from '../../../core/api/userApi'
import { ProcedureSelection, transformProceduresForSelection } from '../../../helpers/transformProcedures'
import { CustomModal } from '../../common/CustomModal'
import { StepAppointmentreview } from './appointmentSteps/StepAppointmentReview'
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
    const siteVariant = masterProcedure.siteVariants.find((sv) => sv.site.id === currentFormProcedure.site)
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
  }, 0) // The 0 here is the starting value for our total.

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

  const siteVariant = formProcedure.site ? masterProcedure.siteVariants.find((sv) => sv.site.id === formProcedure.site) : undefined
  if (!siteVariant) {
    return { masterProcedure, siteVariant: undefined, procedureVariant: undefined }
  }

  const procedureVariant = formProcedure.quantity ? siteVariant.variants.find((pv) => pv.attendees === formProcedure.quantity) : undefined

  return { masterProcedure, siteVariant, procedureVariant }
}

export const formatDateTime = (dateForm: dayjs.Dayjs | undefined, timeForm: string | undefined) => {
  const date = dateForm
  const time = timeForm
  if (!date || !time) return 'N/A'

  const [hour, minute] = time.split(':').map(Number)

  const combinedDateTime = date.hour(hour).minute(minute)

  return combinedDateTime.format('LLLL')
}

export interface FormProcedure {
  procedureSelectionId: string | undefined
  site: string | undefined
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
  time: string
}

export interface AppointmentForm {
  procedures: FormProcedure[]
  timeslot: TimeSlot | undefined
  personalInfo: PersonalInfo | undefined
}

interface CreateEventProps {
  isVisible: boolean
  onClose: () => void
  sites: HealthcareParty[] | undefined
}

export const CreateEvent = ({ isVisible, onClose, sites }: CreateEventProps) => {
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [form] = Form.useForm<AppointmentForm>()

  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR' // Fallback
  }, [i18n.language])

  const siteIds = useMemo(() => (sites ?? []).map((site) => site.id), [sites])

  const { data: allServices, isLoading: isServicesLoading } = useGetServicesForMultipleSitesQuery({ siteIds: siteIds }, { skip: !siteIds || siteIds.length === 0 })
  const servicesIds = useMemo(() => (allServices ?? []).map((service) => service.id), [allServices])

  const { data: allAgendas, isLoading: isAgendasLoading } = useGetAgendasQuery(undefined, { skip: !allServices || allServices.length === 0 })
  const filteredAgenda = useMemo(() => (allAgendas ?? []).filter((agenda) => servicesIds.includes(agenda.author ?? '')), [allAgendas, allServices])
  const agendaIds = useMemo(() => (filteredAgenda ?? []).map((agenda) => agenda.id), [filteredAgenda])

  const { data: allProcedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesForMultipleAgendasQuery({ agendaIds: agendaIds }, { skip: !agendaIds || agendaIds.length === 0 })

  const selections = useMemo(() => transformProceduresForSelection(allServices ?? [], allProcedures?.flat() ?? [], allAgendas ?? [], sites ?? []), [allServices, allProcedures, allAgendas, sites])

  const isLoading = useMemo(() => isServicesLoading || isAgendasLoading || isProceduresLoading, [isServicesLoading, isAgendasLoading, isProceduresLoading])

  const [getUserByMailLazy, { isError: isGetUserError, isSuccess: isGetUserSuccess, isLoading: isGetUserLoading }] = useLazyGetUserByEmailQuery()
  const [getPatientByIdLazy, { isError: isGetPatientError, isSuccess: isGetPatientSuccess, isLoading: isGetPatientLoading }] = useLazyGetPatientByIdQuery()
  const [createUpdateUser, { isError: isCreateUpdateUserError, isSuccess: isCreateUpdateUserSuccess, isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [createUpdatePatient, { isError: isCreateUpdatePatientError, isSuccess: isCreateUpdatePatientSuccess, isLoading: isCreateUpdatePatientLoading }] = useCreateOrUpdatePatientMutation()
  const [createUpdateEvent, { isError: isCreateUpdateEventError, isSuccess: isCreateUpdateEventSuccess, isLoading: isCreateUpdateEventLoading }] = useCreateUpdateCalendarItemMutation()
  const [processWorking, setProcessWorking] = useState<boolean>(false)
  const [isCreateEventSuccess, setIsCreateEventSuccess] = useState<boolean>(false)

  const isCreateLoading = useMemo(
    () => processWorking || isGetPatientLoading || isCreateUpdatePatientLoading || isCreateUpdateUserLoading || isGetUserLoading || isCreateUpdateEventLoading,
    [processWorking, isGetPatientLoading, isCreateUpdatePatientLoading, isGetUserLoading, isCreateUpdateEventLoading],
  )

  const steps = [
    { title: t('content.procedure'), icon: <ToolOutlined /> },
    { title: t('content.date_and_time'), icon: <CalendarOutlined /> },
    { title: t('content.your_info'), icon: <UserOutlined /> },
    { title: t('content.confirm'), icon: <CheckCircleOutlined /> },
  ]

  const formValues: AppointmentForm = form.getFieldsValue(true)

  const createAppointments = async () => {
    setProcessWorking(true)
    const { personalInfo, procedures } = formValues
    const userEmail = personalInfo?.email

    try {
      if (!userEmail) throw Error('Email not found.')

      let citizenUser: User | undefined
      let citizenPatient: DecryptedPatient | undefined

      // Step 1: fetch user by email
      const foundUser = await getUserByMailLazy(userEmail)

      // If we found a user
      if (foundUser.data) {
        citizenUser = { ...foundUser.data } // Create a mutable copy

        // Step 2: Update existing user's phone if it changed
        const newPhoneNumber = personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined
        if (newPhoneNumber && newPhoneNumber !== citizenUser.mobilePhone) {
          const userUpdatePayload = new User({ ...citizenUser, mobilePhone: newPhoneNumber })
          const updatedUserResult = await createUpdateUser(userUpdatePayload).unwrap()
          if (!updatedUserResult) throw new Error("Failed to update user's phone number.")
          citizenUser = updatedUserResult
        }

        // Step 3: Get or Create/Update patient for the existing user
        let patientNeedsUpdate = false
        if (citizenUser.patientId) {
          // fetch patient by id
          const foundPatient = await getPatientByIdLazy(citizenUser.patientId)

          if (foundPatient.data) {
            citizenPatient = { ...foundPatient.data }
          } else {
            citizenPatient = new DecryptedPatient({ id: v4() })
            patientNeedsUpdate = true
          }
        } else {
          citizenPatient = new DecryptedPatient({ id: v4() })
          patientNeedsUpdate = true
        }

        const newLanguage = personalInfo.language
        const newBirthDate = personalInfo.birthDate ? Number(dayjs(personalInfo.birthDate).format('YYYYMMDD')) : undefined
        const hasLanguageChanged = newLanguage && newLanguage !== (citizenPatient.languages?.[0] || '')
        const hasBirthDateChanged = newBirthDate && newBirthDate !== citizenPatient.dateOfBirth

        if (patientNeedsUpdate || hasLanguageChanged || hasBirthDateChanged) {
          const patientPayload = new DecryptedPatient({
            ...citizenPatient,
            languages: hasLanguageChanged ? [newLanguage!] : citizenPatient.languages,
            dateOfBirth: hasBirthDateChanged ? newBirthDate : citizenPatient.dateOfBirth,
            firstName: patientNeedsUpdate ? personalInfo.firstName : citizenPatient.firstName,
            lastName: patientNeedsUpdate ? personalInfo.lastName : citizenPatient.lastName,
          })
          const updatedPatient = await createUpdatePatient(patientPayload).unwrap()
          if (updatedPatient) citizenPatient = updatedPatient
        }
      } else {
        //else not found user
        const patientId = v4()
        const newBirthDate = personalInfo.birthDate ? Number(dayjs(personalInfo.birthDate).format('YYYYMMDD')) : undefined
        const newPatientPayload = new DecryptedPatient({ id: patientId, languages: [personalInfo.language], dateOfBirth: newBirthDate, firstName: personalInfo.firstName, lastName: personalInfo.lastName })
        const createdPatient = await createUpdatePatient(newPatientPayload).unwrap()
        if (!createdPatient) throw new Error('Failed to create a new patient record.')
        citizenPatient = createdPatient

        // Then create the new User linked to the new Patient
        const newPhoneNumber = personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined
        const newUserPayload = new User({ id: v4(), patientId: patientId, mobilePhone: newPhoneNumber, email: userEmail, login: userEmail, name: `${personalInfo.firstName} ${personalInfo.lastName}` })
        const createdUser = await createUpdateUser(newUserPayload).unwrap()
        if (!createdUser) throw new Error('Failed to create a new user record after creating patient.')
        citizenUser = createdUser
      }
      console.log('citizenUser', citizenUser)
      console.log('citizenPatient', citizenPatient)

      const eventsCreationPromises = procedures.map((item) => {
        const { masterProcedure, siteVariant, procedureVariant } = findProcedureData(selections, {
          procedureSelectionId: item.procedureSelectionId,
          site: item.site,
          quantity: item.quantity,
        })
        if (!masterProcedure || !siteVariant || !procedureVariant) throw Error('Unexpected error.')

        if (!citizenUser || !citizenPatient) throw Error('Unexpected error.')

        const newEvent = new DecryptedCalendarItem({
          id: v4(),
          patientId: citizenPatient.id,
          title: masterProcedure.displayText,
          calendarItemTypeId: procedureVariant.procedureId,
          duration: procedureVariant.duration,
          details: siteVariant.procedureDetails,
          agendaId: siteVariant.agendaId,
          phoneNumber: personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined,
        })
        //const eventResult = await createUpdateEvent(newEvent).unwrap()
      })
      //await Promise.all(eventsCreationPromises)

      setIsCreateEventSuccess(true)
    } catch (error: unknown) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : t('validation.unexpected_error'))
      setIsCreateEventSuccess(false)
    } finally {
      setProcessWorking(false)
    }
  }

  const next = async () => {
    try {
      await form.validateFields()
      setCurrentStep(currentStep + 1)
      if (currentStep === 3) {
        createAppointments()
      }
    } catch (err) {
      openNotification('error', t('content.complete_required_fields'), '')
    }
  }

  const prev = () => setCurrentStep(currentStep - 1)

  const reset = () => {
    setCurrentStep(0)
    form.resetFields()
    form.setFieldsValue({ procedures: [{ procedureSelectionId: undefined, quantity: 1 }] })
    onClose()
  }

  const stepContent = [
    <StepProcedureSelector selections={selections} isProcedureLoading={isLoading} form={form} key={'procedureStep'} />,
    <StepTimeSlotSelector form={form} procedures={formValues.procedures} selections={selections} key={'TimeStep'} />,
    <StepPersonalInformation key={'InformationStep'} />,
    <StepAppointmentreview formValues={form.getFieldsValue(true)} selections={selections} key={'reviewStep'} />,
    <StepCreateEventResult isCreateLoading={isCreateLoading} isCreateEventSuccess={isCreateEventSuccess} formValues={formValues} selections={selections} key={'resultStep'} />,
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

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={900}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
        {notificationContextHolder}
        {messageContextHolder}
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} icon={item.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical" initialValues={initialFormValues}>
          <div style={{ minHeight: '350px' }}>
            {currentStep < 4 ? (
              stepContent[currentStep]
            ) : (
              <>
                {isCreateLoading && <div>Loading</div>}
                {!isCreateLoading && isCreateEventSuccess && <div>Success !</div>}
                {!isCreateLoading && !isCreateEventSuccess && <div>Failure !</div>}
              </>
            )}
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > 0 && currentStep < 4 && (
                <Button size="large" onClick={prev}>
                  {t('content.previous')}
                </Button>
              )}
            </div>
            <div>
              {currentStep < 3 && (
                <Button size="large" type="primary" onClick={next}>
                  {t('content.next')}
                </Button>
              )}
              {currentStep === 3 && (
                <Button size="large" type="primary" onClick={next}>
                  {t('content.confirm_booking_button')}
                </Button>
              )}
              {currentStep === 4 && (
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

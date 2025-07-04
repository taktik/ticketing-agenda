import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Divider, Form, message, notification, Steps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAgendasQuery } from '../../../core/api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { useGetServicesForMultipleSitesQuery } from '../../../core/api/healthcarePartyApi'
import { ProcedureSelection, transformProceduresForSelection } from '../../../helpers/transformProcedures'
import { CustomModal } from '../../common/CustomModal'
import { StepAppointmentreview } from './appointmentSteps/StepAppointmentReview'
import { StepCreateAppointment } from './appointmentSteps/StepCreateAppointment'
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

  const selections2 = useMemo(() => transformProceduresForSelection(allServices ?? [], allProcedures?.flat() ?? [], allAgendas ?? [], sites ?? []), [allServices, allProcedures, allAgendas, sites])
  useEffect(() => console.log('selections 2', selections2), [selections2])

  const isLoading = useMemo(() => isServicesLoading || isAgendasLoading || isProceduresLoading, [isServicesLoading, isAgendasLoading, isProceduresLoading])

  const steps = [
    { title: t('content.procedure'), icon: <ToolOutlined /> },
    { title: t('content.date_and_time'), icon: <CalendarOutlined /> },
    { title: t('content.your_info'), icon: <UserOutlined /> },
    { title: t('content.confirm'), icon: <CheckCircleOutlined /> },
  ]

  const createAppointments = () => {}

  const next = async () => {
    try {
      await form.validateFields()
      setCurrentStep(currentStep + 1)
      if (currentStep === 4) createAppointments()
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
    <StepProcedureSelector procedures={selections} isProcedureLoading={isLoading} form={form} key={'procedureStep'} />,
    <StepTimeSlotSelector form={form} key={'TimeStep'} />,
    <StepPersonalInformation key={'InformationStep'} />,
    <StepAppointmentreview formValues={form.getFieldsValue(true)} procedures={selections} key={'reviewStep'} />,
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

  const formValues: AppointmentForm = form.getFieldsValue(true)

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
          <div style={{ minHeight: '350px' }}>{currentStep < 4 ? stepContent[currentStep] : <StepCreateAppointment formValues={formValues} form={form} selections={selections} />}</div>

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

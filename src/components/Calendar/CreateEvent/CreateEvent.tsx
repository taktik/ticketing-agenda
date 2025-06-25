import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Divider, Form, message, Result, Steps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomModal } from '../../common/CustomModal'
import { StepAppointmentreview } from './appointmentSteps/StepAppointmentReview'
import { StepPersonalInformation } from './appointmentSteps/StepPersonalInformation'
import { StepProcedureSelector } from './appointmentSteps/StepProcedureSelector'
import { StepTimeSlotSelector } from './appointmentSteps/StepTimeSlotSelector'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { useGetServicesForMultipleSitesQuery } from '../../../core/api/healthcarePartyApi'
import { useGetAgendasQuery } from '../../../core/api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { transformProceduresForSelection } from '../../../helpers/transformProcedures'

const { Step } = Steps

export interface FormProcedure {
  procedureId: string | undefined
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
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [form] = Form.useForm<AppointmentForm>()
  const siteIds = useMemo(() => (sites ?? []).map((site) => site.id), [sites])

  const { data: allServices, isLoading: isServicesLoading } = useGetServicesForMultipleSitesQuery({ siteIds: siteIds }, { skip: !siteIds || siteIds.length === 0 })
  const servicesIds = useMemo(() => (allServices ?? []).map((service) => service.id), [allServices])

  const { data: allAgendas, isLoading: isAgendasLoading } = useGetAgendasQuery(undefined, { skip: !allServices || allServices.length === 0 })
  const filteredAgenda = useMemo(() => (allAgendas ?? []).filter((agenda) => servicesIds.includes(agenda.author ?? '')), [allAgendas, allServices])
  const agendaIds = useMemo(() => (filteredAgenda ?? []).map((agenda) => agenda.id), [filteredAgenda])

  const { data: allProcedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesForMultipleAgendasQuery({ agendaIds: agendaIds }, { skip: !agendaIds || agendaIds.length === 0 })

  const selections = useMemo(() => transformProceduresForSelection(allServices ?? [], allProcedures?.flat() ?? []), [allServices, allProcedures])

  const isLoading = useMemo(() => isServicesLoading || isAgendasLoading || isProceduresLoading, [isServicesLoading, isAgendasLoading, isProceduresLoading])

  const steps = [
    { title: t('content.procedure'), icon: <ToolOutlined /> },
    { title: t('content.date_and_time'), icon: <CalendarOutlined /> },
    { title: t('content.your_info'), icon: <UserOutlined /> },
    { title: t('content.confirm'), icon: <CheckCircleOutlined /> },
  ]

  const next = async () => {
    try {
      await form.validateFields()
      setCurrentStep(currentStep + 1)
    } catch (err) {
      message.error(t('content.complete_required_fields'))
    }
  }

  const prev = () => setCurrentStep(currentStep - 1)

  const reset = () => {
    setCurrentStep(0)
    form.resetFields()
    form.setFieldsValue({ procedures: [{ procedureId: undefined, quantity: 1 }] })
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

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={900}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
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
              <Result
                status="info"
                title={t('content.confirmation_email_sent_to_address', { email: form.getFieldValue(['personalInfo', 'email']) })}
                subTitle={
                  <>
                    {t('content.confirmation_check_inbox')}
                    <br />
                    {t('content.confirmation_booking_not_final')}
                  </>
                }
              />
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
                  {t('content.book_another')}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

import { CalendarOutlined, CheckCircleOutlined, PlusOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Divider, Form, message, Result, Space, Steps, Typography } from 'antd'
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
import { ProcedureSelection, transformProceduresForSelection } from '../../../helpers/transformProcedures'
import { StepCreateAppointment } from './appointmentSteps/StepCreateAppointment'

const { Step } = Steps
const { Title, Paragraph, Text } = Typography

export const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

export const appointmentDuration = (formProcedures: FormProcedure[], procedures: ProcedureSelection[]) => {
  const duration =
    formProcedures.reduce((total, item) => {
      const procedure = procedures.find((s) => s.id === item.procedureId)
      const procedureVariant = procedure?.variants.find((p) => p.attendees === item.quantity)
      return total + (procedureVariant?.duration || 0)
    }, 0) || 0
  return duration
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

  const selections = useMemo(() => transformProceduresForSelection(allServices ?? [], allProcedures?.flat() ?? [], allAgendas ?? []), [allServices, allProcedures])

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
      message.error(t('content.complete_required_fields'))
    }
  }

  const prev = () => setCurrentStep(currentStep - 1)

  const reset = () => {
    setCurrentStep(0)
    form.resetFields()
    form.setFieldsValue({ procedures: [{ procedureId: undefined, quantity: 1 }] })
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

  const formValues: AppointmentForm = form.getFieldsValue(true)

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={900}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
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

/*

(
              <Result
                style={{ padding: 0 }}
                status="success"
                title="Booking Successful"
                subTitle={
                  <>
                    <Paragraph style={{ paddingBottom: '1rem' }}>Your appointment has been successfully completed. A summary is provided below for your records.</Paragraph>

                    <Card size="small" style={{ marginTop: 16, maxWidth: 500, margin: 'auto', textAlign: 'left' }}>
                      <Descriptions title="Appointment Summary" column={1} bordered>
                        <Descriptions.Item label={t('content.procedures')}>
                          <Space direction="vertical">
                            {formValues.procedures?.map((item, index) => {
                              const mainProcedure = selections?.find((proc) => proc.id === item.procedureId)
                              if (!mainProcedure) return null
                              return (
                                <Text key={index}>
                                  {item.quantity} x {mainProcedure.displayTextByLanguage[langCode]}
                                </Text>
                              )
                            })}
                          </Space>
                        </Descriptions.Item>

                        <Descriptions.Item label={t('content.date')}>{formatDateTime(formValues.timeslot?.date, formValues.timeslot?.time)}</Descriptions.Item>
                        <Descriptions.Item label={t('content.duration')}>
                          <Text strong>{appointmentDuration(formValues.procedures, selections) + ' ' + t('content.minutes')}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Location">Rue du sanglier</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </>
                }
              />
            )}

            */

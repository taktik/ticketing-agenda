import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Divider, Form, message, Result, Steps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomModal } from '../../common/CustomModal'
import { StepAppointmentreview } from './appointmentSteps/StepAppointmentReview'
import { StepPersonalInformation } from './appointmentSteps/StepPersonalInformation'
import { StepProcedureSelector } from './appointmentSteps/StepProcedureSelector'
import { StepTimeSlotSelector } from './appointmentSteps/StepTimeSlotSelector'

const { Step } = Steps

const procedures = [
  { id: 'proc-1', name: 'General Check-up', duration: 30 },
  { id: 'proc-2', name: 'Dental Cleaning', duration: 60 },
  { id: 'proc-3', name: 'Specialist Consultation', duration: 45 },
]

const availableTimeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

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

export interface Procedures {
  id: string
  displayText: string
  serviceName: string
  procedureName: string
  displayTextByLanguage: { [key: string]: string } // key values are set to 'FR', 'NL', 'DE', 'EN'
  procedureDetails: string
  variants: {
    procedureId: string
    attendees: number
    duration: number
  }[]
}

interface CreateEventProps {
  isVisible: boolean
  onClose: () => void
}

export const CreateEvent = ({ isVisible, onClose }: CreateEventProps) => {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [form] = Form.useForm<AppointmentForm>()

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
    <StepProcedureSelector procedures={[]} isProcedureLoading={false} form={form} key={'procedureStep'} />,
    <StepTimeSlotSelector form={form} key={'TimeStep'} />,
    <StepPersonalInformation key={'InformationStep'} />,
    <StepAppointmentreview formValues={form.getFieldsValue(true)} procedures={[]} key={'reviewStep'} />,
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

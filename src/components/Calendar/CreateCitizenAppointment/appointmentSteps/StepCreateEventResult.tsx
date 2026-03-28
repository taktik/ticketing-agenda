import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, InfoCircleOutlined, NumberOutlined } from '@ant-design/icons'
import { Card, Result, Space, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { CreatedAppointmentSummary, CreationStatus } from '../../../../types/citizenReservationTypes'
import './index.less'

const { Text, Title } = Typography

interface StepCreateEventResultProps {
  creationStatus: CreationStatus | null
  appointmentSummary: CreatedAppointmentSummary | null
}

const AppointmentSummaryCard = ({ summary }: { summary: CreatedAppointmentSummary }) => {
  const { t } = useTranslation()

  return (
    <div className="summary-wrapper">
      {summary.items.map((item, index) => (
        <Card key={index} size="small" className={index < summary.items.length - 1 ? 'summary-card-spaced' : undefined}>
          <Title level={5} className="summary-card-title">
            {item.serviceName} — {item.procedureName}
          </Title>

          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space align="center">
              <CalendarOutlined className="summary-icon-blue" />
              <Text>{item.date}</Text>
            </Space>

            <Space align="center">
              <ClockCircleOutlined className="summary-icon-blue" />
              <Text>{item.time}</Text>
            </Space>

            <Space align="start">
              <EnvironmentOutlined className="summary-icon-blue-top" />
              <Text>{item.location}</Text>
            </Space>

            {item.procedureDetails && (
              <Space align="start">
                <InfoCircleOutlined className="summary-icon-warning-top" />
                <Text>{item.procedureDetails}</Text>
              </Space>
            )}

            {item.confirmationCode && (
              <Space align="start">
                <NumberOutlined className="summary-icon-success-top" />
                <div>
                  <div>
                    <Text>{t('content.confirmation_code')} : </Text>
                    <Text strong className="summary-code-inline">
                      {item.confirmationCode}
                    </Text>
                  </div>
                  <Text type="secondary" className="summary-code-hint">
                    {t('content.present_on_arrival')}
                  </Text>
                </div>
              </Space>
            )}
          </Space>
        </Card>
      ))}
    </div>
  )
}

export const StepCreateEventResult = ({ creationStatus, appointmentSummary }: StepCreateEventResultProps) => {
  const { t } = useTranslation()

  switch (creationStatus) {
    case CreationStatus.LOADING:
      return (
        <div className="result-loading">
          <Spin size="large" />
          <p>{t('content.creating_appointment')}</p>
        </div>
      )

    case CreationStatus.SUCCESS:
      return (
        <>
          <Result status="success" title={t('content.appointment_created_successfully')} subTitle={t('content.appointment_details_email_sent')} className="summary-result-no-bottom" />
          {appointmentSummary && appointmentSummary.items.length > 0 && (
            <div className="summary-cards-wrapper">
              <AppointmentSummaryCard summary={appointmentSummary} />
            </div>
          )}
        </>
      )

    case CreationStatus.FAILURE:
      return <Result status="error" title={t('content.submission_failed')} subTitle={t('content.submission_error_generic')} />

    default:
      return null
  }
}

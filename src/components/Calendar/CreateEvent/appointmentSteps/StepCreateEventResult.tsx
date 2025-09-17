import { Result, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import './index.css'

interface StepCreateEventResultProps {
  creationStatus: 'loading' | 'success' | 'failure' | null
}
export const StepCreateEventResult = ({ creationStatus }: StepCreateEventResultProps) => {
  const { t } = useTranslation()

  switch (creationStatus) {
    case 'loading':
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '20px' }}>{t('content.creating_appointment')}</p>
        </div>
      )

    case 'success':
      return <Result status="success" title={t('content.appointment_created_successfully')} subTitle={t('content.appointment_details_email_sent')} />

    case 'failure':
      return <Result status="error" title={t('content.submission_failed')} subTitle={t('content.submission_error_generic')} />

    default:
      return null
  }
}

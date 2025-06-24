import { Descriptions, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AppointmentForm, Procedures } from '../CreateEvent'
import './index.css'

const { Title, Text } = Typography

const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

export const StepAppointmentreview: FC<{ formValues: AppointmentForm; procedures: Procedures[] }> = ({ formValues, procedures }) => {
  const { t, i18n } = useTranslation()
  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR' // Fallback
  }, [i18n.language])

  const appointmentDuration = () => {
    const duration =
      formValues.procedures?.reduce((total, item) => {
        const procedure = procedures.find((s) => s.id === item.procedureId)
        const procedureVariant = procedure?.variants.find((p) => p.attendees === item.quantity)
        return total + (procedureVariant?.duration || 0)
      }, 0) || 0
    return duration + ' ' + t('content.minutes')
  }

  const formatDateTime = useMemo(() => {
    const date = formValues.timeslot?.date
    const time = formValues.timeslot?.time
    if (!date || !time) return 'N/A'

    // Parse the fake data time string (e.g., "14:30")
    const [hour, minute] = time.split(':').map(Number)

    // Combine the date and time
    const combinedDateTime = date.hour(hour).minute(minute)

    return combinedDateTime.format('LLLL')
  }, [formValues, i18n.language])

  return (
    <>
      <Title level={4}>{t('content.review_your_appointment_title')}</Title>
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label={t('content.procedures')}>
          <Space direction="vertical">
            {formValues.procedures?.map((item, index) => {
              const procedure = procedures.find((s) => s.id === item.procedureId)
              if (!procedure) return null
              return (
                <Text key={index}>
                  {item.quantity} x {procedure.displayTextByLanguage[langCode]}
                </Text>
              )
            })}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t('content.duration')}>
          <Text strong>{appointmentDuration()}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('content.date')}>{formatDateTime}</Descriptions.Item>
        <Descriptions.Item label={t('content.full_name')}>
          {formValues.personalInfo?.firstName} {formValues.personalInfo?.lastName}
        </Descriptions.Item>
        <Descriptions.Item label={t('content.email')}>{formValues.personalInfo?.email}</Descriptions.Item>
        <Descriptions.Item label={t('content.language')}>{formValues.personalInfo?.language}</Descriptions.Item>
        <Descriptions.Item label={t('content.phone_number')}>
          {formValues.personalInfo?.countryCode}
          {formValues.personalInfo?.phoneNumber}
        </Descriptions.Item>
        <Descriptions.Item label={t('content.birth_date')}>{dayjs(formValues.personalInfo?.birthDate).format('DD/MM/YYYY')}</Descriptions.Item>
      </Descriptions>
    </>
  )
}

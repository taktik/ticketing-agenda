import { Descriptions, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import { appointmentDuration, AppointmentForm, formatDateTime, languageMapping } from '../CreateEvent'
import './index.css'

const { Title, Text } = Typography

export const StepAppointmentreview: FC<{ formValues: AppointmentForm; selections: ProcedureSelection[] }> = ({ formValues, selections }) => {
  const { t, i18n } = useTranslation()
  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR'
  }, [i18n.language])

  return (
    <>
      <Title level={4}>{t('content.review_your_appointment_title')}</Title>
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label={t('content.procedures')}>
          <Space direction="vertical">
            {formValues.procedures?.map((item, index) => {
              const procedure = selections.find((s) => s.id === item.procedureSelectionId)
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
          <Text strong>{appointmentDuration(formValues, selections) + ' ' + t('content.minutes')}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('content.date')}>{formatDateTime(formValues.timeslot?.date, formValues.timeslot?.time)}</Descriptions.Item>
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

import { Descriptions, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'

const { Title } = Typography

export const StepAppointmentReview = () => {
  const { t, i18n } = useTranslation()
  const { drafts, personalInfo, timeSlot, availableProcedures, totalDuration } = useCitizenReservation()

  const currentLang = i18n.language.toUpperCase()

  const formattedTime = useMemo(() => {
    if (!timeSlot?.date || !timeSlot?.time) return 'N/A'
    return timeSlot.date.hour(timeSlot.time.hour()).minute(timeSlot.time.minute()).format('LLLL')
  }, [timeSlot])

  return (
    <>
      <Title level={4}>{t('content.review_your_appointment_title')}</Title>

      <Descriptions bordered column={1} size="small" style={{ marginTop: 16 }} labelStyle={{ width: '25%', minWidth: '120px' }}>
        <Descriptions.Item label={t('content.full_name')}>
          {personalInfo?.firstName} {personalInfo?.lastName}
        </Descriptions.Item>
        <Descriptions.Item label={t('content.email')}>{personalInfo?.email}</Descriptions.Item>
        <Descriptions.Item label={t('content.phone_number')}>
          {personalInfo?.countryCode} {personalInfo?.phoneNumber}
        </Descriptions.Item>
        <Descriptions.Item label={t('content.date_and_time')}>{formattedTime}</Descriptions.Item>
        <Descriptions.Item label={t('content.duration')}>{totalDuration + ' ' + t('content.minutes')}</Descriptions.Item>
        {drafts.map((draft, index) => {
          const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)
          const title = group ? group.displayTextByLanguage[currentLang] || group.displayTextByLanguage['FR'] : t('content.unknown_procedure')
          const siteName = draft.site?.name || t('content.unknown_site')
          const qty = draft.quantity || 1

          return (
            <Descriptions.Item key={draft.tempId} label={`${t('content.procedure')} ${index + 1}`}>
              <div>
                {siteName} — {qty} {qty > 1 ? t('content.persons') : t('content.person')}
                <br />
                <strong>{title}</strong>
              </div>
            </Descriptions.Item>
          )
        })}
      </Descriptions>
    </>
  )
}

import { Descriptions, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'

const { Title } = Typography

export const StepAppointmentReview = () => {
  const { t, i18n } = useTranslation()
  const { drafts, personalInfo, timeSlot, availableProcedures } = useCitizenReservation()

  const currentLang = i18n.language.toUpperCase()

  // 1. Format Date/Time
  const formattedTime = useMemo(() => {
    if (!timeSlot?.date || !timeSlot?.time) return 'N/A'
    return timeSlot.date.hour(timeSlot.time.hour()).minute(timeSlot.time.minute()).format('LLLL') // Localized format based on Dayjs locale
  }, [timeSlot])

  return (
    <div className="review-step">
      <Title level={4}>{t('content.review_booking')}</Title>

      {/* 1. Personal Info */}
      <Descriptions title={t('content.your_info')} bordered column={1} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label={t('content.full_name')}>
          {personalInfo?.firstName} {personalInfo?.lastName}
        </Descriptions.Item>
        <Descriptions.Item label={t('content.email')}>{personalInfo?.email}</Descriptions.Item>
        <Descriptions.Item label={t('content.phone_number')}>
          {personalInfo?.countryCode} {personalInfo?.phoneNumber}
        </Descriptions.Item>
      </Descriptions>

      {/* 2. Time */}
      <Descriptions title={t('content.date_and_time')} bordered column={1} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label={t('content.selected_time')}>{formattedTime}</Descriptions.Item>
      </Descriptions>

      {/* 3. Procedures */}
      <Descriptions title={t('content.procedures')} bordered column={1} size="small" style={{ marginTop: 16 }}>
        {drafts.map((draft, index) => {
          // Look up the Group to get the nice multilingual label
          const group = availableProcedures.find((p) => p.id === draft.procedureGroupId)

          // Fallback logic for display text
          const title = group ? group.displayTextByLanguage[currentLang] || group.displayTextByLanguage['FR'] : t('content.unknown_procedure')

          const siteName = draft.site?.name || t('content.unknown_site')
          const qty = draft.quantity || 1

          return (
            <Descriptions.Item key={draft.tempId} label={`${t('content.procedure')} ${index + 1}`}>
              <div>
                <strong>{title}</strong>
                <br />
                {siteName} — {qty} {qty > 1 ? t('content.persons') : t('content.person')}
              </div>
            </Descriptions.Item>
          )
        })}
      </Descriptions>
    </div>
  )
}

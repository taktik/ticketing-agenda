import { Agenda, CalendarItemType, DecryptedCalendarItem, EncryptedPatient, TelecomType } from '@icure/cardinal-sdk'
import { Button, Card, Descriptions, Divider, Form, Input, notification, Spin, Typography } from 'antd'
import { format, parse } from 'date-fns'
import { enUS } from 'date-fns/locale'
import dayjs from 'dayjs'
import { EventApi } from 'fullcalendar'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLazyGetAvailabilitiesQuery } from '../../../core/api/anonymousApi'
import { useCalendarItemDetails } from '../../../core/hooks/useCalendarItemDetails'
import { CustomModal } from '../../common/CustomModal'
import { dayjsToYYYYMMDDHHmmss, formatEventDate, localeMap } from '../../common/helpers'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { TimeSlotPickerUI } from '../TimeSlotPickerUI/TimeSlotPickerUI'
import './index.css'

const { TextArea } = Input
const { Text } = Typography

export interface CalendarEventUpdateForm {
  details: string
}

interface EventExtendedProps {
  calendarItemTypeId?: string
  agendaId?: string
  patientId?: string
  isTimeOff?: boolean
  rev?: string
  details?: string
}

interface EventDetailsProps {
  isVisible: boolean
  onClose: () => void
  event: EventApi | undefined
  deleteEvent: (
    event: EventApi | undefined,
    calendarItem: DecryptedCalendarItem,
    patient: EncryptedPatient,
    agenda: Agenda,
    calendarItemType: CalendarItemType,
    patientEmail: string,
    patientPhoneNumber: string,
  ) => Promise<void>
  updateEvent: (
    event: EventApi | undefined,
    details: string,
    selectedDate: dayjs.Dayjs | undefined,
    selectedTime: dayjs.Dayjs | undefined,
    calendarItem: DecryptedCalendarItem,
    patient: EncryptedPatient,
    agenda: Agenda,
    calendarItemType: CalendarItemType,
    patientEmail: string,
    patientPhoneNumber: string,
  ) => Promise<void>
  isCalendarItemLoading: boolean
}

export const EventDetails = ({ isCalendarItemLoading, isVisible, onClose, event, deleteEvent, updateEvent }: EventDetailsProps) => {
  const { t, i18n } = useTranslation()
  const [form] = Form.useForm<CalendarEventUpdateForm>()

  const [showDeleteAppointmentModal, setShowDeleteAppointmentModal] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState(false)

  const [availabilities, setAvailabilities] = useState<dayjs.Dayjs[]>([])
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<dayjs.Dayjs | undefined>(undefined)

  const { calendarItem, patient, agenda, calendarItemType } = useCalendarItemDetails(event?.id)
  const isDetailsLoading = !calendarItem || !patient || !agenda || !calendarItemType

  const [getAvailabilities, { isLoading: availabilitiesLoading }] = useLazyGetAvailabilitiesQuery()

  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n.language])

  const extendedProps = event?.extendedProps as EventExtendedProps | undefined
  const isTimeOff = !!extendedProps?.isTimeOff

  const patientName = useMemo(() => (patient ? `${patient.firstName} ${patient.lastName}` : undefined), [patient])

  const patientBirthDate = useMemo(() => {
    if (!patient?.dateOfBirth) return undefined
    const parsed = parse(String(patient.dateOfBirth), 'yyyyMMdd', new Date())
    return format(parsed, 'dd MMMM yyyy', { locale: dateFnsLocale })
  }, [patient, dateFnsLocale])

  const { patientEmail, patientPhoneNumber } = useMemo(() => {
    const allTelecoms = patient?.addresses.flatMap((addr) => addr.telecoms || [])
    return {
      patientEmail: allTelecoms?.find((t) => t.telecomType === TelecomType.Email)?.telecomNumber,
      patientPhoneNumber: allTelecoms?.find((t) => t.telecomType === TelecomType.Mobile)?.telecomNumber,
    }
  }, [patient])

  const [api, notificationContextHolder] = notification.useNotification()
  const openNotification = useCallback(
    (type: 'error', message: string, description: string) => {
      api.open({ type, message, description, duration: 4 })
    },
    [api],
  )

  useEffect(() => {
    if (event && isVisible) {
      form.setFieldsValue({
        details: extendedProps?.details ?? '',
      })
      setIsEditing(false)
      setSelectedDate(undefined)
      setSelectedTime(undefined)
    }
  }, [event, isVisible, form, extendedProps])

  useEffect(() => {
    if (!isEditing || !agenda?.id || !calendarItemType?.id) return

    const fetchRescheduleAvailabilities = async () => {
      try {
        const startDate = currentMonth.startOf('month')
        const endDate = currentMonth.endOf('month')

        const results = await getAvailabilities(
          {
            agendaId: agenda.id,
            calendarItemTypeId: calendarItemType.id.toString(),
            startDate: dayjsToYYYYMMDDHHmmss(startDate),
            endDate: dayjsToYYYYMMDDHHmmss(endDate),
          },
          true,
        ).unwrap()

        setAvailabilities(results ?? [])

        if (!selectedDate) {
          const firstAvailable = (results ?? []).find((d: dayjs.Dayjs) => d >= dayjs().startOf('day'))
          if (firstAvailable) setSelectedDate(firstAvailable)
        }
      } catch (error) {
        openNotification('error', t('validation.unexpected_error'), '')
      }
    }

    fetchRescheduleAvailabilities()
  }, [isEditing, agenda, calendarItemType, currentMonth, getAvailabilities, openNotification, t, selectedDate])

  const handleDateSelect = useCallback((date: dayjs.Dayjs) => {
    setSelectedDate(date)
    setSelectedTime(undefined)
  }, [])

  const handleTimeSelect = useCallback((time: dayjs.Dayjs | undefined) => {
    setSelectedTime(time)
  }, [])

  const handleUpdate = useCallback(async () => {
    try {
      const { details } = await form.validateFields()

      if (!calendarItem || !patient || !agenda || !calendarItemType || !patientEmail || !patientPhoneNumber) {
        throw new Error('Missing data for email payload')
      }

      await updateEvent(event, details, selectedDate, selectedTime, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber)
      onClose()
    } catch (error) {
      console.error(error)
    }
  }, [form, event, updateEvent, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber, selectedDate, selectedTime, onClose])

  const handleDelete = useCallback(async () => {
    try {
      if (!calendarItem || !patient || !agenda || !calendarItemType || !patientEmail || !patientPhoneNumber) {
        throw new Error('Missing data for email payload')
      }
      await deleteEvent(event, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber)
      setShowDeleteAppointmentModal(false)
      onClose()
    } catch (error) {
      console.error(error)
    }
  }, [event, deleteEvent, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber, onClose])

  const renderDisplayMode = () => (
    <div className="modal-event-display">
      <Card
        title={t('content.appointment_details')}
        variant="borderless"
        styles={{ header: { paddingLeft: 0, borderBottom: 0, minHeight: 'auto' }, body: { padding: 0 } }}
        style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <Descriptions bordered column={1} styles={{ label: { width: '250px' } }}>
          <Descriptions.Item label={t('content.date_and_time')}>{event ? formatEventDate(event, dateFnsLocale) : ''}</Descriptions.Item>
          <Descriptions.Item label={t('content.procedure')}>{event?.title}</Descriptions.Item>
          <Descriptions.Item label={t('content.details')}>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{extendedProps?.details || t('content.no_details_provided')}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Spin spinning={isCalendarItemLoading || isDetailsLoading} size="large">
        {!isTimeOff && (
          <Card
            title={t('content.citizen_details')}
            variant="borderless"
            styles={{ header: { paddingLeft: 0, borderBottom: 0, minHeight: 'auto' }, body: { padding: 0 } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <Descriptions bordered column={1} styles={{ label: { width: '250px' } }}>
              <Descriptions.Item label={t('content.full_name')}>{patientName}</Descriptions.Item>
              <Descriptions.Item label={t('content.email')}>{patientEmail}</Descriptions.Item>
              <Descriptions.Item label={t('content.phone_number')}>{patientPhoneNumber}</Descriptions.Item>
              <Descriptions.Item label={t('content.birth_date')}>{patientBirthDate}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Spin>
    </div>
  )

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={isEditing ? t('content.edit_appointment') : t('content.appointment_information')} blockAntModalBodyVerticalScroll noFooter width={1000}>
      <div className="modal-event">
        {notificationContextHolder}

        <Form form={form} onFinish={handleUpdate} layout="vertical" style={{ width: '100%', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
          {isEditing ? (
            <>
              <div style={{ padding: '1rem' }}>
                <TimeSlotPickerUI
                  availabilities={availabilities}
                  isLoading={availabilitiesLoading}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateSelect={handleDateSelect}
                  onTimeSelect={handleTimeSelect}
                />
              </div>
              <Form.Item name="details" label={t('content.details')}>
                <TextArea rows={4} />
              </Form.Item>
            </>
          ) : (
            renderDisplayMode()
          )}

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {isEditing ? (
              <>
                <Button key="cancel" onClick={() => setIsEditing(false)}>
                  {t('content.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" key="save" disabled={isDetailsLoading}>
                  {t('content.save')}
                </Button>
              </>
            ) : (
              <>
                <Button key="delete" danger onClick={() => setShowDeleteAppointmentModal(true)} disabled={isDetailsLoading}>
                  {t('content.delete')}
                </Button>
                <Button key="modify" type="primary" onClick={() => setIsEditing(true)} disabled={isDetailsLoading}>
                  {t('content.modify')}
                </Button>
              </>
            )}
          </div>
        </Form>

        {showDeleteAppointmentModal &&
          createPortal(
            <ModalConfirmAction
              title={t('delete_modal.confirm_delete_appointment_prompt')}
              description=""
              content={
                <>
                  <p>{t('delete_modal.delete_appointment_warning_details')}</p>
                  <p>{t('delete_modal.delete_permanent_warning')}</p>
                </>
              }
              yesBtnTitle={t('content.delete')}
              noBtnTitle={t('content.close')}
              onYesClick={handleDelete}
              onNoClick={() => setShowDeleteAppointmentModal(false)}
              isVisible={showDeleteAppointmentModal}
              mode="danger"
            />,
            document.body,
          )}
      </div>
    </CustomModal>
  )
}

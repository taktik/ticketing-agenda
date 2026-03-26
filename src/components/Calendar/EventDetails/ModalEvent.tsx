import { Agenda, CalendarItemType, DecryptedCalendarItem, EncryptedPatient, TelecomType } from '@icure/cardinal-sdk'
import { Button, Card, Descriptions, Divider, Form, Input, Spin, Typography } from 'antd'
import { format, parse } from 'date-fns'
import { enUS } from 'date-fns/locale'
import dayjs from 'dayjs'
import { EventApi } from 'fullcalendar'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLazyGetAvailabilitiesQuery } from '../../../core/api/anonymousApi'
import { NOTE_LANG_KEY, useCreateOrUpdateContactNoteMutation, useGetContactByCalendarItemIdQuery } from '../../../core/api/contactApi'
import { useCalendarItemDetails } from '../../../core/hooks/useCalendarItemDetails'
import { useNotificationHelper } from '../../../core/hooks/useNotificationHelper'
import { useHierarchyContext } from '../../../core/contexts/HierarchyContext'
import { CustomModal } from '../../common/CustomModal'
import { dayjsToYYYYMMDDHHmmss, formatEventDate, getCodeTagById, localeMap } from '../../common/helpers'
import { CalendarItemTag } from '../../../core/api/fetchType'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { TimeSlotPickerUI } from '../TimeSlotPickerUI/TimeSlotPickerUI'
import './index.css'

const { TextArea } = Input
const { Text } = Typography

export interface CalendarEventUpdateForm {
  note: string
}

interface EventExtendedProps {
  calendarItemTypeId?: string
  agendaId?: string
  isTimeOff?: boolean
  rev?: string
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
  deleteTimeOff: (eventId: string) => Promise<void>
  updateEvent: (
    event: EventApi | undefined,
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

export const EventDetails = ({ isCalendarItemLoading, isVisible, onClose, event, deleteEvent, deleteTimeOff, updateEvent }: EventDetailsProps) => {
  const { t, i18n } = useTranslation()
  const [form] = Form.useForm<CalendarEventUpdateForm>()
  const { siteRoot, adminRoot } = useHierarchyContext()

  const [showDeleteAppointmentModal, setShowDeleteAppointmentModal] = useState<boolean>(false)
  const [editMode, setEditMode] = useState<'none' | 'details' | 'reschedule'>('none')

  const [availabilities, setAvailabilities] = useState<dayjs.Dayjs[]>([])
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<dayjs.Dayjs | undefined>(undefined)

  const [isProcessing, setIsProcessing] = useState(false)

  const extendedProps = event?.extendedProps as EventExtendedProps | undefined
  const isTimeOff = !!extendedProps?.isTimeOff

  const { calendarItem, patient, agenda, calendarItemType } = useCalendarItemDetails(event?.id)

  const { data: existingContact, isLoading: isContactLoading } = useGetContactByCalendarItemIdQuery(event?.id ?? '', { skip: !event?.id || isTimeOff })
  const [createOrUpdateContactNote] = useCreateOrUpdateContactNoteMutation()

  const isDetailsLoading = isTimeOff ? !calendarItem : !calendarItem || !patient || !agenda || !calendarItemType || isContactLoading

  const noteText = useMemo(() => existingContact?.services[0]?.notes[0]?.markdown?.[NOTE_LANG_KEY] ?? '', [existingContact])

  const isPastAppointment = useMemo(() => {
    if (!calendarItem?.startTime) return false
    return calendarItem.startTime < dayjsToYYYYMMDDHHmmss(dayjs())
  }, [calendarItem])

  const [getAvailabilities, { isLoading: availabilitiesLoading }] = useLazyGetAvailabilitiesQuery()

  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n.language])

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
      patientPhoneNumber: allTelecoms?.find((t) => t.telecomType === TelecomType.Mobile)?.telecomNumber ?? '',
    }
  }, [patient])

  const { openNotification, notificationContextHolder } = useNotificationHelper()

  const qBetterConfirmationCode = useMemo(() => getCodeTagById(calendarItem?.tags, CalendarItemTag.APPOINTMENT_QBETTER_CODE), [calendarItem])

  // Reset modal state when the event changes or the modal opens
  useEffect(() => {
    if (event && isVisible) {
      setEditMode('none')
      setIsProcessing(false)
      setSelectedDate(undefined)
      setSelectedTime(undefined)
      form.setFieldsValue({ note: '' })
    }
  }, [event, isVisible, form])

  // Once the Contact has loaded (or changed), populate the form field — but only when not actively editing
  useEffect(() => {
    if (editMode === 'none') {
      form.setFieldsValue({ note: noteText })
    }
  }, [noteText, editMode, form])

  useEffect(() => {
    if (editMode !== 'reschedule' || !agenda?.id || !calendarItemType?.id) return

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
  }, [editMode, agenda, calendarItemType, currentMonth, getAvailabilities, openNotification, t, selectedDate])

  const handleDateSelect = useCallback((date: dayjs.Dayjs) => {
    setSelectedDate(date)
    setSelectedTime(undefined)
  }, [])

  const handleTimeSelect = useCallback((time: dayjs.Dayjs | undefined) => {
    setSelectedTime(time)
  }, [])

  const handleUpdate = useCallback(async () => {
    try {
      const { note } = await form.validateFields()

      if (!calendarItem || !patient || !agenda || !calendarItemType || !patientEmail) {
        throw new Error('Missing data for email payload')
      }

      setIsProcessing(true)

      if (siteRoot?.id && adminRoot?.id) {
        await createOrUpdateContactNote({
          calendarItemId: calendarItem.id,
          note,
          delegates: { siteRootId: siteRoot.id, adminRootId: adminRoot.id },
          existingContact,
          patient,
        }).unwrap()
      }

      if (editMode === 'reschedule') {
        await updateEvent(event, selectedDate, selectedTime, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber)
      }
      onClose()
    } catch {
      openNotification('error', t('validation.unexpected_error'), '')
    } finally {
      setIsProcessing(false)
    }
  }, [form, event, editMode, updateEvent, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber, selectedDate, selectedTime, onClose, openNotification, t, siteRoot, adminRoot, existingContact, createOrUpdateContactNote])

  const handleDelete = useCallback(async () => {
    setShowDeleteAppointmentModal(false)
    try {
      setIsProcessing(true)
      if (isTimeOff) {
        if (!event?.id) throw new Error('Missing time-off data')
        await deleteTimeOff(event.id)
      } else {
        if (!calendarItem || !patient || !agenda || !calendarItemType || !patientEmail) {
          throw new Error('Missing data for email payload')
        }
        await deleteEvent(event, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber)
      }
      onClose()
    } catch {
      openNotification('error', t('validation.unexpected_error'), '')
    } finally {
      setIsProcessing(false)
    }
  }, [isTimeOff, event, deleteEvent, deleteTimeOff, calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber, onClose, openNotification, t])

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
            <Text style={{ whiteSpace: 'pre-wrap' }}>{noteText}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('content.confirmationCode')}>{qBetterConfirmationCode || t('content.no_code_provided')}</Descriptions.Item>
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
    <CustomModal
      isVisible={isVisible}
      handleClose={onClose}
      title={editMode !== 'none' ? t('content.edit_appointment') : t('content.appointment_information')}
      blockAntModalBodyVerticalScroll
      noFooter
      width={editMode === 'reschedule' ? 1100 : 700}
    >
      <div className="modal-event">
        {notificationContextHolder}
        <Spin spinning={isProcessing} tip={t('content.processing')} size="large">
          <Form form={form} onFinish={handleUpdate} layout="vertical" style={{ width: '100%', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            {editMode === 'reschedule' ? (
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
                <Form.Item name="note" label={t('content.details')}>
                  <TextArea rows={4} />
                </Form.Item>
              </>
            ) : editMode === 'details' ? (
              <div style={{ padding: '1rem' }}>
                <Form.Item name="note" label={t('content.details')}>
                  <TextArea rows={4} autoFocus />
                </Form.Item>
              </div>
            ) : (
              renderDisplayMode()
            )}

            <Divider />

            <div style={{ display: 'flex', justifyContent: editMode === 'none' ? 'space-between' : 'flex-end', gap: '8px' }}>
              {editMode !== 'none' ? (
                <>
                  <Button key="cancel" onClick={() => setEditMode('none')}>
                    {t('content.cancel')}
                  </Button>
                  <Button type="primary" htmlType="submit" key="save" disabled={isDetailsLoading || (editMode === 'reschedule' && (!selectedDate || !selectedTime))}>
                    {t('content.save')}
                  </Button>
                </>
              ) : isPastAppointment && !isTimeOff ? (
                <Button key="close" onClick={onClose}>
                  {t('content.close')}
                </Button>
              ) : (
                <>
                  <Button key="delete" danger onClick={() => setShowDeleteAppointmentModal(true)} disabled={isDetailsLoading}>
                    {t('content.delete')}
                  </Button>
                  {!isTimeOff && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button key="edit-details" onClick={() => setEditMode('details')} disabled={isDetailsLoading}>
                        {t('content.edit_details')}
                      </Button>
                      <Button key="reschedule" type="primary" onClick={() => setEditMode('reschedule')} disabled={isDetailsLoading}>
                        {t('content.reschedule')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Form>
        </Spin>

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

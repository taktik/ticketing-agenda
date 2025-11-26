import { CalendarOutlined, LeftOutlined, RightOutlined, UnorderedListOutlined } from '@ant-design/icons'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Agenda, CalendarItem, CalendarItemType, DecryptedCalendarItem, EncryptedPatient, HealthcareParty, RecoveryDataKey } from '@icure/cardinal-sdk'
import { Button, message, notification, Segmented, Space, Typography } from 'antd'
import { endOfWeek, startOfWeek } from 'date-fns'
import dayjs from 'dayjs'
import { EventApi, EventClickArg, EventContentArg, EventInput } from 'fullcalendar'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { EMAIL_APPOINTMENT_CANCELLATION_FR, EMAIL_APPOINTMENT_CANCELLATION_NL, EMAIL_APPOINTMENT_MODIFICATION, EMAIL_SENDER, MANAGE_APPOINTMENT_ROUTE, NEW_APPOINTMENT_ROUTE } from '../../constants'
import { useDeleteCalendarItemByIdMutation, useGetCalendarItemByAgendaIdAndPeriodQuery, useUpdateCalendarItemMutation } from '../../core/api/calendarItemApi'
import { useSendEmailMutation } from '../../core/api/emailApi'
import { SendEmailRequest } from '../../core/api/fetchType'
import { useInitializeExchangeDataMutation } from '../../core/api/patientApi'
import { useCreateExchangeDataRecoveryMutation } from '../../core/api/recoveryApi'
import { useCalendarItemDetails } from '../../core/hooks/useCalendarItemDetails'
import { usePermissions } from '../../core/hooks/usePermissions'
import { Lang } from '../../helpers/types'
import { calculateNumericEventTimes, fuzzyDateTimeIntToDayjs, getTranslationForEntity, isAllDayEvent, parseTimeRange } from '../common/helpers'
import { AppointmentSelector } from './AppointmentSelector/AppointmentSelector'
import { combineDateAndTime, CreateEvent } from './CreateEvent/CreateEvent'
import { CreateTimeOff } from './CreateTimeOff/CreateTimeOff'
import { GridEventContent } from './EventContent/GridEventContent'
import { ListEventContent } from './EventContent/ListEventContent'
import { EventDetails } from './EventDetails/ModalEvent'
import './index.css'

interface CalendarProps {
  handleFullCalendarDateChange: () => void
  calendarRef: React.MutableRefObject<FullCalendar | null>
  calendarDate: Date
  selectedAgenda: Agenda | undefined
  selectedProcedure: CalendarItemType | undefined
  procedures: CalendarItemType[] | undefined
  sites: HealthcareParty[] | undefined
}

type calendarRangeType = {
  from: Date
  to: Date
}

export const Calendar = ({ handleFullCalendarDateChange, calendarRef, selectedAgenda, selectedProcedure, calendarDate, procedures, sites }: CalendarProps): ReactElement => {
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [createApptModalOpen, setCreateApptModalOpen] = useState(false)
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false)
  const [apptSelectorModalOpen, setApptSelectorModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventApi | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [timeRange, setTimeRange] = useState<'week' | 'day'>('week')
  const [calendarTitle, setCalendarTitle] = useState<string>('')
  const { t, i18n } = useTranslation()
  const [calendarRange, setCalendarRange] = useState<calendarRangeType>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  })

  const { dataOwnerId, isAdminLevel } = usePermissions()
  const { data: calendarItems } = useGetCalendarItemByAgendaIdAndPeriodQuery(
    {
      agendaId: selectedAgenda?.id ?? '',
      from: calendarRange.from.getTime(),
      to: calendarRange.to.getTime(),
    },
    { skip: !selectedAgenda },
  )

  const [deleteCalendarItem] = useDeleteCalendarItemByIdMutation()
  const [updateCalendarItem] = useUpdateCalendarItemMutation()
  const [sendEmail] = useSendEmailMutation()
  const [initializePatientExchangeDatas] = useInitializeExchangeDataMutation()
  const [createRecoveryDataKey] = useCreateExchangeDataRecoveryMutation()

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    setTimeout(messageApi.destroy, 2500)
  }

  const events: EventInput[] = useMemo(() => {
    if (!calendarItems) return []
    return calendarItems
      .map((calendarItem) => {
        const isTimeOff = calendarItem.tags.some((tag) => tag.type === 'TIMEOFF')

        if (isTimeOff && !isAdminLevel) {
          return null
        }

        if (calendarItem.startTime === undefined || calendarItem.endTime === undefined) {
          console.warn('Skipping calendar item with missing start time or duration', calendarItem)
          return null
        }

        const linkedProcedure = procedures?.find((procedure) => procedure.id === calendarItem.calendarItemTypeId)
        const eventTimes = parseTimeRange(calendarItem.startTime, calendarItem.endTime)
        const isAllDay = isAllDayEvent(eventTimes?.start, eventTimes?.end)

        return {
          id: calendarItem.id,
          title: calendarItem.title,
          start: eventTimes?.start,
          end: eventTimes?.end,
          color: isTimeOff ? 'orange' : linkedProcedure?.color,
          details: calendarItem.details,
          allDay: isAllDay,
          extendedProps: {
            calendarItemTypeId: calendarItem.calendarItemTypeId,
            agendaId: calendarItem.agendaId,
            patientId: calendarItem.patientId,
            isTimeOff: isTimeOff,
            rev: calendarItem.rev,
          },
        }
      })
      .filter(Boolean) as EventInput[]
  }, [calendarItems, procedures])

  const filteredEvents: EventInput[] = useMemo(() => {
    if (!events || !selectedAgenda) return []
    if (selectedProcedure) {
      return events.filter((event) => event.extendedProps?.calendarItemTypeId === selectedProcedure.id)
    }
    return events
  }, [events, selectedAgenda, selectedProcedure])

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      let targetView = ''
      if (viewMode === 'calendar') {
        targetView = timeRange === 'week' ? 'timeGridWeek' : 'timeGridDay'
      } else {
        targetView = timeRange === 'week' ? 'listWeek' : 'listDay'
      }

      if (calendarApi.view.type !== targetView) {
        queueMicrotask(() => {
          // Using queueMicrotask is a Fullcalendar fix. Atm in fullcalendar v6 and using react v18, we have 'flushSync inside useffect' console errors and may have rendering issues (Noticed none but better be safe).
          // Fix is supposed to come in fullcalendar v7. https://github.com/fullcalendar/fullcalendar/issues/7448
          calendarApi.changeView(targetView)
        })
      }
    }
  }, [viewMode, timeRange])

  useEffect(() => {
    setCalendarRange({ from: startOfWeek(calendarDate), to: endOfWeek(calendarDate) })
  }, [calendarDate, timeRange])

  const handlePrev = useCallback(() => calendarRef.current?.getApi().prev(), [])
  const handleNext = useCallback(() => calendarRef.current?.getApi().next(), [])
  const handleToday = useCallback(() => calendarRef.current?.getApi().today(), [])

  const handleDatesSet = useCallback(
    (dateInfo: { view: { title: string } }) => {
      setCalendarTitle(dateInfo.view.title)
      handleFullCalendarDateChange()
    },
    [setCalendarTitle, handleFullCalendarDateChange],
  )

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      setSelectedEvent(clickInfo.event)
      setEventModalOpen(true)
    },
    [setSelectedEvent, setEventModalOpen],
  )

  const handleCreate = useCallback(() => {
    if (isAdminLevel) {
      setApptSelectorModalOpen(true)
    } else {
      setCreateApptModalOpen(true)
    }
  }, [setApptSelectorModalOpen, setCreateApptModalOpen, isAdminLevel])

  const getEventContent = useCallback((arg: EventContentArg) => {
    const { view, event } = arg

    if (view.type.startsWith('list')) {
      return <ListEventContent event={event} view={view.type} />
    } else if (view.type.startsWith('timeGrid')) {
      return <GridEventContent event={event} view={view.type} />
    }
    return <p>{event.title}</p>
  }, [])

  const noEventsContent = useMemo(() => {
    if (timeRange === 'day') {
      return t('content.no_events_today')
    } else if (timeRange === 'week') {
      return t('content.no_events_this_week')
    }
    return null
  }, [timeRange, t])

  const computeDeleteEmailPayload = useCallback(
    async (calendarItem: CalendarItem, patient: EncryptedPatient, agenda: Agenda, calendarItemType: CalendarItemType, patientEmail: string, patientPhoneNumber: string) => {
      const lang = patient.languages[0] === 'Néerlandais' ? 'nl' : 'fr'

      const startDayjs = fuzzyDateTimeIntToDayjs(calendarItem.startTime)
      const endDayjs = fuzzyDateTimeIntToDayjs(calendarItem.endTime)

      const dateFormat = startDayjs.format('DD/MM/YYYY')
      const heureFormat = `${startDayjs.format('HH[h]mm')} - ${endDayjs.format('HH[h]mm')}`

      return {
        receiver: patientEmail!,
        from: EMAIL_SENDER,
        processId: lang === 'nl' ? EMAIL_APPOINTMENT_CANCELLATION_NL : EMAIL_APPOINTMENT_CANCELLATION_FR,
        variables: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patientEmail,
          mobilePhone: patientPhoneNumber,
          service: getTranslationForEntity(agenda.properties, 'SERVICE', lang) || '',
          procedure: getTranslationForEntity(calendarItemType.publicProperties, 'CALENDARITEMTYPE', lang) || '',
          date: dateFormat,
          time: heureFormat,
          location: calendarItem.addressText,
          url: NEW_APPOINTMENT_ROUTE,
        },
      }
    },
    [useCalendarItemDetails],
  )

  const computeUrl = useCallback((recoveryDataKey: RecoveryDataKey, delegateId: string, calendarItemId: string) => {
    const path = MANAGE_APPOINTMENT_ROUTE
    const params = new URLSearchParams()
    const recoveryPayload = {
      delegateId: delegateId,
      recoveryKey: recoveryDataKey.asHexString(),
    }
    params.append('recoveryData', JSON.stringify(recoveryPayload))
    params.append('calendarItemId', calendarItemId)
    return `${path}?${params.toString()}`
  }, [])

  const computeUpdateEmailPayload = useCallback(
    async (
      calendarItem: DecryptedCalendarItem,
      patient: EncryptedPatient,
      agenda: Agenda,
      calendarItemType: CalendarItemType,
      patientEmail: string,
      patientPhoneNumber: string,
      recoveryDataKey: RecoveryDataKey,
      currentHcpId: string,
      calendarItemId: string,
    ) => {
      const lang = patient.languages[0] === 'Néerlandais' ? 'nl' : 'fr'

      const startDayjs = fuzzyDateTimeIntToDayjs(calendarItem.startTime)
      const endDayjs = fuzzyDateTimeIntToDayjs(calendarItem.endTime)

      const dateFormat = startDayjs.format('DD/MM/YYYY')
      const heureFormat = `${startDayjs.format('HH[h]mm')} - ${endDayjs.format('HH[h]mm')}`
      const url = computeUrl(recoveryDataKey, currentHcpId, calendarItemId)

      const hasProcedure = !!calendarItem.details?.trim()
      const safeLang: Lang = lang === 'nl' ? 'nl' : 'fr'
      const processId = EMAIL_APPOINTMENT_MODIFICATION[safeLang][hasProcedure ? 'withProcedureDetails' : 'withoutProcedureDetails']

      return {
        receiver: patientEmail!,
        from: EMAIL_SENDER,
        processId: processId,
        variables: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patientEmail,
          mobilePhone: patientPhoneNumber,
          service: getTranslationForEntity(agenda.properties, 'SERVICE', lang) || '',
          procedure: getTranslationForEntity(calendarItemType.publicProperties, 'CALENDARITEMTYPE', lang) || '',
          date: dateFormat,
          time: heureFormat,
          location: calendarItem.addressText,
          url: url,
          procedureDetails: calendarItem.details,
        },
      }
    },
    [useCalendarItemDetails],
  )

  const handleSendEmail = useCallback(
    async (emailPayload: SendEmailRequest) => {
      try {
        await sendEmail(emailPayload)
      } catch (error) {
        //ignore
      }
    },
    [sendEmail],
  )

  const deleteEvent = useCallback(
    async (event: EventApi | undefined, calendarItem: CalendarItem, patient: EncryptedPatient, agenda: Agenda, calendarItemType: CalendarItemType, patientEmail: string, patientPhoneNumber: string) => {
      try {
        if (!event || !event.extendedProps.rev) throw new Error('No event to delete')
        await deleteCalendarItem({ calendarItemId: event.id, rev: event.extendedProps.rev }).unwrap()
        const emailPayload = await computeDeleteEmailPayload(calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber)
        await handleSendEmail(emailPayload)
        showMessageFeedback('success', t('notification.appointment_deleted'))
      } catch (error) {
        openNotification('error', t('notification.appointment_delete_failed'), t('notification.appointment_delete_error'))
      }
    },
    [deleteCalendarItem, t],
  )

  const updateEvent = useCallback(
    async (
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
    ) => {
      try {
        if (!event || !event.extendedProps.rev) throw new Error('No event to delete')
        if (!dataOwnerId) throw new Error('No valid delegateId')
        await initializePatientExchangeDatas(patient.id).unwrap()
        let updatedCalendarItem = new DecryptedCalendarItem({
          ...calendarItem,
          details,
        })
        if (selectedDate && selectedTime && calendarItem?.duration) {
          const currentStartTime = combineDateAndTime({ date: selectedDate, time: selectedTime })
          const numericTimes = calculateNumericEventTimes(currentStartTime, calendarItem.duration)

          updatedCalendarItem = new DecryptedCalendarItem({
            ...calendarItem,
            details: details,
            startTime: numericTimes?.startTime,
            endTime: numericTimes?.endTime,
          })
        }

        await updateCalendarItem({ calendarItem: updatedCalendarItem }).unwrap()
        const recoveryDataKey = await createRecoveryDataKey(patient.id).unwrap()
        if (!recoveryDataKey) {
          throw new Error('no valid exchange data.')
        }
        const emailPayload = await computeUpdateEmailPayload(calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber, recoveryDataKey, dataOwnerId, updatedCalendarItem.id)
        await handleSendEmail(emailPayload)
        showMessageFeedback('success', t('notification.appointment_updated'))
      } catch (error) {
        openNotification('error', t('notification.appointment_update_failed'), t('notification.appointment_update_error'))
      }
    },
    [updateCalendarItem, t, calendarItems, dataOwnerId],
  )

  return (
    <div className="calendar-root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="calendar-header">
        <Space>
          <Space.Compact>
            <Button onClick={handlePrev} icon={<LeftOutlined />} />
            <Button onClick={handleNext} icon={<RightOutlined />} />
          </Space.Compact>
          <Button onClick={handleToday}>{t('content.today')}</Button>
          <Button onClick={handleCreate}>{t('content.create_appointment')}</Button>
        </Space>

        <Typography.Title level={4} ellipsis={{ rows: 2 }} className="calendar-title">
          {calendarTitle}
        </Typography.Title>

        <Space>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as 'calendar' | 'list')}
            options={[
              { value: 'calendar', icon: <CalendarOutlined /> },
              { value: 'list', icon: <UnorderedListOutlined /> },
            ]}
          />

          <Segmented
            value={timeRange}
            onChange={(value) => setTimeRange(value as 'week' | 'day')}
            options={[
              { label: t('content.day', 'Day'), value: 'day' },
              { label: t('content.week', 'Week'), value: 'week' },
            ]}
          />
        </Space>
      </div>
      <div className="fullcalendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          locale={i18n.language}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          firstDay={1}
          headerToolbar={false}
          initialView="timeGridWeek"
          editable={true}
          selectable={false}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={false}
          height="100%"
          datesSet={handleDatesSet}
          events={filteredEvents}
          eventClick={handleEventClick}
          eventContent={getEventContent}
          noEventsContent={noEventsContent}
          allDaySlot={isAdminLevel}
          allDayText={t('content.all_day')}
        />
      </div>
      {eventModalOpen && createPortal(<EventDetails isVisible={eventModalOpen} onClose={() => setEventModalOpen(false)} event={selectedEvent} deleteEvent={deleteEvent} updateEvent={updateEvent} />, document.body)}
      {createApptModalOpen && createPortal(<CreateEvent isVisible={createApptModalOpen} onClose={() => setCreateApptModalOpen(false)} />, document.body)}
      {apptSelectorModalOpen &&
        createPortal(
          <AppointmentSelector isVisible={apptSelectorModalOpen} onClose={() => setApptSelectorModalOpen(false)} setCreateApptModalOpen={setCreateApptModalOpen} setTimeOffModalOpen={setTimeOffModalOpen} />,
          document.body,
        )}
      {timeOffModalOpen &&
        createPortal(<CreateTimeOff isVisible={timeOffModalOpen} onClose={() => setTimeOffModalOpen(false)} sites={sites} showMessageFeedback={showMessageFeedback} openNotification={openNotification} />, document.body)}
    </div>
  )
}

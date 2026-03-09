import { CalendarOutlined, LeftOutlined, RightOutlined, UnorderedListOutlined } from '@ant-design/icons'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Agenda, CalendarItem, CalendarItemType, CodeStub, DecryptedCalendarItem, EncryptedPatient } from '@icure/cardinal-sdk'
import { Button, message, Segmented, Space, Typography } from 'antd'
import { endOfWeek, startOfWeek } from 'date-fns'
import dayjs from 'dayjs'
import { EventApi, EventClickArg, EventContentArg, EventInput } from 'fullcalendar'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { EMAIL_APPOINTMENT_CANCELLATION_FR, EMAIL_APPOINTMENT_CANCELLATION_NL, EMAIL_APPOINTMENT_MODIFICATION, EMAIL_SENDER, MANAGE_APPOINTMENT_ROUTE, NEW_APPOINTMENT_ROUTE } from '../../constants'
import { useDeleteCalendarItemByIdMutation, useGetCalendarItemByAgendaIdAndPeriodQuery, useUpdateCalendarItemMutation } from '../../core/api/calendarItemApi'
import { useSendEmailMutation } from '../../core/api/emailApi'
import { useInitializeExchangeDataMutation } from '../../core/api/patientApi'
import { useCreateExchangeDataRecoveryMutation } from '../../core/api/recoveryApi'
import { useGetCurrentUserQuery } from '../../core/api/userApi'
import { useHierarchyContext } from '../../core/contexts/HierarchyContext'
import { useNotificationHelper } from '../../core/hooks/useNotificationHelper'
import { usePermissionContext } from '../../core/contexts/PermissionContext'
import { calculateNumericEventTimes, combineDateAndTime, detectLanguage, fuzzyDateTimeIntToDayjs, getCodeTagById, getTranslationForEntity, isAllDayEvent, parseTimeRange } from '../common/helpers'
import { CalendarItemTag, EntityType } from '../../core/api/fetchType'
import { AppointmentSelector } from './AppointmentSelector/AppointmentSelector'
import { CreateCitizenAppointment } from './CreateCitizenAppointment/CreateCitizenAppointment'
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
}

type CalendarRangeType = {
  from: Date
  to: Date
}

export const Calendar = ({ handleFullCalendarDateChange, calendarRef, selectedAgenda, selectedProcedure, calendarDate }: CalendarProps): ReactElement => {
  const { t, i18n } = useTranslation()

  const { allCalendarItemTypes, allSites } = useHierarchyContext()
  const { dataOwnerId, isAdminLevel } = usePermissionContext()

  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [createApptModalOpen, setCreateApptModalOpen] = useState(false)
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false)
  const [apptSelectorModalOpen, setApptSelectorModalOpen] = useState(false)

  const [selectedEvent, setSelectedEvent] = useState<EventApi | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [timeRange, setTimeRange] = useState<'week' | 'day'>('week')
  const [calendarTitle, setCalendarTitle] = useState<string>('')

  const [calendarRange, setCalendarRange] = useState<CalendarRangeType>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  })

  const { data: currentUser } = useGetCurrentUserQuery(undefined)

  const { data: calendarItems } = useGetCalendarItemByAgendaIdAndPeriodQuery(
    {
      agendaId: selectedAgenda?.id ?? '',
      from: calendarRange.from.getTime(),
      to: calendarRange.to.getTime(),
    },
    { skip: !selectedAgenda },
  )

  const [deleteCalendarItem, { isLoading: isDeleteLoading }] = useDeleteCalendarItemByIdMutation()
  const [updateCalendarItem, { isLoading: isUpdateLoading }] = useUpdateCalendarItemMutation()
  const [sendEmail] = useSendEmailMutation()
  const [initializePatientExchangeDatas] = useInitializeExchangeDataMutation()
  const [createRecoveryDataKey] = useCreateExchangeDataRecoveryMutation()

  const isCalendarItemLoading = isDeleteLoading || isUpdateLoading

  const { openNotification, notificationContextHolder } = useNotificationHelper()
  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = useCallback(
    (type: 'loading' | 'success' | 'error', content: string) => {
      messageApi.open({ type, content, duration: 0 })
      setTimeout(messageApi.destroy, 2500)
    },
    [messageApi],
  )

  const procedureMap = useMemo(() => new Map(allCalendarItemTypes.map((p) => [p.id, p])), [allCalendarItemTypes])

  const events: EventInput[] = useMemo(() => {
    if (!calendarItems) return []

    return calendarItems
      .map((calendarItem) => {
        const isTimeOff = calendarItem.tags.some((tag) => tag.type === CalendarItemTag.TIMEOFF)

        if (isTimeOff && !isAdminLevel) return null

        if (calendarItem.startTime === undefined || calendarItem.endTime === undefined) {
          return null
        }

        const linkedProcedure = calendarItem.calendarItemTypeId ? procedureMap.get(calendarItem.calendarItemTypeId) : undefined
        const eventTimes = parseTimeRange(calendarItem.startTime, calendarItem.endTime)
        const isAllDay = isAllDayEvent(eventTimes?.start, eventTimes?.end)

        const qBetterConfirmationCode = getCodeTagById(calendarItem?.tags, CalendarItemTag.APPOINTMENT_QBETTER_CODE)

        return {
          id: calendarItem.id,
          title: calendarItem.title,
          start: eventTimes?.start,
          end: eventTimes?.end,
          color: isTimeOff ? 'orange' : linkedProcedure?.color,
          allDay: isAllDay,
          extendedProps: {
            details: calendarItem.details,
            calendarItemTypeId: calendarItem.calendarItemTypeId,
            agendaId: calendarItem.agendaId,
            patientId: calendarItem.patientId,
            isTimeOff: isTimeOff,
            rev: calendarItem.rev,
            qBetterConfirmationCode: qBetterConfirmationCode,
          },
        }
      })
      .filter((e) => e !== null) as EventInput[]
  }, [calendarItems, isAdminLevel, procedureMap])

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
      const targetView = viewMode === 'calendar' ? (timeRange === 'week' ? 'timeGridWeek' : 'timeGridDay') : timeRange === 'week' ? 'listWeek' : 'listDay'

      if (calendarApi.view.type !== targetView) {
        queueMicrotask(() => calendarApi.changeView(targetView))
      }
    }
  }, [viewMode, timeRange, calendarRef])

  useEffect(() => {
    setCalendarRange({ from: startOfWeek(calendarDate), to: endOfWeek(calendarDate) })
  }, [calendarDate])

  const handlePrev = useCallback(() => calendarRef.current?.getApi().prev(), [calendarRef])
  const handleNext = useCallback(() => calendarRef.current?.getApi().next(), [calendarRef])
  const handleToday = useCallback(() => calendarRef.current?.getApi().today(), [calendarRef])

  const handleDatesSet = useCallback(
    (dateInfo: { view: { title: string } }) => {
      setCalendarTitle(dateInfo.view.title)
      handleFullCalendarDateChange()
    },
    [handleFullCalendarDateChange],
  )

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo.event)
    setEventModalOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    if (isAdminLevel) {
      setApptSelectorModalOpen(true)
    } else {
      setCreateApptModalOpen(true)
    }
  }, [isAdminLevel])

  const getEventContent = useCallback((arg: EventContentArg) => {
    const { view, event } = arg
    if (view.type.startsWith('list')) return <ListEventContent event={event} view={view.type} />
    if (view.type.startsWith('timeGrid')) return <GridEventContent event={event} view={view.type} />
    return <p>{event.title}</p>
  }, [])

  const noEventsContent = useMemo(() => {
    return timeRange === 'day' ? t('content.no_events_today') : t('content.no_events_this_week')
  }, [timeRange, t])

  const computeDeleteEmailPayload = useCallback(async (calendarItem: CalendarItem, patient: EncryptedPatient, agenda: Agenda, calendarItemType: CalendarItemType, patientEmail: string, patientPhoneNumber: string) => {
    const lang = detectLanguage(patient.languages)
    const startDayjs = fuzzyDateTimeIntToDayjs(calendarItem.startTime)
    const endDayjs = fuzzyDateTimeIntToDayjs(calendarItem.endTime)

    return {
      receiver: patientEmail,
      from: EMAIL_SENDER,
      processId: lang === 'nl' ? EMAIL_APPOINTMENT_CANCELLATION_NL : EMAIL_APPOINTMENT_CANCELLATION_FR,
      cc: [],
      bcc: [],
      variables: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patientEmail,
        mobilePhone: patientPhoneNumber,
        service: getTranslationForEntity(agenda.properties, EntityType.SERVICE, lang) || '',
        procedure: getTranslationForEntity(calendarItemType.publicProperties, EntityType.CALENDARITEMTYPE, lang) || '',
        date: startDayjs.format('DD/MM/YYYY'),
        time: `${startDayjs.format('HH[h]mm')} - ${endDayjs.format('HH[h]mm')}`,
        location: calendarItem.addressText,
        url: NEW_APPOINTMENT_ROUTE,
      },
    }
  }, [])

  const deleteEvent = useCallback(
    async (event: EventApi | undefined, calendarItem: CalendarItem, patient: EncryptedPatient, agenda: Agenda, calendarItemType: CalendarItemType, patientEmail: string, patientPhoneNumber: string) => {
      try {
        if (!event || !event.extendedProps.rev) throw new Error('No event to delete')

        await deleteCalendarItem({ calendarItemId: event.id, rev: event.extendedProps.rev }).unwrap()

        const emailPayload = await computeDeleteEmailPayload(calendarItem, patient, agenda, calendarItemType, patientEmail, patientPhoneNumber)
        await sendEmail(emailPayload)

        showMessageFeedback('success', t('notification.appointment_deleted'))
      } catch (error) {
        openNotification('error', t('notification.appointment_delete_failed'), t('notification.appointment_delete_error'))
      }
    },
    [deleteCalendarItem, computeDeleteEmailPayload, sendEmail, t, openNotification, showMessageFeedback],
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
        if (!event || !event.extendedProps.rev) throw new Error('No event to update')
        if (!dataOwnerId) throw new Error('No valid delegateId')

        await initializePatientExchangeDatas(patient.id).unwrap()

        let updatedCalendarItem = new DecryptedCalendarItem({ ...calendarItem, details })

        if (selectedDate && selectedTime && calendarItem?.duration) {
          const currentStartTime = combineDateAndTime({ date: selectedDate, time: selectedTime })
          const numericTimes = calculateNumericEventTimes(currentStartTime, calendarItem.duration)

          const tags = calendarItem.tags.map((tag) => (tag.type === CalendarItemTag.APPOINTMENT_LAST_AUTHOR ? new CodeStub({ ...tag, code: currentUser?.id, version: '1' }) : tag))

          updatedCalendarItem = new DecryptedCalendarItem({
            ...calendarItem,
            modified: new Date().getTime(),
            details: details,
            startTime: numericTimes?.startTime,
            endTime: numericTimes?.endTime,
            tags,
          })
        }

        await updateCalendarItem({ calendarItem: updatedCalendarItem }).unwrap()

        const recoveryDataKey = await createRecoveryDataKey(patient.id).unwrap()
        if (!recoveryDataKey) throw new Error('no valid exchange data.')

        const lang = detectLanguage(patient.languages)
        const startDayjs = fuzzyDateTimeIntToDayjs(updatedCalendarItem.startTime)
        const endDayjs = fuzzyDateTimeIntToDayjs(updatedCalendarItem.endTime)

        const params = new URLSearchParams()
        params.append('recoveryData', JSON.stringify({ delegateId: dataOwnerId, recoveryKey: recoveryDataKey.asHexString() }))
        params.append('calendarItemId', updatedCalendarItem.id)
        const url = `${MANAGE_APPOINTMENT_ROUTE}?${params.toString()}`

        const processId = EMAIL_APPOINTMENT_MODIFICATION[lang][updatedCalendarItem.details?.trim() ? 'withProcedureDetails' : 'withoutProcedureDetails']

        await sendEmail({
          receiver: patientEmail,
          from: EMAIL_SENDER,
          processId,
          cc: [],
          bcc: [],
          variables: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patientEmail,
            mobilePhone: patientPhoneNumber,
            service: getTranslationForEntity(agenda.properties, EntityType.SERVICE, lang) || '',
            procedure: getTranslationForEntity(calendarItemType.publicProperties, EntityType.CALENDARITEMTYPE, lang) || '',
            date: startDayjs.format('DD/MM/YYYY'),
            time: `${startDayjs.format('HH[h]mm')} - ${endDayjs.format('HH[h]mm')}`,
            location: calendarItem.addressText,
            url,
            procedureDetails: updatedCalendarItem.details,
          },
        })

        showMessageFeedback('success', t('notification.appointment_updated'))
      } catch (error) {
        openNotification('error', t('notification.appointment_update_failed'), t('notification.appointment_update_error'))
      }
    },
    [updateCalendarItem, initializePatientExchangeDatas, createRecoveryDataKey, sendEmail, dataOwnerId, currentUser, t, openNotification, showMessageFeedback],
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

      {eventModalOpen &&
        createPortal(
          <EventDetails isVisible={eventModalOpen} onClose={() => setEventModalOpen(false)} event={selectedEvent} deleteEvent={deleteEvent} updateEvent={updateEvent} isCalendarItemLoading={isCalendarItemLoading} />,
          document.body,
        )}

      {createApptModalOpen && createPortal(<CreateCitizenAppointment isVisible={createApptModalOpen} onClose={() => setCreateApptModalOpen(false)} />, document.body)}

      {apptSelectorModalOpen &&
        createPortal(
          <AppointmentSelector isVisible={apptSelectorModalOpen} onClose={() => setApptSelectorModalOpen(false)} setCreateApptModalOpen={setCreateApptModalOpen} setTimeOffModalOpen={setTimeOffModalOpen} />,
          document.body,
        )}

      {timeOffModalOpen &&
        createPortal(
          <CreateTimeOff isVisible={timeOffModalOpen} onClose={() => setTimeOffModalOpen(false)} sites={allSites} showMessageFeedback={showMessageFeedback} openNotification={openNotification} />,
          document.body,
        )}
    </div>
  )
}

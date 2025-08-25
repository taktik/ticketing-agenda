import { CalendarOutlined, LeftOutlined, RightOutlined, UnorderedListOutlined } from '@ant-design/icons'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Segmented, Space, Typography } from 'antd'
import { addDays, addHours, endOfDay, endOfWeek, startOfDay, startOfWeek } from 'date-fns'
import { EventApi, EventClickArg, EventInput } from 'fullcalendar'
import React, { ReactElement, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useGetCalendarItemByAgendaIdAndPeriodQuery } from '../../core/api/calendarItemApi'
import { dateToYYYYMMDD } from '../common/helpers'
import { CreateEvent } from './CreateEvent/CreateEvent'
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
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventApi | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [timeRange, setTimeRange] = useState<'week' | 'day'>('week')
  const [calendarTitle, setCalendarTitle] = useState<string>('')
  const { t, i18n } = useTranslation()
  const [calendarRange, setCalendarRange] = useState<calendarRangeType>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  })

  const { data: calendarItems, isLoading: isCalendarItemsLoading } = useGetCalendarItemByAgendaIdAndPeriodQuery(
    {
      agendaId: selectedAgenda?.id ?? '',
      from: dateToYYYYMMDD(calendarRange.from),
      to: dateToYYYYMMDD(calendarRange.to),
    },
    { skip: !selectedAgenda },
  )

  const events: EventInput[] = useMemo(() => {
    if (!calendarItems) return []
    return calendarItems.map((calendarItem) => {
      const linkedProcedure = procedures?.find((procedure) => procedure.id === calendarItem.calendarItemTypeId)
      return {
        id: v4(),
        title: calendarItem.title,
        start: calendarItem.startTime,
        end: calendarItem.endTime,
        color: linkedProcedure?.color,
        details: '',
        extendedProps: { calendarItemTypeId: calendarItem.calendarItemTypeId, agendaId: calendarItem.agendaId, patientId: calendarItem.patientId },
      }
    })
  }, [calendarItems])

  useEffect(() => console.log('calendarItems', calendarItems), [calendarItems])
  useEffect(() => console.log('events', events), [events])

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
    if (timeRange === 'day') {
      setCalendarRange({ from: startOfDay(calendarDate), to: endOfDay(calendarDate) })
    } else if (timeRange === 'week') {
      setCalendarRange({ from: startOfWeek(calendarDate), to: endOfWeek(calendarDate) })
    }
  }, [calendarDate, timeRange])

  const handlePrev = () => calendarRef.current?.getApi().prev()
  const handleNext = () => calendarRef.current?.getApi().next()
  const handleToday = () => calendarRef.current?.getApi().today()

  const handleDatesSet = (dateInfo: { view: { title: string } }) => {
    setCalendarTitle(dateInfo.view.title)
    handleFullCalendarDateChange()
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo.event)
    setEventModalOpen(true)
  }

  const handleCreate = () => {
    setCreateModalOpen(true)
  }

  return (
    <div className="calendar-root">
      <div className="calendar-header">
        <Space>
          <Space.Compact>
            <Button onClick={handlePrev} icon={<LeftOutlined />} />
            <Button onClick={handleNext} icon={<RightOutlined />} />
          </Space.Compact>
          <Button onClick={handleToday}>{t('content.today')}</Button>
          <Button onClick={() => handleCreate()}>{t('content.create_appointment')}</Button>
        </Space>

        <Typography.Title level={4} style={{ margin: 0 }} ellipsis={{ rows: 2 }}>
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
        height="90%"
        datesSet={handleDatesSet}
        events={events}
        eventClick={handleEventClick}
        eventContent={(eventInfo) => {
          if (eventInfo.view.type === 'listWeek' || eventInfo.view.type === 'listDay') {
            return <ListEventContent event={eventInfo.event} view={eventInfo.view.type} />
          } else if (eventInfo.view.type === 'timeGridDay' || eventInfo.view.type === 'timeGridWeek') {
            return <GridEventContent event={eventInfo.event} view={eventInfo.view.type} />
          }
          return <p>{eventInfo.event.title}</p>
        }}
      />
      {eventModalOpen && createPortal(<EventDetails isVisible={eventModalOpen} onClose={() => setEventModalOpen(false)} event={selectedEvent} procedures={procedures} />, document.body)}
      {createModalOpen && createPortal(<CreateEvent isVisible={createModalOpen} onClose={() => setCreateModalOpen(false)} sites={sites} />, document.body)}
    </div>
  )
}

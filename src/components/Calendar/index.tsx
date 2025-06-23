import { CalendarOutlined, LeftOutlined, RightOutlined, UnorderedListOutlined } from '@ant-design/icons'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Button, Segmented, Space, Typography } from 'antd'
import { DatesSetArg, EventApi, EventClickArg, EventInput, EventSourceInput } from 'fullcalendar'
import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'
import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { useGetCalendarItemByAgendaIdAndPeriodQuery } from '../../core/api/calendarItemApi'
import { addDays, addHours, endOfDay, endOfWeek, startOfDay, startOfWeek } from 'date-fns'
import { v4 } from 'uuid'
import { GridEventContent } from './EventContent/GridEventContent'
import { ListEventContent } from './EventContent/ListEventContent'
import { createPortal } from 'react-dom'
import { ModalEvent } from './ModalEvent/ModalEvent'

interface CalendarProps {
  handleFullCalendarDateChange: () => void
  calendarRef: React.MutableRefObject<FullCalendar | null>
  calendarDate: Date
  selectedAgenda: Agenda | undefined
  selectedProcedure: CalendarItemType | undefined
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>
  procedures: CalendarItemType[] | undefined
}

type calendarRangeType = {
  from: Date
  to: Date
}

const fakeEvents: EventInput[] = [
  { id: '1', title: 'Déclaration de mariage', start: new Date().getTime(), end: addHours(new Date(), 2).getTime(), color: 'orange', extendedProps: { calendarItemTypeId: '1', agendaId: '5' } },
  {
    id: '2',
    title: 'Déclaration de changement de nom/prénom',
    start: addDays(addHours(new Date(), 3), 1).getTime(),
    end: addDays(addHours(new Date(), 4), 1).getTime(),
    color: 'green',
    extendedProps: { calendarItemTypeId: '2', agendaId: '3', fullName: 'Phil Defer', email: 'PhilDefer@gmail.com' },
  },
]

export const Calendar = ({ handleFullCalendarDateChange, calendarRef, selectedAgenda, selectedProcedure, calendarDate, setCalendarDate, procedures }: CalendarProps): ReactElement => {
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventApi | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [timeRange, setTimeRange] = useState<'week' | 'day'>('week')
  const [calendarTitle, setCalendarTitle] = useState<string>('')
  const { t, i18n } = useTranslation()
  const [calendarRange, setCalendarRange] = useState<calendarRangeType>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  })

  const { data: calendarItems, isLoading: isCalendarItemsLoading } = useGetCalendarItemByAgendaIdAndPeriodQuery({
    agendaId: selectedAgenda?.id ?? '',
    from: calendarRange.from.getTime(),
    to: calendarRange.to.getTime(),
    skip: !selectedAgenda,
  })

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
        calendarApi.changeView(targetView)
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

  return (
    <div className="calendar-root">
      <div className="calendar-header">
        <Space>
          <Space.Compact>
            <Button onClick={handlePrev} icon={<LeftOutlined />} />
            <Button onClick={handleNext} icon={<RightOutlined />} />
          </Space.Compact>
          <Button onClick={handleToday}>{t('content.today')}</Button>
        </Space>

        <Typography.Title level={4} style={{ margin: 0 }}>
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
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={false}
        height="90%"
        datesSet={handleDatesSet}
        events={fakeEvents}
        eventClick={handleEventClick}
        eventContent={(eventInfo) => {
          if (eventInfo.view.type === 'listWeek') {
            return <ListEventContent event={eventInfo.event} />
          } else if (eventInfo.view.type === 'dayGridMonth') {
            return <GridEventContent event={eventInfo.event} />
          }
          return <i>{eventInfo.event.title}</i>
        }}
      />
      {eventModalOpen && createPortal(<ModalEvent isVisible={eventModalOpen} onClose={() => setEventModalOpen(false)} event={selectedEvent} procedures={procedures} />, document.body)}
    </div>
  )
}

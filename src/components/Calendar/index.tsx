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
import { DatesSetArg } from 'fullcalendar'
import React, { ReactElement, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CalendarProps {
  handleFullCalendarDateChange: () => void
  calendarRef: React.MutableRefObject<FullCalendar | null>
}

export const Calendar = ({ handleFullCalendarDateChange, calendarRef }: CalendarProps): ReactElement => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [timeRange, setTimeRange] = useState<'week' | 'day'>('week')
  const [calendarTitle, setCalendarTitle] = useState<string>('')

  const { t, i18n } = useTranslation()

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

  const handlePrev = () => calendarRef.current?.getApi().prev()
  const handleNext = () => calendarRef.current?.getApi().next()
  const handleToday = () => calendarRef.current?.getApi().today()

  const handleDatesSet = (dateInfo: { view: { title: string } }) => {
    setCalendarTitle(dateInfo.view.title)
    handleFullCalendarDateChange()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '1.5rem' }}>
      {/* Our Custom Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Space>
          <Space>
            <Button onClick={handlePrev} icon={<LeftOutlined />} />
            <Button onClick={handleNext} icon={<RightOutlined />} />
          </Space>
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

          <Space>
            <Button type={timeRange === 'day' ? 'primary' : 'default'} onClick={() => setTimeRange('day')}>
              {t('content.day')}
            </Button>
            <Button type={timeRange === 'week' ? 'primary' : 'default'} onClick={() => setTimeRange('week')}>
              {t('content.week')}
            </Button>
          </Space>
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
        events={[
          { title: 'Event 1', date: '2025-06-09' },
          { title: 'Event 2', date: '2025-06-10' },
        ]}
        datesSet={handleDatesSet}
      />
    </div>
  )
}

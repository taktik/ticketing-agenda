import { DatesSetArg } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Agenda, CalendarItemType, HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { Calendar as AntCalendar, Button, theme, Tooltip } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Header } from '../../components/common/Header'
import { ModalSiteForm } from '../../components/ModalSiteForm'
import { ServiceSelector } from '../../components/ServiceSelector'
import { SiteSelector } from '../../components/SiteSelector'
import { useGetAgendasQuery } from '../../core/api/agendaApi'
import { useGetTimeTablesQuery } from '../../core/api/timeTableApi'
import { useAppSelector } from '../../core/hooks'
import './index.css'
import { useGetHealthcarePartiesQuery, useGetRootHealthcareParty, useGetHealthcarePartiesByParentQuery } from '../../core/api/healthcarePartyApi'
import { DemarcheSelector } from '../../components/DemarcheSelector'
import { ModalServiceForm } from '../../components/ModalServiceForm'
import { ModalSettings } from '../../components/ModalSettings'
import { ModalDemarcheForm } from '../../components/ModalDemarcheForm'
import { ModalScheduling } from '../../components/ModalScheduling'
import { SettingOutlined } from '@ant-design/icons'
import { useGetCalendarItemTypesQuery } from '../../core/api/calendarItemTypeApi'
import { SettingContextProvider } from '../../contexts/SettingContext'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [schedulingModalOpen, setSchedulingModalOpen] = useState<boolean>(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const calendarRef = useRef<FullCalendar | null>(null)
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  const { data: rootHcp } = useGetRootHealthcareParty({ skip: skip })

  const { data: sites } = useGetHealthcarePartiesByParentQuery({ skip: skip || !rootHcp, parentId: rootHcp?.id ?? '' })
  const [selectedSite, setSelectedSite] = useState<HealthcareParty | undefined>(sites?.[0])

  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: skip || !selectedSite, parentId: selectedSite?.id ?? '' })
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(services?.[0])

  const { data: demarches } = useGetCalendarItemTypesQuery({
    agendaId: selectedSite?.id ?? '',
    skip: skip,
  })
  const [selectedDemarche, setSelectedDemarche] = useState<CalendarItemType | undefined>(demarches?.[0])

  useEffect(() => {
    if (!selectedSite && sites?.length) {
      setSelectedSite(sites[0])
    }
  }, [sites])

  const handleAntCalendarDateChange = useCallback(
    (value: Dayjs) => {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi && value) {
        setCalendarDate(value.toDate())
        calendarApi.gotoDate(value.toDate())
      }
    },
    [calendarRef, setCalendarDate],
  )

  const handleFullCalendarDateChange = useCallback(
    (value: DatesSetArg) => {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi) {
        const currentDate = calendarApi.getDate()
        setCalendarDate(currentDate)
      }
    },
    [calendarRef, setCalendarDate],
  )

  const wrapperStyle: React.CSSProperties = {
    width: 400,
    border: `1px solid #D9D9D9`,
    borderRadius: 0,
  }

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        <div className="svg-background" />
        <div className="LeftPanel">
          <div className="SiteSelectorRow">
            <SiteSelector sites={sites ?? []} setSelectedSite={setSelectedSite} selectedSite={selectedSite} />
            <Tooltip title="Settings">
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsModalOpen(true)}
                style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
              />
            </Tooltip>
          </div>
          <div style={{ ...wrapperStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', zIndex: '1' }}>
            <AntCalendar fullscreen={false} value={dayjs(calendarDate)} onChange={handleAntCalendarDateChange} />
          </div>
          <ServiceSelector services={services ?? []} selectedService={selectedService} setSelectedService={setSelectedService} />
          <DemarcheSelector demarches={demarches ?? []} selectedDemarche={selectedDemarche} setSelectedDemarche={setSelectedDemarche} />
        </div>
        <div className="RightPanel">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek myCustomButton',
            }}
            customButtons={{
              myCustomButton: {
                text: 'Scheduling',
                hint: 'View the scheduling',
                click: () => {
                  setSchedulingModalOpen(true)
                },
              },
            }}
            initialView="timeGridWeek"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={false}
            height="90%"
            events={[
              { title: 'event 1', date: '2025-04-14' },
              { title: 'event 2', date: '2019-04-15' },
            ]}
            datesSet={handleFullCalendarDateChange}
          />
        </div>
      </div>
      {settingsModalOpen &&
        createPortal(
          <SettingContextProvider selectedSite={selectedSite} rootHcp={rootHcp}>
            <ModalSettings isVisible={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
          </SettingContextProvider>,
          document.body,
        )}
      {schedulingModalOpen &&
        createPortal(<ModalScheduling isVisible={schedulingModalOpen} onClose={() => setSchedulingModalOpen(false)} selectedSite={selectedSite} />, document.body)}
    </div>
  )
}

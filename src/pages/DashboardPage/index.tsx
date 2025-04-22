import { DatesSetArg } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Agenda, HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { Calendar as AntCalendar, theme } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Header } from '../../components/common/Header'
import { ModalAddSiteForm } from '../../components/ModalAddSiteForm'
import { ServiceSelector } from '../../components/ServiceSelector'
import { SiteSelector } from '../../components/SiteSelector'
import { useGetAgendasQuery } from '../../core/api/agendaApi'
import { useGetTimeTables } from '../../core/api/timeTableApi'
import { useAppSelector } from '../../core/hooks'
import './index.css'
import { useGetHealthcarePartiesQuery } from '../../core/api/healthcarePartyApi'
import { DemarcheSelector } from '../../components/DemarcheSelector'
import { ModalAddServiceForm } from '../../components/ModalAddServiceForm'
import { ModalServiceSettings } from '../../components/ModalServiceSettings'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [addSiteModalOpen, setAddSiteModalOpen] = useState<boolean>(false)
  const [addServiceModalOpen, setAddServiceModalOpen] = useState<boolean>(false)
  const [addDemarcheModalOpen, setAddDemarcheModalOpen] = useState<boolean>(false)
  const [serviceSettingModalOpen, setServiceSettingModalOpen] = useState<boolean>(false)
  const calendarRef = useRef<FullCalendar | null>(null)
  const { token } = theme.useToken()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  const { data: sites } = useGetAgendasQuery(undefined, { skip: skip })
  const [selectedSite, setSelectedSite] = useState<Agenda | undefined>(sites?.[0])

  const { data: services } = useGetHealthcarePartiesQuery(undefined, { skip: skip })
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(services?.[0])

  const { data: demarches } = useGetTimeTables({
    agendaId: selectedSite?.id ?? '',
    serviceTag: selectedService ? `service-${selectedService.id}` : undefined,
    skip: skip || !selectedSite?.id,
  })
  const [selectedDemarche, setSelectedDemarche] = useState<TimeTable | undefined>(demarches?.[0])

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
    width: 300,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  }

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        <div className="LeftPanel">
          <div style={{ width: '300px' }}>
            <SiteSelector sites={sites ?? []} setSelectedSite={setSelectedSite} selectedSite={selectedSite} setSiteModalOpen={setAddSiteModalOpen} />
          </div>
          <div style={{ ...wrapperStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <AntCalendar fullscreen={false} value={dayjs(calendarDate)} onChange={handleAntCalendarDateChange} />
          </div>

          <ServiceSelector
            services={services ?? []}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            setServiceModalOpen={setAddServiceModalOpen}
            setServiceSettingModalOpen={setServiceSettingModalOpen}
          />
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
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            initialView="dayGridMonth"
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
      {addSiteModalOpen && createPortal(<ModalAddSiteForm isVisible={addSiteModalOpen} onClose={() => setAddSiteModalOpen(false)} />, document.body)}
      {addServiceModalOpen && createPortal(<ModalAddServiceForm isVisible={addServiceModalOpen} onClose={() => setAddServiceModalOpen(false)} />, document.body)}
      {addDemarcheModalOpen && createPortal(<ModalAddServiceForm isVisible={addDemarcheModalOpen} onClose={() => setAddDemarcheModalOpen(false)} />, document.body)}
      {serviceSettingModalOpen &&
        createPortal(<ModalServiceSettings isVisible={serviceSettingModalOpen} onClose={() => setServiceSettingModalOpen(false)} selectedSite={selectedSite} />, document.body)}
    </div>
  )
}

//      <Patients />
//      <ModalRecoveryKey />

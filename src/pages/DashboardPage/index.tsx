import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import { Agenda } from '@icure/cardinal-sdk'
import { Autocomplete, Button, TextField } from '@mui/material'
import { LocalizationProvider, StaticDatePicker } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ServiceSelector } from '../../components/ServiceSelector'
import { Header } from '../../components/common/Header'
import { ModalAddAgendaForm } from '../../components/ModalAddAgendaForm'
import { useGetAgendasQuery } from '../../core/api/agendaApi'
import { useAppSelector } from '../../core/hooks'
import { Calendar as AntCalendar, theme, Select as AntSelect } from 'antd'
import './index.css'
import React from 'react'
import { DatesSetArg } from '@fullcalendar/core'
import SiteSelector from '../../components/SiteSelector'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [serviceModalOpen, setServiceModalOpen] = useState<boolean>(false)
  const calendarRef = useRef<FullCalendar | null>(null)
  const { token } = theme.useToken()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  const { data, error, isLoading } = useGetAgendasQuery(undefined, { skip: skip })
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | undefined>(data?.[0])

  const sites = ['Site principal', 'Site B', 'Site rue avalon']
  const [selectedSite, setSelectedSite] = useState<string>(sites[0])

  const services = ['État civil', 'Population', 'Urbanisme']
  const [selectedService, setSelectedService] = useState<string>(services[0])

  const demarches = ['Déclaration de mariage', 'Changement d’adresse', 'Déclaration de travaux']
  const [selectedDemarche, setSelectedDemarche] = useState<string>(demarches[0])

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
            <SiteSelector sites={sites} setSelectedSite={setSelectedSite} selectedSite={selectedSite} />
          </div>
          <div style={{ ...wrapperStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <AntCalendar fullscreen={false} value={dayjs(calendarDate)} onChange={handleAntCalendarDateChange} />
          </div>

          <ServiceSelector agendas={data ?? []} selectedAgenda={selectedAgenda} setSelectedAgenda={setSelectedAgenda} setAgendaModalOpen={setServiceModalOpen} />
          <Autocomplete options={demarches} sx={{ width: 300 }} renderInput={(params) => <TextField {...params} label="Démarches" />} />
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
      {serviceModalOpen && createPortal(<ModalAddAgendaForm isVisible={serviceModalOpen} onClose={() => setServiceModalOpen(false)} />, document.body)}
    </div>
  )
}

//      <Patients />
//      <ModalRecoveryKey />

/*

          <Autocomplete options={sites} sx={{ width: 300 }} renderInput={(params) => <TextField {...params} label="Sites" />} />


<LocalizationProvider dateAdapter={AdapterDayjs}>
            <StaticDatePicker
              defaultValue={dayjs(calendarDate)}
              onChange={(newValue) => {
                if (newValue) handleDateChange(newValue.toDate())
              }}
              slots={{ actionBar: () => null }}
            />
          </LocalizationProvider>

          */

import React, { useState } from 'react'
import { StaticDatePicker } from '@mui/x-date-pickers'
import { Autocomplete, TextField } from '@mui/material'
import { AgendaSelector } from '../../components/AgendaSelector'
import { ModalRecoveryKey } from '../../components/authentication/ModalRecoveryKey'
import { Patients } from '../../components/patient/Patients'
import './index.css'
import { Header } from '../../components/common/Header'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date | null>(new Date())
  const agendas = ['Guichet A1', 'Guichet licenses', 'Guichet B3']
  const [selectedAgenda, setSelectedAgenda] = useState<string>(agendas[0])

  const sites = ['Charleroi', 'Mouscron', 'Liège']
  const [selectedSite, setSelectedSite] = useState<string>(sites[0])

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        <div className="LeftPanel">
          <Autocomplete options={sites} sx={{ width: 300 }} renderInput={(params) => <TextField {...params} label="Sites" />} />
          <StaticDatePicker defaultValue={calendarDate} onChange={(newValue) => setCalendarDate(newValue)} />
          <AgendaSelector agendas={agendas} selectedAgenda={selectedAgenda} setSelectedAgenda={setSelectedAgenda} />
        </div>
        <div className="RightPanel">
          {/*<Toolbar calendarDate={calendarDate} setCalendarDate={setCalendarDate}/>
          <Calendar /> */}
        </div>
      </div>
     
    </div>
  )
}

//      <Patients />
//      <ModalRecoveryKey />

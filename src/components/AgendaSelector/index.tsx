import React, { ReactElement, useState } from 'react'
import { Header } from '../../components/Header'

import './index.css'
import { StaticDatePicker } from '@mui/x-date-pickers'
import { Autocomplete, TextField } from '@mui/material'

interface AgendaSelectorProps {
  agendas: string[]
  selectedAgenda: string
  setSelectedAgenda: React.Dispatch<React.SetStateAction<string>>
}

export const AgendaSelector = ({ agendas, selectedAgenda, setSelectedAgenda }: AgendaSelectorProps): ReactElement => {
  return <div className="AgendaSelector"></div>
}

export type TimeTablesServiceParameters = {
  agendaId: string
  skip?: boolean
}

export type CalendarItemTypeServiceParameters = {
  agendaId: string
  skip?: boolean
}

export type GetRootHealthcarePartyParameters = {
  skip?: boolean
}

export type GetHealthcarePartyByParentParameters = {
  parentId: string
  skip?: boolean
}

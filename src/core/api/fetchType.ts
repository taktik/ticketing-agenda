export type TimeTablesServiceParameters = {
  agendaId: string
  skip?: boolean
}

export type CalendarItemTypeServiceParameters = {
  agendaId: string
  skip?: boolean
}

export type DeleteAgendaByIdParameters = {
  agendaId: string
  rev: string
  skip?: boolean
}

export type GetRootHealthcarePartyParameters = {
  skip?: boolean
}

export type GetHealthcarePartyByParentParameters = {
  parentId: string
  skip?: boolean
}

export type GetAllServiceBySiteIdParameters = {
  sitesIds: string[]
  skip?: boolean
}

export type AllCalendarItemTypeServiceParameters = {
  skip: boolean
  agendaIds: string[]
}

export type UndeleteHcpByIdParameters = {
  HcpId: string
  rev: string
  skip?: boolean
}

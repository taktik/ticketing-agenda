export enum RootHcpType {
  SITE_ROOT = 'site-root',
  ADMIN_ROOT = 'admin-root',
}

export type TimeTablesServiceParameters = {
  agendaId: string
}

export type CalendarItemTypeServiceParameters = {
  agendaId: string
}

export type DeleteAgendaByIdParameters = {
  agendaId: string
  rev: string
}

export type GetRootHealthcarePartyParameters = {
  rootType: RootHcpType
  skip?: boolean
}

export type GetHealthcarePartyByParentParameters = {
  parentId: string
}

export type GetAllServiceBySiteIdParameters = {
  sitesIds: string[]
  skip: boolean
}

export type AllCalendarItemTypeServiceParameters = {
  agendaIds: string[]
}

export type UndeleteHcpByIdParameters = {
  HcpId: string
  rev: string
}

export type GetCalendarItemsByAgendaAndPeriods = {
  agendaId: string
  from: number
  to: number
}

export type GetServicesForMultipleSitesParameters = {
  siteIds: string[]
}

export type GetAgendasByStringPropertyParameters = {
  propertyId: string
  propertyValue: string
}

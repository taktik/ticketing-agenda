export enum HcpTag {
  SITE_ROOT = 'site-root',
  ADMIN_ROOT = 'admin-root',
  SITE = 'SITE',
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
  rootType: HcpTag
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

export interface SendEmailRequest {
  receiver: string
  from: string
  processId: string
  bcc: string[]
  cc: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: Record<string, any>
}

export interface SendEmailResponse {
  success: boolean
  message?: string
}

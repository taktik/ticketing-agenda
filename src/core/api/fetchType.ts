export enum HcpTag {
  SITE_ROOT = 'SITE_ROOT',
  ADMIN_ROOT = 'ADMIN_ROOT',
  SITE = 'SITE',
  ADMINISTRATOR = 'ADMINISTRATOR',
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
}

export enum EntityType {
  SERVICE = 'SERVICE',
  CALENDARITEMTYPE = 'CALENDARITEMTYPE',
  SITE = 'SITE',
}

export enum PropertyId {
  SERVICE_PARENTID = 'SERVICE|PARENTID',
  CALENDARITEMTYPE_AGENDAID = 'CALENDARITEMTYPE|AGENDAID',
  CALENDARITEMTYPE_ORDER = 'CALENDARITEMTYPE|ORDER',
  CALENDARITEMTYPE_PROCEDUREDETAILS = 'CALENDARITEMTYPE|PROCEDUREDETAILS',
  CALENDARITEMTYPE_QBETTER_SERVICE_ID = 'CALENDARITEMTYPE|QBETTER_SERVICE_ID',
  CALENDARITEMTYPE_ISPUBLIC = 'CALENDARITEMTYPE|ISPUBLIC',
  SITE_LOCATION = 'SITE|LOCATION',
  SITE_QBETTER_LOCATION_ID = 'SITE|QBETTER_LOCATION_ID',
}

export enum CalendarItemTag {
  APPOINTMENT = 'APPOINTMENT',
  APPOINTMENT_LAST_AUTHOR = 'APPOINTMENT|LAST_AUTHOR',
  APPOINTMENT_QBETTER_SERVICE_ID = 'APPOINTMENT|QBETTER_SERVICE_ID',
  APPOINTMENT_QBETTER_LOCATION_ID = 'APPOINTMENT|QBETTER_LOCATION_ID',
  APPOINTMENT_QBETTER_APPOINTMENT_ID = 'APPOINTMENT|QBETTER_APPOINTMENT_ID',
  APPOINTMENT_QBETTER_CODE = 'APPOINTMENT|QBETTER_CODE',
  TIMEOFF = 'TIMEOFF',
}

/** Special confirmation code values returned by the propagation backend */
export enum ConfirmationCodeSpecialValue {
  SKIPPED = 'SKIPPED',
  NONE = 'NONE',
}

/** The iCure patient language value that maps to Dutch */
export const PATIENT_LANGUAGE_NL = 'Nederlands'

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
  variables: Record<string, string | number | boolean | null | undefined>
}

export interface SendEmailResponse {
  success: boolean
  message?: string
}

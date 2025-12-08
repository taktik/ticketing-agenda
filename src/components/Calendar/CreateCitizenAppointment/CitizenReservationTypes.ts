import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Dayjs } from 'dayjs'

export interface ProcedureVariant {
  id: string
  attendees: number
  duration: number
  calendarItemType: CalendarItemType
}

export interface SiteVariant {
  id: string
  siteId: string
  siteName: string
  siteLocation: string
  procedureDetails: string
  site: HealthcareParty
  agenda: Agenda
  procedureVariants: ProcedureVariant[]
}

export interface ProcedureGroup {
  id: string
  displayTextByLanguage: { [key: string]: string }
  siteVariants: SiteVariant[]
}

export interface AppointmentDraft {
  tempId: string
  procedureGroupId?: string
  siteVariantId?: string
  procedureVariantId?: string
  calendarItemType?: CalendarItemType
  quantity?: number
  site?: HealthcareParty
  agenda?: Agenda
  duration?: number
  calculatedStartTime?: Dayjs
  calculatedEndTime?: Dayjs
}

export interface PersonalInfo {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  countryCode: string
  birthDate: Dayjs
  language: string
}

export interface TimeSlot {
  date: Dayjs
  time: Dayjs
}

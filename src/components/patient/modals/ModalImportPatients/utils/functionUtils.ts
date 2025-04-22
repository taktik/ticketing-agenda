import { HealthcareParty, TimeTableItem } from '@icure/cardinal-sdk'

export const isTimeTableItemArray = (items: HealthcareParty[] | TimeTableItem[]): items is TimeTableItem[] => {
  return items.length > 0 && 'rrule' in items[0]
}

export const isHealthcarePartyArray = (items: HealthcareParty[] | TimeTableItem[]): items is TimeTableItem[] => {
  return items.length > 0 && 'hcPartyKeys' in items[0]
}

export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

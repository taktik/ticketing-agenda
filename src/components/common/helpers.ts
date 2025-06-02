import dayjs from 'dayjs'

export const minutesToDayjs = (totalMinutes?: number): dayjs.Dayjs | null => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes)) {
    return null
  }
  return dayjs().startOf('day').add(totalMinutes, 'minute')
}

export const dayjsToMinutes = (time?: dayjs.Dayjs | null): number | undefined => {
  if (!time || !dayjs.isDayjs(time)) {
    return undefined
  }
  return time.hour() * 60 + time.minute()
}

export const formatMinutesToHHMM = (totalMinutes?: number): string => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes)) {
    return 'N/A'
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const numberTimestampToDate = (timestamp: number): Date | null => {
  const timestampStr = timestamp.toString()

  if (timestampStr.length !== 14 || !/^\d{14}$/.test(timestampStr)) {
    console.warn(`Invalid timestamp number: "${timestamp}". Expected 14-digit YYYYMMDDHHmmss format.`)
    return null
  }

  const dateObj = dayjs(timestampStr, 'YYYYMMDDHHmmss', true)

  return dateObj.isValid() ? dateObj.toDate() : null
}

export const formatDateToYYYYMMDDHHmmssNumber = (dateInput: Date): number => {
  const dateObj = dayjs(dateInput)
  if (!dateObj.isValid()) {
    return 0
  }

  const formated = dateObj.format('YYYYMMDDHHmmss')

  return Number(formated)
}

export const numberTimestampToDayjs = (timestamp: number): dayjs.Dayjs | null => {
  const timestampStr = timestamp.toString()

  if (timestampStr.length !== 14 || !/^\d{14}$/.test(timestampStr)) {
    console.warn(`Invalid timestamp number: "${timestamp}". Expected 14-digit YYYYMMDDHHmmss format.`)
    return null
  }

  const dateObj = dayjs(timestampStr, 'YYYYMMDDHHmmss', true)

  return dateObj.isValid() ? dateObj : null
}

export const formatDayjsToYYYYMMDDHHmmssNumber = (dayjsInput: dayjs.Dayjs): number => {
  if (!dayjsInput.isValid()) {
    return 0
  }

  const formated = dayjsInput.format('YYYYMMDDHHmmss')

  return Number(formated)
}

export function formatTotalMinutesForDisplay(totalMinutes: number | undefined, t: (key: string) => string): string {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes) || totalMinutes < 0) {
    return t('content.not_set')
  }
  if (totalMinutes === 0) return `0 ${t('content.min')}`

  // Find the largest unit that makes sense (e.g., whole numbers)
  const units = [
    { nameKey: 'weeks', labelKey: 'unit_weeks', multiplier: 7 * 24 * 60 },
    { nameKey: 'days', labelKey: 'unit_days', multiplier: 24 * 60 },
    { nameKey: 'hours', labelKey: 'unit_hours', multiplier: 60 },
    { nameKey: 'minutes', labelKey: 'unit_minutes', multiplier: 1 },
  ]

  for (const unit of units) {
    if (totalMinutes >= unit.multiplier && totalMinutes % unit.multiplier === 0) {
      const quantity = totalMinutes / unit.multiplier
      return `${quantity} ${t(`content.${unit.labelKey}`)}`
    }
  }
  // Fallback to minutes if no clean larger unit
  return `${totalMinutes} ${t('content.unit_minutes')}`
}

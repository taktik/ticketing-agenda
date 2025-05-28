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

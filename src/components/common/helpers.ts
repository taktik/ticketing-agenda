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

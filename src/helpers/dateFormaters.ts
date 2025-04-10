import { differenceInDays, differenceInMonths, differenceInYears, format, fromUnixTime, parse } from 'date-fns'

export const getNumericDate = (date: Date | number): number => {
  return Number(format(date, 'yyyyMMddHHmmss'))
}

export const formatTimestampToHumanReadable = (timestamp: number | undefined): string | undefined => {
  if (!timestamp) {
    return undefined
  }
  const parsedDate = parse(timestamp.toString(), 'yyyyMMddHHmmss', new Date())
  return format(parsedDate, 'd MMMM yyyy')
}

export const getAge = (date: number | undefined): string | undefined => {
  if (!date) {
    return '-'
  }

  const now = new Date()
  const birthDate = fromUnixTime(date)

  const years = differenceInYears(now, birthDate)
  if (years !== 0) {
    if (years % 10 == 1) {
      return `${years} year`
    } else {
      return `${years} years`
    }
  }

  const months = differenceInMonths(now, birthDate)
  if (months !== 0) {
    if (months % 10 == 1) {
      return `${months} month`
    } else {
      return `${months} months`
    }
  }

  const days = differenceInDays(now, birthDate)
  if (days !== 0) {
    if (days % 10 == 1) {
      return `${days} day`
    } else {
      return `${days} days`
    }
  }

  return 'error'
}

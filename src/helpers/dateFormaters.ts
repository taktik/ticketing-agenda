import { differenceInDays, differenceInMonths, differenceInYears, format, parse } from 'date-fns'

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
  const birthDate = parse(date.toString(), 'yyyyMMddHHmmss', new Date())

  const years = differenceInYears(now, birthDate)
  if (years !== 0) {
    return years === 1 ? `${years} year` : `${years} years`
  }

  const months = differenceInMonths(now, birthDate)
  if (months !== 0) {
    return months === 1 ? `${months} month` : `${months} months`
  }

  const days = differenceInDays(now, birthDate)
  if (days !== 0) {
    return days === 1 ? `${days} day` : `${days} days`
  }

  return 'error'
}

import { format, isSameDay, Locale } from 'date-fns'
import { de, enUS, fr, nl } from 'date-fns/locale'
import dayjs, { Dayjs } from 'dayjs'
import { EventApi } from 'fullcalendar'

export const minutesToDayjs = (totalMinutes: number): dayjs.Dayjs => {
  return dayjs().startOf('day').add(totalMinutes, 'minute')
}

export const dayjsToMinutes = (time: dayjs.Dayjs): number => {
  return time.hour() * 60 + time.minute()
}

export const timestampToDate = (timestamp: number): Date | null => {
  const timestampStr = timestamp.toString()

  if (timestampStr.length !== 14 || !/^\d{14}$/.test(timestampStr)) {
    console.warn(`Invalid timestamp number: "${timestamp}". Expected 14-digit YYYYMMDDHHmmss format.`)
    return null
  }

  const dateObj = dayjs(timestampStr, 'YYYYMMDDHHmmss', true)

  return dateObj.isValid() ? dateObj.toDate() : null
}

export const timestampToDayjs = (timestamp: number): dayjs.Dayjs | null => {
  const timestampStr = timestamp.toString()

  if (timestampStr.length !== 14 || !/^\d{14}$/.test(timestampStr)) {
    console.warn(`Invalid timestamp number: "${timestamp}". Expected 14-digit YYYYMMDDHHmmss format.`)
    return null
  }

  const dateObj = dayjs(timestampStr, 'YYYYMMDDHHmmss', true)

  return dateObj.isValid() ? dateObj : null
}

export const dateToYYYYMMDDHHmmss = (dateInput: Date): number => {
  const dateObj = dayjs(dateInput)
  if (!dateObj.isValid()) {
    return 0
  }

  const formated = dateObj.format('YYYYMMDDHHmmss')

  return Number(formated)
}

export const dayjsToYYYYMMDDHHmmss = (dayjsInput: dayjs.Dayjs): number => {
  if (!dayjsInput.isValid()) {
    return 0
  }

  const formated = dayjsInput.format('YYYYMMDDHHmmss')

  return Number(formated)
}

export const totalMinutesForDisplay = (totalMinutes: number | undefined, t: (key: string) => string): string => {
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

export const dayjsToHhmmss = (time: dayjs.Dayjs): number => {
  if (!time || !time.isValid()) {
    console.error('Invalid time provided to dayjsToHhmmss')
    return 0
  }

  const hours = time.hour()
  const minutes = time.minute()
  const seconds = time.second()

  const hh = String(hours).padStart(2, '0') // 9 -> "09"
  const mm = String(minutes).padStart(2, '0') // 5 -> "05"
  const ss = String(seconds).padStart(2, '0') // 1 -> "01"

  const timeString = `${hh}${mm}${ss}`

  return parseInt(timeString, 10)
}

export const hhmmssToHHmm = (numericTime: number): string => {
  // Handle invalid or null inputs gracefully
  if (numericTime === null || isNaN(numericTime) || numericTime < 0) {
    return '00:00'
  }

  // 1. Convert the number to a string and pad with leading zeros
  //    to ensure it's always 6 digits long.
  //    93015 -> "093015"
  //    164530 -> "164530"
  const timeString = String(numericTime).padStart(6, '0')

  // 2. Extract the hour and minute parts using string slicing.
  const hours = timeString.slice(0, 2) // "09" or "16"
  const minutes = timeString.slice(2, 4) // "30" or "45"

  // 3. Combine them into the final formatted string.
  return `${hours}:${minutes}`
}

export const hhmmssToDayjs = (numericTime: number): dayjs.Dayjs => {
  // Handle invalid or null inputs gracefully
  if (numericTime === null || isNaN(numericTime) || numericTime < 0) {
    // Return a default dayjs object (e.g., start of today)
    return dayjs().startOf('day')
  }

  // 1. Convert the number to a string and pad with leading zeros
  //    to ensure it's always 6 digits long.
  //    43000  -> "043000"
  //    235000 -> "235000"
  const timeString = String(numericTime).padStart(6, '0')

  // 2. Extract the hour, minute, and second parts as numbers.
  const hours = parseInt(timeString.slice(0, 2), 10)
  const minutes = parseInt(timeString.slice(2, 4), 10)
  const seconds = parseInt(timeString.slice(4, 6), 10)

  // 3. Create a dayjs object for today and set the time.
  //    Using .hour(), .minute(), .second() is chainable and clear.
  const timeObject = dayjs().hour(hours).minute(minutes).second(seconds)

  return timeObject
}

/**
 * Converts a "fuzzy date" integer in YYYYMMDD format to a dayjs object.
 * @param fuzzyDate The date represented as a number (e.g., 20250714).
 * @returns A dayjs object representing that date.
 */
export const fuzzyDateIntToDayjs = (fuzzyDate: number | undefined): dayjs.Dayjs => {
  // Handle invalid or null inputs
  if (fuzzyDate === null || fuzzyDate === undefined || isNaN(fuzzyDate)) {
    console.error('Invalid number provided to fuzzyDateIntToDayjs')
    // Return today's date as a sensible default
    return dayjs()
  }

  // 1. Convert the number to a string.
  const dateString = String(fuzzyDate)

  // 2. Use dayjs to parse the string, providing the exact format.
  //    This is robust and handles all cases correctly.
  const dateObject = dayjs(dateString, 'YYYYMMDD')

  return dateObject
}

/**
 * Converts a dayjs object to a "fuzzy date" integer in YYYYMMDD format.
 * @param date The dayjs object to convert.
 * @returns A number representing the date (e.g., 20250714).
 */
export const dayjsToFuzzyDateInt = (date: dayjs.Dayjs | undefined): number => {
  // Handle invalid or null inputs
  if (!date || !date.isValid()) {
    console.error('Invalid dayjs object provided to dayjsToFuzzyDateInt')
    // Return a sensible default, like 0 or throw an error
    return 0
  }

  // 1. Use the format() method to get the string "YYYYMMDD".
  const dateString = date.format('YYYYMMDD')

  // 2. Convert the formatted string to an integer.
  return parseInt(dateString, 10)
}

/**
 * Takes a standard RRULE string, corrects the UNTIL format, and removes the "RRULE:" prefix.
 * @param rruleString The raw string from the rrule.js library, e.g., "RRULE:FREQ=WEEKLY;UNTIL=20250814T000000Z..."
 * @returns The corrected and cleaned string, e.g., "FREQ=WEEKLY;UNTIL=20250814..."
 */
export const correctAndCleanRRuleString = (rruleString: string): string => {
  // Return an empty string if the input is invalid
  if (!rruleString) {
    return ''
  }

  // Chain two replace calls:
  // 1. The first one fixes the UNTIL format.
  // 2. The second one removes the "RRULE:" prefix from the beginning of the string.
  return rruleString.replace(/(UNTIL=\d{8})T\d{6}Z/, '$1').replace(/^RRULE:/, '')
}

/**
 * Converts a Date object into a number in yyyyMMddHHmmss format using date-fns.
 * @param date The Date object to convert.
 * @returns A number representing the date (e.g., 20250801).
 */
export const dateToYYYYMMDD = (date: Date): number => {
  const dateTimeString = format(date, 'yyyyMMddHHmmss')
  return parseInt(dateTimeString, 10)
}

/**
 * A helper function to parse a single YYYYMMDDHHmmss timestamp number.
 * @param {number} timestamp - The 14-digit timestamp number.
 * @returns {dayjs.Dayjs | null} - A dayjs object or null if invalid.
 */
const parseSingleTimestamp = (timestamp: number): dayjs.Dayjs | null => {
  const timestampStr = timestamp.toString()

  if (timestampStr.length !== 14 || !/^\d{14}$/.test(timestampStr)) {
    console.warn(`Invalid timestamp: "${timestamp}". Expected 14-digit format.`)
    return null
  }

  const dateObj = dayjs(timestampStr, 'YYYYMMDDHHmmss', true) // Using strict parsing

  return dateObj.isValid() ? dateObj : null
}

/**
 * Parses start and end timestamps into an object of Date objects.
 * @param {number} startTimestamp - The 14-digit start timestamp.
 * @param {number} endTimestamp - The 14-digit end timestamp.
 * @returns {{start: Date, end: Date} | null} - An object with Date objects, or null if invalid.
 */
export const parseTimeRange = (startTimestamp: number, endTimestamp: number): { start: Date; end: Date } | null => {
  // 1. Parse both start and end timestamps
  const startTime = parseSingleTimestamp(startTimestamp)
  const endTime = parseSingleTimestamp(endTimestamp)

  // 2. Check if both are valid
  if (!startTime || !endTime) {
    return null
  }

  // 3. Return both values as standard Date objects
  return {
    start: startTime.toDate(),
    end: endTime.toDate(),
  }
}

/**
 * Calculates start and end times in YYYYMMDDHHmmss numeric format.
 * @param {Dayjs | null} startTime - The starting Dayjs object.
 * @param {number} durationInMinutes - The duration to add.
 * @returns {{startTime: number, endTime: number} | null} - An object with numeric timestamps, or null if invalid.
 */
export const calculateNumericEventTimes = (startTime: Dayjs | null, durationInMinutes: number): { startTime: number; endTime: number } | null => {
  // 1. Validate the input Dayjs object
  if (!startTime || !startTime.isValid()) {
    console.warn('Invalid start time provided for numeric calculation.')
    return null
  }

  // 2. Calculate the end time
  const endTime = startTime.add(durationInMinutes, 'minute')

  // 3. Format both dates to the required string format
  const formattedStartTime = startTime.format('YYYYMMDDHHmmss')
  const formattedEndTime = endTime.format('YYYYMMDDHHmmss')

  // 4. Convert the formatted strings to numbers and return the object
  return {
    startTime: Number(formattedStartTime),
    endTime: Number(formattedEndTime),
  }
}

export const formatEventDate = (event: EventApi, locale: Locale): string => {
  if (!event.start || !event.end) {
    return ''
  }

  if (isSameDay(event.start, event.end)) {
    const datePart = format(event.start, 'd MMMM yyyy', { locale })
    const startTime = format(event.start, 'HH:mm')
    const endTime = format(event.end, 'HH:mm')
    return `${datePart}, ${startTime} - ${endTime}`
  } else {
    const startDateTime = format(event.start, 'd MMMM yyyy, HH:mm', { locale })
    const endDateTime = format(event.end, 'd MMMM yyyy, HH:mm', { locale })
    return `${startDateTime} - ${endDateTime}`
  }
}

export const localeMap: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  nl: nl,
}

/**
 * Checks if an event is a standard FullCalendar all-day event.
 * It's considered all-day if it starts and ends exactly at midnight.
 */
export const isAllDayEvent = (start: Date | undefined, end: Date | undefined): boolean => {
  if (!start || !end) {
    return false
  }

  if (start.getTime() === end.getTime()) {
    return false
  }

  const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0
  const endsAtMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0

  return startsAtMidnight && endsAtMidnight
}

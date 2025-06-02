export const DEFAULT_MODAL_WIDTH = 1100
export const SMALL_MODAL_WIDTH = 700

export const NIGHTLY_ICURE_CLOUD_URL = 'https://nightly.icure.cloud'
export const MSG_GW_URL = 'https://msg-gw.icure.cloud'
// export const MSG_GW_URL = 'https://gwad.taktik.to'
export const SPEC_ID = process.env.REACT_APP_EXTERNAL_SERVICES_SPEC_ID
export const PROCESS_ID = process.env.REACT_APP_EMAIL_AUTHENTICATION_PROCESS_ID

export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATE_FORMAT_TO_DISPLAY = 'DD.MM.YYYY'

export const TOKENS = {
  SKIP: /^[ \r\n\t]+|^\.$/,
  number: /^[1-9][0-9]*/,
  numberAsText: /^(one|two|three)/i,
  every: /^every/i,
  'day(s)': /^days?/i,
  'weekday(s)': /^weekdays?/i,
  'week(s)': /^weeks?/i,
  'hour(s)': /^hours?/i,
  'minute(s)': /^minutes?/i,
  'month(s)': /^months?/i,
  'year(s)': /^years?/i,
  on: /^(on|in)/i,
  at: /^(at)/i,
  the: /^the/i,
  first: /^first/i,
  second: /^second/i,
  third: /^third/i,
  nth: /^([1-9][0-9]*)(\.|th|nd|rd|st)/i,
  last: /^last/i,
  for: /^for/i,
  'time(s)': /^times?/i,
  until: /^(un)?til/i,
  monday: /^mo(n(day)?)?/i,
  tuesday: /^tu(e(s(day)?)?)?/i,
  wednesday: /^we(d(n(esday)?)?)?/i,
  thursday: /^th(u(r(sday)?)?)?/i,
  friday: /^fr(i(day)?)?/i,
  saturday: /^sa(t(urday)?)?/i,
  sunday: /^su(n(day)?)?/i,
  january: /^jan(uary)?/i,
  february: /^feb(ruary)?/i,
  march: /^mar(ch)?/i,
  april: /^apr(il)?/i,
  may: /^may/i,
  june: /^june?/i,
  july: /^july?/i,
  august: /^aug(ust)?/i,
  september: /^sep(t(ember)?)?/i,
  october: /^oct(ober)?/i,
  november: /^nov(ember)?/i,
  december: /^dec(ember)?/i,
  comma: /^(,\s*|(and|or)\s*)+/i,
}

export const NOT_BEFORE_IN_MINUTES = 44000 // Can book an appointment one month in advance (44000 minutes = 1 month)
export const NOT_AFTER_IN_MINUTES = 30 // Cannot book an appointment 30 minutes before the appointment

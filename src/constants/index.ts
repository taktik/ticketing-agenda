export const DEFAULT_MODAL_WIDTH = 1100
export const SMALL_MODAL_WIDTH = 700

export const ICURE_NIGHTLY_URL = window.config.REACT_APP_ICURE_NIGHTLY_URL
export const ICURE_API_URL = window.config.REACT_APP_ICURE_API_URL
export const MSG_GW_URL = window.config.REACT_APP_MSG_GW_URL
export const SPEC_ID = window.config.REACT_APP_EXTERNAL_SERVICES_SPEC_ID
export const PARENT_ORGANISATION_ID = window.config.REACT_APP_PARENT_ORGANISATION_ID
export const FRIENDLY_CAPTCHA_SITE_KEY = window.config.REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY
export const DATABASE_ID = window.config.REACT_APP_DATABASE_ID
export const ROLE_ADMINISTRATOR = window.config.REACT_APP_ROLE_ADMINISTRATOR
export const ROLE_CHIEF_OF_SERVICE = window.config.REACT_APP_ROLE_CHIEF_OF_SERVICE
export const ROLE_CITY_WORKER = window.config.REACT_APP_ROLE_CITY_WORKER
export const BACKEND_API = window.config.REACT_APP_BACKEND_API
export const EMAIL_SENDER = window.config.REACT_APP_EMAIL_SENDER
export const EMAIL_AUTH_CODE_ADMIN_FR = window.config.REACT_APP_EMAIL_AUTH_CODE_ADMIN_FR
export const EMAIL_AUTH_CODE_ADMIN_NL = window.config.REACT_APP_EMAIL_AUTH_CODE_ADMIN_NL
export const EMAIL_CONFIRMATION_CODE_FR = window.config.REACT_APP_EMAIL_CONFIRMATION_CODE_FR
export const EMAIL_CONFIRMATION_CODE_NL = window.config.REACT_APP_EMAIL_CONFIRMATION_CODE_NL
export const EMAIL_APPOINTMENT_CONFIRMATION_FR = window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_FR
export const EMAIL_APPOINTMENT_CONFIRMATION_FR_NP = window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_FR_NP
export const EMAIL_APPOINTMENT_CONFIRMATION_NL = window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_NL
export const EMAIL_APPOINTMENT_CONFIRMATION_NL_NP = window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_NL_NP
export const EMAIL_APPOINTMENT_CANCELLATION_FR = window.config.REACT_APP_EMAIL_APPOINTMENT_CANCELLATION_FR
export const EMAIL_APPOINTMENT_CANCELLATION_NL = window.config.REACT_APP_EMAIL_APPOINTMENT_CANCELLATION_NL
export const EMAIL_APPOINTMENT_MODIFICATION_FR = window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_FR
export const EMAIL_APPOINTMENT_MODIFICATION_FR_NP = window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_FR_NP
export const EMAIL_APPOINTMENT_MODIFICATION_NL = window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_NL
export const EMAIL_APPOINTMENT_MODIFICATION_NL_NP = window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_NL_NP
export const MANAGE_APPOINTMENT_ROUTE = window.config.REACT_APP_MANAGE_APPOINTMENT_ROUTE
export const NEW_APPOINTMENT_ROUTE = window.config.REACT_APP_NEW_APPOINTMENT_ROUTE
export const ORIGIN = window.location.origin
export const APPLICATION_ID = window.config.REACT_APP_APPLICATION_ID
export const AZURE_CLIENT_ID = window.config.REACT_APP_AZURE_CLIENT_ID
export const AZURE_TENANT_ID = window.config.REACT_APP_AZURE_TENANT_ID

export const ADMIN_SOLUTIONS_AUTH_TOKEN = '' // get the token through icure dashboard
export const ADMIN_SOLUTIONS_EMAIL = '' // get the email through icure dashboard
export const EMAIL_TEMPLATE = '' // request the template id of the solution to icure

export enum RootHcpType {
  SITE_ROOT = 'site-root',
  ADMIN_ROOT = 'admin-root',
}

export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATE_FORMAT_TO_DISPLAY = 'DD.MM.YYYY'

export const RESERVED_WORDS = ['site-root', 'admin-root']

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

export const NOT_BEFORE_IN_MINUTES = 10080 // Can book an appointment 7 days in advance
export const NOT_AFTER_IN_MINUTES = 1440 // Cannot book an appointment 1 day before the appointment

export const EMAIL_APPOINTMENT_CONFIRMATION = {
  fr: {
    withProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_FR,
    withoutProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_FR_NP,
  },
  nl: {
    withProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_NL,
    withoutProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_CONFIRMATION_NL_NP,
  },
}
export const EMAIL_APPOINTMENT_CANCELLATION = {
  fr: window.config.REACT_APP_EMAIL_APPOINTMENT_CANCELLATION_FR,
  nl: window.config.REACT_APP_EMAIL_APPOINTMENT_CANCELLATION_NL,
}
export const EMAIL_APPOINTMENT_MODIFICATION = {
  fr: {
    withProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_FR,
    withoutProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_FR_NP,
  },
  nl: {
    withProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_NL,
    withoutProcedureDetails: window.config.REACT_APP_EMAIL_APPOINTMENT_MODIFICATION_NL_NP,
  },
}

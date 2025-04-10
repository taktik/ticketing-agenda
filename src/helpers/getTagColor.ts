import { PatientsTagsEnum } from './types'

export const getTagColor = (tag?: string) => {
  if (!tag) return

  switch (tag) {
    case PatientsTagsEnum.UNINVITED: {
      return '#ea0b5c'
    }
    case PatientsTagsEnum.WELCOMED: {
      return '#1565C0'
    }
    case PatientsTagsEnum.QUESTIONNAIRE_SENT: {
      return '#02BD85'
    }
    case PatientsTagsEnum.RESPONSE_RECEIVED: {
      return '#017c98'
    }
    case PatientsTagsEnum.NURSE_APPOINTMENT_TAKEN: {
      return '#cf8e09'
    }
    case PatientsTagsEnum.DOCTOR_APPOINTMENT_TAKEN: {
      return '#68338E'
    }
    default: {
      return 'default'
    }
  }
}

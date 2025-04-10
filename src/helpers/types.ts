export enum PatientsTagsEnum {
  UNINVITED = 'Uninvited',
  WELCOMED = 'Welcome mail sent',
  QUESTIONNAIRE_SENT = 'Questionnaire Sent',
  RESPONSE_RECEIVED = 'Response Received',
  NURSE_APPOINTMENT_TAKEN = 'Nurse Appointment Taken',
  DOCTOR_APPOINTMENT_TAKEN = 'Doctor Appointment Taken',
}

export const allPatientsTagsEnum = [
  PatientsTagsEnum.UNINVITED,
  PatientsTagsEnum.WELCOMED,
  PatientsTagsEnum.QUESTIONNAIRE_SENT,
  PatientsTagsEnum.RESPONSE_RECEIVED,
  PatientsTagsEnum.NURSE_APPOINTMENT_TAKEN,
  PatientsTagsEnum.DOCTOR_APPOINTMENT_TAKEN,
]

export enum PatientsLanguagesEnum {
  NL = 'Nederlands',
  FR = 'Français',
  EN = 'English',
}

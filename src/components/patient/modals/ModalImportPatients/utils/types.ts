export type UploadedPatientType = {
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string | null
  birthSex: string // M || F
  language: string
  statusTags: string
  streetAddress: string
  postalAddress: string
}

export enum UploadedPatientsTableTitlesEnum {
  FIRST_NAME = 'First Name',
  LAST_NAME = 'Last Name',
  EMAIL = 'Email',
  DATE_OF_BIRTH = 'Date of birth',
  BIRTH_SEX = 'Sex at birth',
  LANGUAGE = 'Language',
  STATUS_TAGS = 'Status Tags',
  STREET_ADDRESS = 'Address: Street, House number',
  POSTAL_ADDRESS = 'Address: Postal Code, City',
}

export enum UploadedPatientsTableKeysEnum {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  DATE_OF_BIRTH = 'dateOfBirth',
  BIRTH_SEX = 'birthSex',
  LANGUAGE = 'language',
  STATUS_TAGS = 'statusTags',
  STREET_ADDRESS = 'streetAddress',
  POSTAL_ADDRESS = 'postalAddress',
}

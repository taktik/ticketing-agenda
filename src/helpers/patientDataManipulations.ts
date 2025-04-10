import { AddressType, CodeStub, DecryptedPatient, PersonNameUse, TelecomType } from '@icure/cardinal-sdk'
import dayjs from 'dayjs'
import { DATE_FORMAT_TO_DISPLAY } from '../constants'
import { getAge } from './dateFormaters'

export interface PatientFormated {
  id: string
  firstName?: string
  lastName?: string
  dateOfBirth?: number
  birthSex?: string
  language?: string
  phoneNumber?: string
  emailAddress?: string
  country?: string
  city?: string
  street?: string
  houseNumber?: string
  postalCode?: string
  homeAddressString?: string
  userNameOneString?: string
  userHomeAddressOneString?: string
  userDateOfBirthOneString?: string
  picture?: Int8Array
  tags: CodeStub[]
  age?: string
}

export const getPatientDataFormated = (patient: DecryptedPatient): PatientFormated => {
  const { id, names, firstName, lastName, dateOfBirth, addresses, birthSex, tags, picture, languages } = patient
  const getTelecomBySystem = (telecomSystem: TelecomType) => {
    const expectedAddress = addresses?.find(({ telecoms }) => telecoms.some(({ telecomType }) => telecomType === telecomSystem))
    const expectedTelecom = expectedAddress?.telecoms.find(({ telecomType }) => telecomType === telecomSystem)
    return expectedTelecom?.telecomNumber
  }
  // get username
  const officialUserNameObj = names.find((nameElement) => nameElement.use === PersonNameUse.Official)
  const userFirstName = officialUserNameObj && officialUserNameObj?.firstNames?.length !== 0 ? officialUserNameObj?.firstNames?.join(' ') : firstName
  const userLastName = officialUserNameObj?.lastName ?? lastName
  const userName = userFirstName && userLastName ? userFirstName.concat(' ', userLastName) : (userFirstName ?? userLastName)
  // get user home address
  const homeAddressObj = addresses?.find(({ addressType }) => addressType === AddressType.Home)
  const homeAddressString = [homeAddressObj?.street, homeAddressObj?.houseNumber, homeAddressObj?.postalCode, homeAddressObj?.city, homeAddressObj?.country]
    .filter((el) => !!el)
    .join(', ')
  // get users birthday
  const userDateOfBirth = dateOfBirth ? dayjs.unix(dateOfBirth).format(DATE_FORMAT_TO_DISPLAY) : '-'
  return {
    id,
    firstName: userFirstName,
    lastName: userLastName,
    dateOfBirth,
    birthSex,
    tags,
    phoneNumber: getTelecomBySystem(TelecomType.Mobile) ?? '-',
    emailAddress: getTelecomBySystem(TelecomType.Email) ?? '-',
    country: homeAddressObj?.country,
    city: homeAddressObj?.city,
    street: homeAddressObj?.street,
    houseNumber: homeAddressObj?.houseNumber,
    postalCode: homeAddressObj?.postalCode,
    userNameOneString: userName,
    userHomeAddressOneString: homeAddressString.length !== 0 ? homeAddressString : '-',
    userDateOfBirthOneString: userDateOfBirth,
    picture: picture,
    age: getAge(dateOfBirth),
    language: languages[0],
  }
}
export const splitAddressGeneric = (address: string): { nonNumericPart: string; numericPart: string } => {
  const match = address.match(/^(\d+)\s*,?\s*(.+)$|^(.+?)\s*,?\s*(\d+.*)$/)

  if (match) {
    return match[1] // If the first part is a number (postal code)
      ? { nonNumericPart: match[2].trim(), numericPart: match[1].trim() }
      : { nonNumericPart: match[3].trim(), numericPart: match[4].trim() }
  }

  return { nonNumericPart: '', numericPart: '' }
}
export const getPatientBirthDateFromImport = (date: string) => {
  // based on the DATE_FORMAT
  const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})$/
  return dateRegex.test(date) ? date : null
}

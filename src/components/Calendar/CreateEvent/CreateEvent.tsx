import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import {
  Agenda,
  CalendarItemType,
  CodeStub,
  DecryptedAddress,
  DecryptedCalendarItem,
  DecryptedPatient,
  DecryptedTelecom,
  EncryptedAddress,
  EncryptedPatient,
  EncryptedTelecom,
  PublicAgendasAndCalendarItemTypes,
  RecoveryDataKey,
  TelecomType,
  User,
} from '@icure/cardinal-sdk'
import { Button, Divider, Form, notification, Steps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { EMAIL_APPOINTMENT_CONFIRMATION, EMAIL_SENDER, MANAGE_APPOINTMENT_ROUTE } from '../../../constants'
import { useLazyGetAgendaAndProceduresQuery } from '../../../core/api/anonymousApi'
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { useSendEmailMutation } from '../../../core/api/emailApi'
import { useCreateDecryptedPatientMutation, useInitializeExchangeDataMutation, useLazyGetEncryptedPatientByIdQuery, useUpdateEncryptedPatientMutation } from '../../../core/api/patientApi'
import { useCreateExchangeDataRecoveryMutation } from '../../../core/api/recoveryApi'
import { useCreateUpdateUserMutation, useLazyGetUserByEmailQuery } from '../../../core/api/userApi'
import { usePermissions } from '../../../core/hooks/usePermissions'
import { useRoot } from '../../../core/hooks/useRoot'
import { useSites } from '../../../core/hooks/useSites'
import { ProcedureSelection, ProcedureWithTimeAndSelections, transformProceduresForSelection } from '../../../helpers/transformProcedures'
import { Lang } from '../../../helpers/types'
import { CustomModal } from '../../common/CustomModal'
import { calculateNumericEventTimes, getCodeTagById, getTranslationForEntity } from '../../common/helpers'
import { StepAppointmentReview } from './appointmentSteps/StepAppointmentReview'
import { StepCreateEventResult } from './appointmentSteps/StepCreateEventResult'
import { StepPersonalInformation } from './appointmentSteps/StepPersonalInformation'
import { StepProcedureSelector } from './appointmentSteps/StepProcedureSelector'
import { StepTimeSlotSelector } from './appointmentSteps/StepTimeSlotSelector'

const { Step } = Steps

export const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

export const appointmentDuration = (formValues: AppointmentForm, procedures: ProcedureSelection[]): number => {
  const formProcedures = formValues.procedures

  const totalDuration = formProcedures.reduce((total, currentFormProcedure) => {
    // 1. Find the main procedure group (e.g., "Demande de passeport") from the master list
    // using the ID stored in the form.
    const masterProcedure = procedures.find((p) => p.id === currentFormProcedure.procedureSelectionId)
    if (!masterProcedure) {
      return total // If not found, add nothing and move to the next item
    }

    // 2. From that group, find the specific site variant the user chose
    // using the site ID stored in the form.
    const siteVariant = masterProcedure.siteVariants.find((sv) => sv.siteId === currentFormProcedure.site)
    if (!siteVariant) {
      return total
    }

    // 3. From that site variant, find the specific attendee/quantity variant
    // using the quantity stored in the form.
    const procedureVariant = siteVariant.variants.find((pv) => pv.attendees === currentFormProcedure.quantity)
    if (!procedureVariant) {
      return total
    }

    // 4. If we successfully found the exact variant, add its duration to the running total.
    return total + (procedureVariant.duration || 0)
  }, 0)

  return totalDuration
}

export const findProcedureData = (selections: ProcedureSelection[], formProcedure: FormProcedure) => {
  if (!selections || !formProcedure.procedureSelectionId) {
    return { masterProcedure: undefined, siteVariant: undefined, procedureVariant: undefined }
  }

  const masterProcedure = selections.find((proc) => proc.id === formProcedure.procedureSelectionId)
  if (!masterProcedure) {
    return { masterProcedure: undefined, siteVariant: undefined, procedureVariant: undefined }
  }

  const siteVariant = formProcedure.site ? masterProcedure.siteVariants.find((sv) => sv.siteId === formProcedure.site) : undefined
  if (!siteVariant) {
    return { masterProcedure, siteVariant: undefined, procedureVariant: undefined }
  }

  const procedureVariant = formProcedure.quantity ? siteVariant.variants.find((pv) => pv.attendees === formProcedure.quantity) : undefined

  return { masterProcedure, siteVariant, procedureVariant }
}

export const formatDateTime = (dateForm: dayjs.Dayjs | undefined, timeForm: dayjs.Dayjs | undefined) => {
  const date = dateForm
  const time = timeForm
  if (!date || !time) return 'N/A'

  const hour = timeForm.hour()
  const minute = timeForm.minute()

  const combinedDateTime = date.hour(hour).minute(minute)

  return combinedDateTime.format('LLLL')
}

/**
 * Combines a dayjs date object and a dayjs time object into a single dayjs object.
 * @param {TimeSlot} timeslot - An object containing the date and time.
 * @returns {Dayjs | null} - A new dayjs object with the combined date and time, or null if invalid.
 */
export const combineDateAndTime = (timeslot: TimeSlot): Dayjs | null => {
  const { date, time } = timeslot

  // Check if both inputs are valid dayjs objects
  if (!date || !date.isValid() || !time || !time.isValid()) {
    console.error('Invalid date or time provided for combination.')
    return null
  }

  // Start with the date, then set the hour, minute, and second from the time object.
  // Setting seconds and milliseconds to 0 ensures consistency.
  const combinedDateTime = date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0)

  return combinedDateTime
}

const formatPhoneNumber = (countryCode?: string, phoneNumber?: string | number): string | undefined => {
  return countryCode && phoneNumber ? `${countryCode}${phoneNumber}` : undefined
}

const formatBirthDate = (date?: Date): number | undefined => {
  return date ? Number(dayjs(date).format('YYYYMMDD')) : undefined
}

const buildDecryptedContactPayload = (email: string, mobilePhone?: string) => {
  const patientEmail = new DecryptedTelecom({
    telecomType: TelecomType.Email,
    telecomNumber: email,
  })

  const patientPhone = new DecryptedTelecom({
    telecomType: TelecomType.Mobile,
    telecomNumber: mobilePhone,
  })

  const patientAddress = new DecryptedAddress({
    telecoms: [patientEmail, patientPhone],
  })

  return { patientAddress, patientEmail, patientPhone }
}

const buildEncryptedContactPayload = (email: string, mobilePhone?: string) => {
  const patientEmail = new EncryptedTelecom({
    telecomType: TelecomType.Email,
    telecomNumber: email,
  })

  const patientPhone = new EncryptedTelecom({
    telecomType: TelecomType.Mobile,
    telecomNumber: mobilePhone,
  })

  const patientAddress = new EncryptedAddress({
    telecoms: [patientEmail, patientPhone],
  })

  return { patientAddress, patientEmail, patientPhone }
}

export interface FormProcedure {
  procedureSelectionId: string
  site: string
  quantity: number
}

interface PersonalInfo {
  firstName: string
  lastName: string
  phoneNumber: number
  countryCode: string
  language: string
  birthDate: Date
  email: string
}

interface TimeSlot {
  date: Dayjs
  time: dayjs.Dayjs
}

export interface AppointmentForm {
  procedures: FormProcedure[]
  timeslot: TimeSlot
  personalInfo: PersonalInfo
}

interface CreateEventProps {
  isVisible: boolean
  onClose: () => void
}
interface CitizenInputData {
  email: string
  firstName: string
  lastName: string
  language: string
  mobilePhone?: string
  dateOfBirth?: number
}

enum AppointmentStep {
  PROCEDURE = 0,
  TIMESLOT = 1,
  PERSONAL_INFO = 2,
  REVIEW = 3,
  RESULT = 4,
}

export const CreateEvent = ({ isVisible, onClose }: CreateEventProps) => {
  const { t } = useTranslation()
  const [creationStatus, setCreationStatus] = useState<'loading' | 'success' | 'failure' | null>(null)
  const [currentStep, setCurrentStep] = useState<AppointmentStep>(AppointmentStep.PROCEDURE)
  const [allAgendas, setAllAgendas] = useState<Agenda[]>([])
  const [allProcedures, setAllProcedures] = useState<CalendarItemType[]>([])
  const [isLoadingAgendasAndProcedures, setIsLoadingAgendasAndProcedures] = useState(false)
  const [form] = Form.useForm<AppointmentForm>()
  const formValues: AppointmentForm = form.getFieldsValue(true)

  const [getUserByMailLazy] = useLazyGetUserByEmailQuery()
  const [getPatientByIdLazy] = useLazyGetEncryptedPatientByIdQuery()
  const [createUpdateUser] = useCreateUpdateUserMutation()
  const [createDecryptedPatient] = useCreateDecryptedPatientMutation()
  const [updateEncryptedPatient] = useUpdateEncryptedPatientMutation()
  const [createUpdateEvent] = useCreateUpdateCalendarItemMutation()
  const [initializePatientExchangeDatas] = useInitializeExchangeDataMutation()
  const [createRecoveryDataKey] = useCreateExchangeDataRecoveryMutation()
  const [sendConfirmationEmail] = useSendEmailMutation()
  const [getAgendasAndProcedures] = useLazyGetAgendaAndProceduresQuery()

  const watchedProcedures = Form.useWatch('procedures', form)
  const watchedSelectedTime = Form.useWatch(['timeslot', 'time'], form)
  const watchedPersonalInfo = Form.useWatch('personalInfo', form)

  const { adminRoot, siteRoot, isAdminRootLoading, isSiteRootLoading } = useRoot()
  const { dataOwnerId } = usePermissions()

  const { sites } = useSites()
  const siteIds = useMemo(() => (sites ?? []).map((site) => site.id), [sites])
  const stableIdsFingerprint = siteIds.sort().join(',')

  useEffect(() => {
    const fetchAllAgendas = async () => {
      setIsLoadingAgendasAndProcedures(true)

      const promises = siteIds.map(async (siteId) => {
        const res = await getAgendasAndProcedures({
          propertyId: 'SERVICE|PARENTID',
          propertyValue: siteId,
        })
          .unwrap()
          .catch(() => null)
        return res
      })

      const results = await Promise.all(promises)
      const successfulFetches = results.filter((result): result is PublicAgendasAndCalendarItemTypes => result !== null)

      const flattenedAgendas = successfulFetches.flatMap((fetch) => fetch.agendas ?? [])
      const flattenedProcedures = successfulFetches.flatMap((fetch) => fetch.calendarItemTypes ?? [])

      setAllAgendas(flattenedAgendas)
      setAllProcedures(flattenedProcedures)
      setIsLoadingAgendasAndProcedures(false)
    }

    fetchAllAgendas()
  }, [stableIdsFingerprint, getAgendasAndProcedures])

  const selections = useMemo(() => transformProceduresForSelection(allProcedures, allAgendas, sites ?? []), [allProcedures, allAgendas, sites])
  const isLoading = useMemo(() => isLoadingAgendasAndProcedures || isSiteRootLoading || isAdminRootLoading, [isLoadingAgendasAndProcedures, isSiteRootLoading, isAdminRootLoading])

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const steps = [
    { title: t('content.procedure'), icon: <ToolOutlined /> },
    { title: t('content.date_and_time'), icon: <CalendarOutlined /> },
    { title: t('content.your_info'), icon: <UserOutlined /> },
    { title: t('content.confirm'), icon: <CheckCircleOutlined /> },
  ]

  const handleNewCitizenFlow = useCallback(
    async (userData: CitizenInputData) => {
      const patientId = v4()
      const { patientAddress } = buildDecryptedContactPayload(userData.email, userData.mobilePhone)

      const newPatientPayload = new DecryptedPatient({
        id: patientId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        languages: [userData.language],
        dateOfBirth: userData.dateOfBirth,
        addresses: [patientAddress],
      })

      const citizenPatient = await createDecryptedPatient(newPatientPayload).unwrap()
      if (!citizenPatient) throw new Error('Failed to create patient.')

      const newUserPayload = new User({
        id: v4(),
        patientId,
        mobilePhone: userData.mobilePhone,
        email: userData.email,
        login: userData.email,
        name: `${userData.firstName.trim()} ${userData.lastName.trim()}`,
      })

      const citizenUser = await createUpdateUser(newUserPayload).unwrap()
      if (!citizenUser) throw new Error('Failed to create user.')

      return { citizenUser, citizenPatient }
    },
    [createDecryptedPatient, createUpdateUser],
  )

  const handleExistingCitizenFlow = useCallback(
    async (patientUser: User, userData: CitizenInputData) => {
      let citizenUser = patientUser

      if (userData.mobilePhone && userData.mobilePhone !== citizenUser.mobilePhone) {
        const updatedUser = await createUpdateUser(new User({ ...citizenUser, mobilePhone: userData.mobilePhone })).unwrap()
        if (!updatedUser) throw new Error('Failed to update phone.')
        citizenUser = updatedUser
      }

      let foundPatient: EncryptedPatient | undefined
      if (citizenUser.patientId) {
        const result = await getPatientByIdLazy(citizenUser.patientId)
        foundPatient = result.data
      }

      let citizenPatient: EncryptedPatient | DecryptedPatient

      if (foundPatient) {
        const existingPatient = new EncryptedPatient({ ...foundPatient })
        citizenPatient = existingPatient

        const { patientAddress } = buildEncryptedContactPayload(userData.email, userData.mobilePhone)

        const hasLanguageChanged = userData.language && userData.language !== (existingPatient.languages?.[0] || '')
        const hasBirthDateChanged = userData.dateOfBirth && userData.dateOfBirth !== existingPatient.dateOfBirth
        const needsNameUpdate = !existingPatient.firstName
        const hasContactChanged = (userData.mobilePhone && userData.mobilePhone !== citizenUser.mobilePhone) || userData.email !== citizenUser.email

        if (hasLanguageChanged || hasBirthDateChanged || needsNameUpdate || hasContactChanged) {
          const updatePayload = new EncryptedPatient({
            ...existingPatient,
            languages: hasLanguageChanged ? [userData.language] : existingPatient.languages,
            dateOfBirth: hasBirthDateChanged ? userData.dateOfBirth : existingPatient.dateOfBirth,
            firstName: needsNameUpdate ? userData.firstName : existingPatient.firstName,
            lastName: needsNameUpdate ? userData.lastName : existingPatient.lastName,
            addresses: hasContactChanged ? [patientAddress] : existingPatient.addresses,
          })

          const updated = await updateEncryptedPatient(updatePayload).unwrap()
          if (updated) {
            citizenPatient = updated
          }
        }
      } else {
        const patientId = v4()
        const { patientAddress } = buildDecryptedContactPayload(userData.email, userData.mobilePhone)

        const newPatientPayload = new DecryptedPatient({
          id: patientId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          languages: [userData.language],
          dateOfBirth: userData.dateOfBirth,
          addresses: [patientAddress],
        })

        const createdPatientResult = await createDecryptedPatient(newPatientPayload).unwrap()

        if (!createdPatientResult) {
          throw new Error('Failed to create recovery citizen record.')
        }

        citizenPatient = createdPatientResult

        if (!citizenUser.patientId) {
          const linkedUserResult = await createUpdateUser(new User({ ...citizenUser, patientId: citizenPatient.id })).unwrap()

          if (!linkedUserResult) {
            throw new Error('Failed to link User to new Citizen.')
          }
          citizenUser = linkedUserResult
        }
      }

      return { citizenUser, citizenPatient }
    },
    [createUpdateUser, getPatientByIdLazy, updateEncryptedPatient, createDecryptedPatient],
  )

  const getOrCreateCitizenProfile = useCallback(async () => {
    const { personalInfo } = formValues

    if (!personalInfo) throw new Error('Personal information is missing.')
    const { email, countryCode, phoneNumber, language, birthDate, firstName, lastName } = personalInfo

    if (!email) throw new Error('User email is required.')
    if (!adminRoot?.id || !siteRoot?.id) throw new Error('Root info missing.')

    const normalizedData: CitizenInputData = {
      email,
      firstName,
      lastName,
      language,
      mobilePhone: formatPhoneNumber(countryCode, phoneNumber),
      dateOfBirth: formatBirthDate(birthDate),
    }

    const { data: citizenUser } = await getUserByMailLazy(email)

    if (citizenUser) {
      return handleExistingCitizenFlow(new User({ ...citizenUser }), normalizedData)
    } else {
      return handleNewCitizenFlow(normalizedData)
    }
  }, [formValues, adminRoot, siteRoot, getUserByMailLazy, handleExistingCitizenFlow, handleNewCitizenFlow])

  const createAppointments = async (citizenUser: User, citizenPatient: EncryptedPatient | DecryptedPatient) => {
    try {
      const { personalInfo, procedures, timeslot } = formValues

      if (!personalInfo) {
        throw new Error('Personal information is missing and required to create an appointment.')
      }
      if (!timeslot) {
        throw new Error('Timeslot information is missing and required to create an appointment.')
      }
      if (!citizenUser || !citizenPatient?.id) {
        throw new Error('Could not retrieve or create a valid user/patient profile.')
      }
      if (!adminRoot?.id || !siteRoot?.id) {
        throw new Error('Required root or site information missing. Cannot proceed.')
      }

      let currentStartTime = combineDateAndTime(timeslot)

      if (!currentStartTime) {
        throw new Error('Timeslot information is missing and required to create an appointment.')
      }

      const proceduresWithTime: ProcedureWithTimeAndSelections[] = []

      for (const item of procedures) {
        const { procedureVariant, masterProcedure, siteVariant } = findProcedureData(selections, {
          procedureSelectionId: item.procedureSelectionId,
          site: item.site,
          quantity: item.quantity,
        })

        if (!procedureVariant) {
          throw new Error(`Procedure data for ${item.procedureSelectionId} is incomplete. Cannot calculate times.`)
        }

        const durationInMinutes = procedureVariant.duration
        const numericTimes = calculateNumericEventTimes(currentStartTime, durationInMinutes)
        if (!numericTimes) {
          throw new Error(`Failed to calculate numeric time for procedure ${item.procedureSelectionId}`)
        }

        proceduresWithTime.push({
          procedure: item,
          specificTimeslot: numericTimes,
          masterProcedure: masterProcedure,
          siteVariant: siteVariant,
          procedureVariant: procedureVariant,
        })

        currentStartTime = currentStartTime.add(durationInMinutes, 'minute')
      }

      const eventsCreationPromises = proceduresWithTime.map(async (procWithTime) => {
        const { procedure: item, specificTimeslot: eventTimes, masterProcedure, siteVariant, procedureVariant } = procWithTime

        if (!masterProcedure || !siteVariant || !procedureVariant) {
          throw new Error(`Procedure data for selection ID ${item.procedureSelectionId} is incomplete.`)
        }

        const newEvent = new DecryptedCalendarItem({
          id: v4(),
          patientId: citizenPatient.id,
          title: masterProcedure.displayText,
          calendarItemTypeId: procedureVariant.procedureId,
          duration: procedureVariant.duration,
          agendaId: siteVariant.agendaId,
          phoneNumber: personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined,
          startTime: eventTimes?.startTime,
          endTime: eventTimes?.endTime,
          addressText: siteVariant.siteLocation,
          tags: [
            new CodeStub({ id: 'APPOINTMENT', code: item.procedureSelectionId, type: 'APPOINTMENT', version: '1' }),
            new CodeStub({ id: 'APPOINTMENT|QBETTER_SERVICE_ID', code: masterProcedure.procedureQbetterServiceId, type: 'APPOINTMENT|QBETTER_SERVICE_ID', version: '1' }),
            new CodeStub({ id: 'APPOINTMENT|QBETTER_LOCATION_ID', code: siteVariant.siteQbetterLocationId, type: 'APPOINTMENT|QBETTER_LOCATION_ID', version: '1' }),
          ],
        })

        return createUpdateEvent({ calendarItem: newEvent, patient: citizenPatient, delegates: { adminRootId: adminRoot.id, siteRootId: siteRoot.id } }).unwrap()
      })
      const results = await Promise.allSettled(eventsCreationPromises)

      const successfulItems = results.filter((result): result is PromiseFulfilledResult<DecryptedCalendarItem> => result.status === 'fulfilled' && result.value !== undefined).map((result) => result.value)

      return successfulItems
    } catch (error: unknown) {
      console.error('An error occurred during appointment creation:', error)
      openNotification('error', t('validation.unexpected_error'), error instanceof Error ? error.message : 'An unknown error occurred.')
      return []
    }
  }

  const computeUrl = useCallback((recoveryDataKey: RecoveryDataKey, delegateId: string, calendarItemId: string | undefined) => {
    const path = MANAGE_APPOINTMENT_ROUTE
    const params = new URLSearchParams()
    const recoveryPayload = {
      delegateId: delegateId,
      recoveryKey: recoveryDataKey.asHexString(),
    }
    params.append('recoveryData', JSON.stringify(recoveryPayload))
    if (calendarItemId) {
      params.append('calendarItemId', calendarItemId)
    }
    return `${path}?${params.toString()}`
  }, [])

  const computeEmailPayload = useCallback(
    (
      recoveryDataKey: RecoveryDataKey,
      citizenUser: User,
      citizenPatient: EncryptedPatient | DecryptedPatient,
      serviceName: string,
      procedureName: string,
      specificTimeslot: {
        start: dayjs.Dayjs
        end: dayjs.Dayjs
      },
      siteLocation: string,
      lang: string,
      procedureDetails: string,
      currentHcpId: string,
      calendarItemId: string | undefined,
    ) => {
      const dateFormat = specificTimeslot.start.format('DD/MM/YYYY')
      const heureFormat = `${specificTimeslot.start.format('HH[h]mm')} - ${specificTimeslot.end.format('HH[h]mm')}`
      const url = computeUrl(recoveryDataKey, currentHcpId, calendarItemId)

      const hasProcedure = !!procedureDetails?.trim()
      const safeLang: Lang = lang === 'nl' ? 'nl' : 'fr'
      const processId = EMAIL_APPOINTMENT_CONFIRMATION[safeLang][hasProcedure ? 'withProcedureDetails' : 'withoutProcedureDetails']

      return {
        receiver: citizenUser.email!,
        from: EMAIL_SENDER,
        processId: processId,
        cc: [],
        bcc: [],
        variables: {
          firstName: citizenPatient.firstName,
          lastName: citizenPatient.lastName,
          email: citizenUser.email,
          mobilePhone: citizenUser.mobilePhone,
          service: serviceName,
          procedure: procedureName,
          date: dateFormat,
          time: heureFormat,
          location: siteLocation,
          url: url,
          procedureDetails: procedureDetails,
        },
      }
    },
    [computeUrl],
  )

  const sendEmails = useCallback(
    async (recoveryDataKey: RecoveryDataKey | undefined, citizenUser: User, citizenPatient: EncryptedPatient | DecryptedPatient, currentHcpId: string, calendarItems: DecryptedCalendarItem[]) => {
      try {
        if (!recoveryDataKey) throw new Error('No valid recoveryDataKey')
        if (!citizenUser.email) throw new Error('No valid email')
        const { procedures, timeslot } = formValues

        let currentStartTime = combineDateAndTime(timeslot)

        if (!currentStartTime) {
          throw new Error('Timeslot information is missing and required to send an email.')
        }

        for (const procedure of procedures) {
          const calendarItem = calendarItems.find((ci) => {
            const formProcedureSelectionId = procedure.procedureSelectionId
            const calendarItemSelectionId = getCodeTagById(ci.tags, 'APPOINTMENT')
            return formProcedureSelectionId === calendarItemSelectionId
          })
          const { masterProcedure, siteVariant, procedureVariant } = findProcedureData(selections, {
            procedureSelectionId: procedure.procedureSelectionId,
            site: procedure.site,
            quantity: procedure.quantity,
          })
          if (!masterProcedure || !siteVariant || !procedureVariant) {
            return Promise.reject(new Error(`Procedure data for ${procedure.procedureSelectionId} is incomplete.`))
          }
          const durationInMinutes = procedureVariant.duration
          const endTime = currentStartTime.add(durationInMinutes, 'minute')
          const specificTimeslot = {
            start: currentStartTime,
            end: endTime,
          }
          const appointmentService = allAgendas.find((agenda) => agenda.id === siteVariant.agendaId)
          const appointmentProcedure = (allProcedures ?? []).flat().find((procedure) => procedure.id === procedureVariant.procedureId)

          const lang = citizenPatient.languages[0] === 'Néerlandais' ? 'nl' : 'fr'

          const serviceName = getTranslationForEntity(appointmentService?.properties, 'SERVICE', lang) || masterProcedure.serviceName
          const procedureName = getTranslationForEntity(appointmentProcedure?.publicProperties, 'CALENDARITEMTYPE', lang) || masterProcedure.procedureName
          const siteLocation = siteVariant.siteLocation

          const emailPayload = computeEmailPayload(
            recoveryDataKey,
            citizenUser,
            citizenPatient,
            serviceName,
            procedureName,
            specificTimeslot,
            siteLocation,
            lang,
            siteVariant.procedureDetails,
            currentHcpId,
            calendarItem?.id,
          )
          await sendConfirmationEmail(emailPayload)
          currentStartTime = currentStartTime.add(durationInMinutes, 'minute')
        }
      } catch (emailError) {
        console.error(console.error(`Failed to send confirmation email for appt: `, emailError))
      }
    },
    [formValues, selections, computeEmailPayload, sendConfirmationEmail, allAgendas, allProcedures],
  )

  const next = useCallback(async () => {
    try {
      await form.validateFields()
      setCurrentStep((prevStep) => prevStep + 1)
    } catch (err) {
      openNotification('error', t('content.complete_required_fields'), '')
    }
  }, [form, t, setCurrentStep, openNotification])

  const prev = useCallback(() => setCurrentStep((prevStep) => prevStep - 1), [setCurrentStep])

  const reset = useCallback(() => {
    setCurrentStep(0)
    form.resetFields()
    form.setFieldsValue({ procedures: [{ procedureSelectionId: undefined, quantity: 1 }] })
    onClose()
  }, [setCurrentStep, form, onClose])

  const handleAppointmentCreation = useCallback(async () => {
    try {
      setCreationStatus('loading')
      setCurrentStep((prevStep) => prevStep + 1)
      if (!dataOwnerId) throw new Error('No valid delegateId')
      await form.validateFields()
      const { citizenUser, citizenPatient } = await getOrCreateCitizenProfile()
      await initializePatientExchangeDatas(citizenPatient.id).unwrap()
      const calendarItems = await createAppointments(citizenUser, citizenPatient)
      if (!calendarItems || calendarItems.length === 0) {
        throw new Error('No appointments were created.')
      }
      const recoveryDataKey = await createRecoveryDataKey(citizenPatient.id).unwrap()
      if (!recoveryDataKey) {
        throw new Error('no valid exchange data.')
      }
      await sendEmails(recoveryDataKey, citizenUser, citizenPatient, dataOwnerId, calendarItems)
      setCreationStatus('success')
    } catch (err) {
      setCreationStatus('failure')
      openNotification('error', t('content.complete_required_fields'), '')
    }
  }, [form, createAppointments, openNotification, getOrCreateCitizenProfile, t, dataOwnerId])

  const stepContent = [
    <StepProcedureSelector selections={selections} isProcedureLoading={isLoading} form={form} key={'procedureStep'} />,
    <StepTimeSlotSelector form={form} formProcedure={formValues.procedures} selections={selections} key={'TimeStep'} />,
    <StepPersonalInformation key={'InformationStep'} />,
    <StepAppointmentReview formValues={form.getFieldsValue(true)} selections={selections} key={'reviewStep'} />,
    <StepCreateEventResult creationStatus={creationStatus} key={'resultStep'} />,
  ]

  const initialFormValues = {
    timeslot: {
      date: dayjs(),
      time: undefined,
    },
    personalInfo: {
      countryCode: '+32',
      language: 'Français',
      birthDate: dayjs(),
    },
  }

  const disabledRules = [!watchedProcedures || watchedProcedures.length === 0 || !watchedProcedures.every((p) => p && p.procedureSelectionId), !watchedSelectedTime]
  const isNextButtonDisabled = disabledRules[currentStep] ?? false

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={1100}>
      <div style={{ width: '100%', padding: '1.5rem' }}>
        {notificationContextHolder}
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} icon={item.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical" initialValues={initialFormValues}>
          <div style={{ minHeight: '350px' }}>{stepContent[currentStep]}</div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > AppointmentStep.PROCEDURE && currentStep < AppointmentStep.RESULT && (
                <Button size="large" onClick={prev}>
                  {t('content.previous')}
                </Button>
              )}
            </div>
            <div>
              {currentStep < AppointmentStep.REVIEW && (
                <Button size="large" type="primary" onClick={next} disabled={isNextButtonDisabled}>
                  {t('content.next')}
                </Button>
              )}
              {currentStep === AppointmentStep.REVIEW && (
                <Button size="large" type="primary" onClick={handleAppointmentCreation}>
                  {t('content.confirm_booking_button')}
                </Button>
              )}
              {currentStep === AppointmentStep.RESULT && (
                <Button size="large" type="primary" onClick={reset}>
                  {t('content.close')}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

import { Agenda, CalendarItemType } from '@icure/cardinal-sdk'
import dayjs, { Dayjs } from 'dayjs'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { v4 } from 'uuid'
import { AppointmentDraft, PersonalInfo, ProcedureGroup, TimeSlot } from '../../types/citizenReservationTypes'
import { dayjsToYYYYMMDDHHmmss } from '../../components/common/helpers'
import { useLazyGetAgendaAndProceduresQuery, useLazyGetAvailabilitiesQuery } from '../../core/api/anonymousApi'
import { transformProceduresForSelection } from '../../helpers/transformProcedures'
import { PropertyId } from '../api/fetchType'
import { useHierarchyContext } from './HierarchyContext'

interface ProcessedAvailabilities {
  availabilityList: Dayjs[]
  procedureDuration: number
}

interface CitizenReservationContextType {
  isLoadingData: boolean
  availableProcedures: ProcedureGroup[]
  drafts: AppointmentDraft[]
  timeSlot: TimeSlot | undefined
  personalInfo: PersonalInfo | undefined
  availabilities: Dayjs[]
  isAvailabilitiesLoading: boolean
  totalDuration: number
  isValidProcedureStep: boolean
  addDraft: () => void
  removeDraft: (tempId: string) => void
  updateDraft: (tempId: string, updates: Partial<AppointmentDraft>) => void
  setTimeSlot: (slot: TimeSlot | undefined) => void
  setPersonalInfo: (info: PersonalInfo) => void
  fetchAvailabilitiesForMonth: (month: Dayjs) => Promise<void>
  resetReservation: () => void
}

const CitizenReservationContext = createContext<CitizenReservationContextType>({} as CitizenReservationContextType)

export const CitizenReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { allSites } = useHierarchyContext()

  const siteIdsFingerprint = useMemo(
    () =>
      allSites
        .map((s) => s.id)
        .sort()
        .join(','),
    [allSites],
  )

  const [triggerFetch] = useLazyGetAgendaAndProceduresQuery()
  const [triggerAvailabilityFetch] = useLazyGetAvailabilitiesQuery()

  const [rawAgendas, setRawAgendas] = useState<Agenda[]>([])
  const [rawProcedures, setRawProcedures] = useState<CalendarItemType[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!siteIdsFingerprint) {
      setIsLoadingData(false)
      return
    }

    const fetchData = async () => {
      setIsLoadingData(true)
      const siteIds = siteIdsFingerprint.split(',').filter(Boolean)

      const promises = siteIds.map((id) =>
        triggerFetch({ propertyId: PropertyId.SERVICE_PARENTID, propertyValue: id })
          .unwrap()
          .catch(() => null),
      )

      const results = await Promise.all(promises)
      const validResults = results.filter((r) => r !== null)

      setRawAgendas(validResults.flatMap((r) => r?.agendas || []))
      setRawProcedures(validResults.flatMap((r) => r?.calendarItemTypes || []))
      setIsLoadingData(false)
    }

    fetchData()
  }, [siteIdsFingerprint, triggerFetch])

  const availableProcedures = useMemo(() => {
    if (!allSites || isLoadingData) return []
    return transformProceduresForSelection(rawProcedures, rawAgendas, allSites)
  }, [rawProcedures, rawAgendas, allSites, isLoadingData])

  const [drafts, setDrafts] = useState<AppointmentDraft[]>([
    {
      tempId: v4(),
      quantity: 1,
      procedureGroupId: undefined,
      siteVariantId: undefined,
      procedureVariantId: undefined,
    },
  ])
  const [timeSlot, setTimeSlot] = useState<TimeSlot>()
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>()

  const [availabilities, setAvailabilities] = useState<Dayjs[]>([])
  const [isAvailabilitiesLoading, setIsAvailabilitiesLoading] = useState(false)

  const findConsecutiveSlots = useCallback((processedAvailabilities: ProcessedAvailabilities[]): Dayjs[] => {
    if (!processedAvailabilities || processedAvailabilities.length === 0) return []

    const allProcedureIntervals = processedAvailabilities.map((proc) => {
      const slotsNeeded = proc.procedureDuration / 5
      const intervals = new Set<number>()
      proc.availabilityList.forEach((startSlot) => {
        for (let i = 0; i < slotsNeeded; i++) {
          intervals.add(startSlot.add(i * 5, 'minutes').valueOf())
        }
      })
      return intervals
    })

    if (allProcedureIntervals.length === 0) return []

    let commonIntervals = new Set(allProcedureIntervals[0])
    for (let i = 1; i < allProcedureIntervals.length; i++) {
      commonIntervals = new Set(Array.from(commonIntervals).filter((timestamp) => allProcedureIntervals[i].has(timestamp)))
    }

    const totalDuration = processedAvailabilities.reduce((sum, proc) => sum + proc.procedureDuration, 0)
    const requiredConsecutiveSlots = totalDuration / 5

    if (requiredConsecutiveSlots <= 0) return []

    const validStartSlots: Dayjs[] = []
    const sortedCommonIntervals = Array.from(commonIntervals).sort()

    for (const timestamp of sortedCommonIntervals) {
      let isSequenceValid = true
      for (let i = 1; i < requiredConsecutiveSlots; i++) {
        const nextTimestamp = dayjs(timestamp)
          .add(i * 5, 'minutes')
          .valueOf()
        if (!commonIntervals.has(nextTimestamp)) {
          isSequenceValid = false
          break
        }
      }
      if (isSequenceValid) {
        validStartSlots.push(dayjs(timestamp))
      }
    }
    return validStartSlots
  }, [])

  const addDraft = useCallback(() => {
    setDrafts((prev) => [
      ...prev,
      {
        tempId: v4(),
        quantity: 1,
        procedureGroupId: undefined,
        siteVariantId: undefined,
        procedureVariantId: undefined,
      },
    ])
  }, [])

  const removeDraft = useCallback((tempId: string) => {
    setTimeSlot(undefined)
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId))
  }, [])

  const updateDraft = useCallback(
    (tempId: string, updates: Partial<AppointmentDraft>) => {
      // Detect changes that invalidate the selected time slot before entering the updater.
      // We read drafts here so we can conditionally call setTimeSlot outside the setDrafts callback.
      const currentDraft = drafts.find((d) => d.tempId === tempId)
      const index = drafts.findIndex((d) => d.tempId === tempId)
      if (currentDraft && index === 0) {
        const procedureChanged = updates.procedureGroupId !== undefined && updates.procedureGroupId !== currentDraft.procedureGroupId
        const siteChanged = updates.siteVariantId !== undefined && updates.siteVariantId !== currentDraft.siteVariantId
        const quantityChanged = updates.quantity !== undefined && updates.quantity !== currentDraft.quantity
        if (procedureChanged || siteChanged || quantityChanged) {
          setTimeSlot(undefined)
        }
      }

      setDrafts((prev) => {
        const idx = prev.findIndex((d) => d.tempId === tempId)
        if (idx === -1) return prev

        const curr = prev[idx]
        const isMasterRow = idx === 0
        const procedureChanged = updates.procedureGroupId !== undefined && updates.procedureGroupId !== curr.procedureGroupId
        const siteChanged = updates.siteVariantId !== undefined && updates.siteVariantId !== curr.siteVariantId
        const shouldResetDependents = isMasterRow && (procedureChanged || siteChanged)

        const listToProcess = shouldResetDependents ? [curr] : prev

        return listToProcess.map((draft) => {
          if (draft.tempId !== tempId) return draft
          const next: AppointmentDraft = { ...draft, ...updates }
          const selectedGroup = availableProcedures.find((p) => p.id === next.procedureGroupId)

          if (updates.procedureGroupId && next.procedureGroupId !== draft.procedureGroupId) {
            next.siteVariantId = updates.siteVariantId
            next.quantity = 1
            next.site = undefined
            next.agenda = undefined
            next.calendarItemType = undefined
            next.duration = undefined
          }

          let siteVariant = undefined
          if (selectedGroup && next.siteVariantId) {
            siteVariant = selectedGroup.siteVariants.find((sv) => sv.id === next.siteVariantId)
          }

          if (siteVariant) {
            next.site = siteVariant.site
            next.agenda = siteVariant.agenda
          } else {
            next.site = undefined
            next.agenda = undefined
          }

          let procVariant = undefined
          if (siteVariant && next.quantity) {
            procVariant = siteVariant.procedureVariants.find((pv) => pv.attendees === next.quantity)
          }

          if (procVariant) {
            next.calendarItemType = procVariant.calendarItemType
            next.duration = procVariant.duration
          } else {
            next.calendarItemType = undefined
            next.duration = undefined
          }

          return next
        })
      })
    },
    [availableProcedures, drafts],
  )

  const fetchAvailabilitiesForMonth = useCallback(
    async (month: Dayjs) => {
      setIsAvailabilitiesLoading(true)
      try {
        const promises = drafts.map(async (draft) => {
          const agendaId = draft.agenda?.id
          const typeId = draft.calendarItemType?.id
          const duration = draft.duration

          if (!agendaId || !typeId || !duration) {
            throw new Error('Draft incomplete')
          }

          const startDate = month.startOf('month')
          const endDate = month.endOf('month')

          const results = await triggerAvailabilityFetch(
            {
              agendaId,
              calendarItemTypeId: typeId,
              startDate: dayjsToYYYYMMDDHHmmss(startDate),
              endDate: dayjsToYYYYMMDDHHmmss(endDate),
            },
            true,
          ).unwrap()

          return {
            procedureDuration: duration,
            availabilityList: results ?? [],
          } as ProcessedAvailabilities
        })

        const results = await Promise.all(promises)
        const finalList = results.length === 1 ? results[0].availabilityList : findConsecutiveSlots(results)
        setAvailabilities(finalList)
      } catch (e) {
        setAvailabilities([])
        throw e
      } finally {
        setIsAvailabilitiesLoading(false)
      }
    },
    [drafts, triggerAvailabilityFetch, findConsecutiveSlots],
  )

  const handleSetTimeSlot = useCallback((slot: TimeSlot | undefined) => {
    setTimeSlot(slot)

    if (!slot) {
      setDrafts((prev) => prev.map((d) => ({ ...d, calculatedStartTime: undefined, calculatedEndTime: undefined })))
      return
    }

    let currentStart = slot.date.hour(slot.time.hour()).minute(slot.time.minute())

    setDrafts((prev) =>
      prev.map((d) => {
        const duration = d.duration || 15
        const end = currentStart.add(duration, 'minutes')

        const updated = {
          ...d,
          calculatedStartTime: currentStart,
          calculatedEndTime: end,
        }
        currentStart = end
        return updated
      }),
    )
  }, [])

  const totalDuration = useMemo(() => {
    return drafts.reduce((sum, draft) => sum + (draft.duration || 0), 0)
  }, [drafts])

  const isValidProcedureStep = useMemo(() => {
    return drafts.length > 0 && drafts.every((d) => !!d.calendarItemType && !!d.site && !!d.agenda)
  }, [drafts])

  const resetReservation = useCallback(() => {
    setDrafts([
      {
        tempId: v4(),
        quantity: 1,
        procedureGroupId: undefined,
        siteVariantId: undefined,
        procedureVariantId: undefined,
      },
    ])
    setTimeSlot(undefined)
    setPersonalInfo(undefined)
    setAvailabilities([])
    setIsAvailabilitiesLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      isLoadingData,
      availableProcedures,
      drafts,
      timeSlot,
      personalInfo,
      availabilities,
      isAvailabilitiesLoading,
      totalDuration,
      isValidProcedureStep,
      addDraft,
      removeDraft,
      updateDraft,
      setTimeSlot: handleSetTimeSlot,
      setPersonalInfo,
      fetchAvailabilitiesForMonth,
      resetReservation,
    }),
    [
      isLoadingData,
      availableProcedures,
      drafts,
      timeSlot,
      personalInfo,
      availabilities,
      isAvailabilitiesLoading,
      totalDuration,
      isValidProcedureStep,
      addDraft,
      removeDraft,
      updateDraft,
      handleSetTimeSlot,
      fetchAvailabilitiesForMonth,
      resetReservation,
    ],
  )

  return <CitizenReservationContext.Provider value={value}>{children}</CitizenReservationContext.Provider>
}

export const useCitizenReservation = () => useContext(CitizenReservationContext)

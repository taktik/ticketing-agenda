import { Agenda, CalendarItemType } from '@icure/cardinal-sdk'
import dayjs, { Dayjs } from 'dayjs'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { v4 } from 'uuid'
import { AppointmentDraft, PersonalInfo, ProcedureGroup, TimeSlot } from '../../components/Calendar/CreateCitizenAppointment/CitizenReservationTypes'
import { dayjsToYYYYMMDDHHmmss } from '../../components/common/helpers'
import { useLazyGetAgendaAndProceduresQuery, useLazyGetAvailabilitiesQuery } from '../../core/api/anonymousApi'
import { transformProceduresForSelection } from '../../helpers/transformProcedures'
import { useHierarchyContext } from './HierarchyContext'

interface ProcessedAvailabilities {
  availabilityList: Dayjs[]
  procedureDuration: number
}

interface CitizenReservationContextType {
  // Data
  isLoadingData: boolean
  availableProcedures: ProcedureGroup[]

  // State
  drafts: AppointmentDraft[]
  timeSlot: TimeSlot | undefined
  personalInfo: PersonalInfo | undefined

  // Availability
  availabilities: Dayjs[]
  isAvailabilitiesLoading: boolean

  // Actions
  addDraft: () => void
  removeDraft: (tempId: string) => void
  updateDraft: (tempId: string, updates: Partial<AppointmentDraft>) => void
  setTimeSlot: (slot: TimeSlot | undefined) => void
  setPersonalInfo: (info: PersonalInfo) => void
  fetchAvailabilitiesForMonth: (month: Dayjs) => Promise<void>

  // Computed
  totalDuration: number
  isValidProcedureStep: boolean
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
    if (!siteIdsFingerprint) return

    const fetchData = async () => {
      setIsLoadingData(true)
      const siteIds = siteIdsFingerprint.split(',').filter(Boolean)

      const promises = siteIds.map((id) =>
        triggerFetch({ propertyId: 'SERVICE|PARENTID', propertyValue: id })
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
  }, [rawProcedures, rawAgendas, allSites, isLoadingData, transformProceduresForSelection])

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

  // 4. Logic: Consecutive Slot Finding
  const findConsecutiveSlots = useCallback((processedAvailabilities: ProcessedAvailabilities[]): Dayjs[] => {
    if (!processedAvailabilities || processedAvailabilities.length === 0) return []

    // Map each procedure's start times to a set of ALL occupied 5-min intervals
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

    // Find intersection of all intervals (Time where everyone is free)
    let commonIntervals = new Set(allProcedureIntervals[0])
    for (let i = 1; i < allProcedureIntervals.length; i++) {
      commonIntervals = new Set(Array.from(commonIntervals).filter((timestamp) => allProcedureIntervals[i].has(timestamp)))
    }

    const totalDuration = processedAvailabilities.reduce((sum, proc) => sum + proc.procedureDuration, 0)
    const requiredConsecutiveSlots = totalDuration / 5

    if (requiredConsecutiveSlots <= 0) return []

    // Find sequences in the common intervals
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

  // 5. Actions
  const addDraft = useCallback(() => {
    // We add an empty draft. The UI (ProcedureRow) handles filtering based on the first draft's site.
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
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId))
  }, [])

  const updateDraft = useCallback(
    (tempId: string, updates: Partial<AppointmentDraft>) => {
      setDrafts((prev) => {
        const index = prev.findIndex((d) => d.tempId === tempId)
        if (index === -1) return prev

        const currentDraft = prev[index]

        // --- 1. Master Reset Check ---
        // If we are updating Row 0, we must wipe subsequent drafts if:
        // A. The Procedure Group changes (New procedure type)
        // B. The Site Variant changes (New Service/Agenda)
        const isMasterRow = index === 0

        const procedureChanged = updates.procedureGroupId !== undefined && updates.procedureGroupId !== currentDraft.procedureGroupId

        const siteChanged = updates.siteVariantId !== undefined && updates.siteVariantId !== currentDraft.siteVariantId

        const shouldResetDependents = isMasterRow && (procedureChanged || siteChanged)

        // If resetting, we keep ONLY the first draft (which we are about to update).
        // Otherwise, we keep the whole list.
        const listToProcess = shouldResetDependents ? [currentDraft] : prev

        return listToProcess.map((draft) => {
          // Only modify the specific draft we are targeting
          if (draft.tempId !== tempId) return draft

          // --- 2. Merge Updates ---
          const next: AppointmentDraft = { ...draft, ...updates }

          // --- 3. Hydration & Reset Logic ---

          // A. Resolve Procedure Group
          const selectedGroup = availableProcedures.find((p) => p.id === next.procedureGroupId)

          // If Group has changed, we must reset all downstream selections for THIS draft
          if (updates.procedureGroupId && next.procedureGroupId !== draft.procedureGroupId) {
            next.siteVariantId = updates.siteVariantId
            next.quantity = 1
            next.site = undefined
            next.agenda = undefined
            next.calendarItemType = undefined
            next.duration = undefined
          }

          // B. Resolve Site Variant
          let siteVariant = undefined
          if (selectedGroup && next.siteVariantId) {
            siteVariant = selectedGroup.siteVariants.find((sv) => sv.id === next.siteVariantId)
          }

          // Populate Site & Agenda Objects
          if (siteVariant) {
            next.site = siteVariant.site
            next.agenda = siteVariant.agenda
          } else {
            next.site = undefined
            next.agenda = undefined
          }

          // C. Resolve Procedure Variant (Driven by QUANTITY)
          let procVariant = undefined
          if (siteVariant && next.quantity) {
            // Find the variant that matches the selected number of attendees
            procVariant = siteVariant.procedureVariants.find((pv) => pv.attendees === next.quantity)
          }

          // Populate CalendarItemType & Duration
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
    [availableProcedures],
  )

  // 6. Availability Fetcher
  const fetchAvailabilitiesForMonth = useCallback(
    async (month: Dayjs) => {
      setIsAvailabilitiesLoading(true)
      try {
        const promises = drafts.map(async (draft) => {
          // We rely on the hydrated objects
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

        // If we have multiple drafts, we must find the intersection
        const finalList = results.length === 1 ? results[0].availabilityList : findConsecutiveSlots(results)

        setAvailabilities(finalList)
      } catch (e) {
        setAvailabilities([])
      } finally {
        setIsAvailabilitiesLoading(false)
      }
    },
    [drafts, triggerAvailabilityFetch, findConsecutiveSlots],
  )

  // 7. Time Slot Setter (Computes start/end for each draft)
  const handleSetTimeSlot = useCallback((slot: TimeSlot | undefined) => {
    setTimeSlot(slot)

    if (!slot) {
      setDrafts((prev) => prev.map((d) => ({ ...d, calculatedStartTime: undefined, calculatedEndTime: undefined })))
      return
    }

    // Assign sequential times
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

        currentStart = end // Move start pointer for next draft
        return updated
      }),
    )
  }, [])

  // 8. Computed
  const totalDuration = useMemo(() => {
    return drafts.reduce((sum, draft) => sum + (draft.duration || 0), 0)
  }, [drafts])

  const isValidProcedureStep = useMemo(() => {
    // Valid if we have at least one draft, and ALL drafts have fully resolved objects
    return drafts.length > 0 && drafts.every((d) => !!d.calendarItemType && !!d.site && !!d.agenda)
  }, [drafts])

  const value = useMemo(
    () => ({
      isLoadingData,
      availableProcedures,
      drafts,
      timeSlot,
      personalInfo,
      availabilities,
      isAvailabilitiesLoading,
      addDraft,
      removeDraft,
      updateDraft,
      setTimeSlot: handleSetTimeSlot,
      setPersonalInfo,
      fetchAvailabilitiesForMonth,
      totalDuration,
      isValidProcedureStep,
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
    ],
  )

  return <CitizenReservationContext.Provider value={value}>{children}</CitizenReservationContext.Provider>
}

export const useCitizenReservation = () => useContext(CitizenReservationContext)

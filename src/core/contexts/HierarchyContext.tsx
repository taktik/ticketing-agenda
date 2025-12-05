import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import React, { createContext, useContext, useMemo } from 'react'
import { useGetAgendasByAuthorIds } from '../api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../api/calendarItemTypeApi' // Assuming this is the name of your generated hook
import { HcpTag } from '../api/fetchType'
import { useGetHealthcarePartyByTagQuery, useGetRootHealthcareParty } from '../api/healthcarePartyApi'
import { useAppSelector } from '../hooks'

interface HierarchyContextType {
  siteRoot: HealthcareParty | undefined
  adminRoot: HealthcareParty | undefined
  allSites: HealthcareParty[]
  allAgendas: Agenda[]
  allCalendarItemTypes: CalendarItemType[]
  agendasBySiteId: Map<string, Agenda[]>
  calendarItemTypesByAgendaId: Map<string, CalendarItemType[]>
  agendaMap: Map<string, Agenda>
  isLoading: boolean
}

const HierarchyContext = createContext<HierarchyContextType>({} as HierarchyContextType)

export const HierarchyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  // ------------------------------------------------------------------
  // Fetch Roots
  // ------------------------------------------------------------------
  const { data: siteRoot, isLoading: isSiteRootLoading } = useGetRootHealthcareParty({ rootType: HcpTag.SITE_ROOT, skip })
  const { data: adminRoot, isLoading: isAdminRootLoading } = useGetRootHealthcareParty({ rootType: HcpTag.ADMIN_ROOT, skip })

  // ------------------------------------------------------------------
  // Fetch Sites
  // ------------------------------------------------------------------
  const { data: sitesData, isLoading: isSitesLoading } = useGetHealthcarePartyByTagQuery(HcpTag.SITE, { skip })
  const siteIds = useMemo(() => sitesData?.map((s) => s.id) ?? [], [sitesData])

  // ------------------------------------------------------------------
  // Fetch Agendas
  // ------------------------------------------------------------------
  const { data: agendasData, isLoading: isAgendasLoading } = useGetAgendasByAuthorIds({ authorIds: siteIds, skip: siteIds.length === 0 || skip })
  const agendaIds = useMemo(() => agendasData?.map((a) => a.id) ?? [], [agendasData])

  // ------------------------------------------------------------------
  // Fetch CalendarItemTypes
  // ------------------------------------------------------------------
  const { data: itemTypesArrays, isLoading: isTypesLoading } = useGetCalendarItemTypesForMultipleAgendasQuery(agendaIds, { skip: agendaIds.length === 0 || skip })

  // ------------------------------------------------------------------
  // Process, Sort, and Map
  // ------------------------------------------------------------------
  const HierarchyData = useMemo(() => {
    const sortByName = (a: { name?: string }, b: { name?: string }) => (a.name ?? '').localeCompare(b.name ?? '')

    const sortedSites = [...(sitesData ?? [])].sort(sortByName)
    const sortedAgendas = [...(agendasData ?? [])].sort(sortByName)
    const sortedCalendarItemTypes = (itemTypesArrays?.flat() ?? []).sort(sortByName)

    const agendasBySiteId = new Map<string, Agenda[]>()
    const agendaMap = new Map<string, Agenda>()
    const calendarItemTypesByAgendaId = new Map<string, CalendarItemType[]>()

    sortedAgendas.forEach((agenda) => {
      agendaMap.set(agenda.id, agenda)
      if (agenda.author) {
        const existing = agendasBySiteId.get(agenda.author) || []
        agendasBySiteId.set(agenda.author, [...existing, agenda])
      }
    })

    sortedCalendarItemTypes.forEach((type) => {
      if (type.agendaId) {
        const existing = calendarItemTypesByAgendaId.get(type.agendaId) || []
        calendarItemTypesByAgendaId.set(type.agendaId, [...existing, type])
      }
    })

    const isLoading = isSiteRootLoading || isAdminRootLoading || isSitesLoading || isAgendasLoading || isTypesLoading

    return {
      siteRoot,
      adminRoot,
      allSites: sortedSites,
      allAgendas: sortedAgendas,
      allCalendarItemTypes: sortedCalendarItemTypes,
      agendasBySiteId,
      calendarItemTypesByAgendaId,
      agendaMap,
      isLoading: isLoading,
    }
  }, [sitesData, agendasData, itemTypesArrays, isSitesLoading, isAgendasLoading, isTypesLoading, isSiteRootLoading, isAdminRootLoading])

  return <HierarchyContext.Provider value={HierarchyData}>{children}</HierarchyContext.Provider>
}

export const useHierarchyContext = () => useContext(HierarchyContext)

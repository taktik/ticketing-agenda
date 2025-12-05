import { Agenda, HealthcareParty } from '@icure/cardinal-sdk'
import React, { createContext, useContext, useMemo } from 'react'
import { useGetCurrentDataOwnerRoleQuery } from '../api/dataOwnerApi'
import { UserRole } from '../api/roleApi'
import { useAppSelector } from '../hooks'
import { useHierarchyContext } from './HierarchyContext'

export interface Assignment {
  agendaId: string
  siteId: string
  agenda: Agenda
  site: HealthcareParty | undefined
}

interface PermissionContextType {
  dataOwnerId: string | undefined
  currentDataOwner: HealthcareParty | undefined
  role: UserRole | undefined
  isAdministrator: boolean
  isHeadOfService: boolean
  isCityWorker: boolean
  isAdminLevel: boolean
  myAssignments: Assignment[]
  attachedServices: string[] | undefined
  attachedSites: string[] | undefined
  isLoading: boolean
}

const PermissionContext = createContext<PermissionContextType>({} as PermissionContextType)

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { agendaMap, allSites } = useHierarchyContext()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  const { data: dataOwnerInfo, isLoading: isRoleLoading } = useGetCurrentDataOwnerRoleQuery(undefined, { skip })

  const myAssignments = useMemo<Assignment[]>(() => {
    const properties = dataOwnerInfo?.dataOwner?.properties
    if (!properties || !agendaMap || agendaMap.size === 0) return []

    return properties.flatMap((property) => {
      const agendaId = property.typedValue?.stringValue

      if (property.id?.startsWith('ASSIGNMENT|') && agendaId) {
        const agenda = agendaMap.get(agendaId)
        if (agenda && agenda.author) {
          const site = allSites.find((s) => s.id === agenda.author)
          return [
            {
              agendaId: agenda.id,
              siteId: agenda.author,
              agenda: agenda,
              site: site,
            },
          ]
        }
      }
      return []
    })
  }, [dataOwnerInfo, agendaMap, allSites])

  const { attachedServices, attachedSites } = useMemo(() => {
    if (myAssignments.length === 0) {
      return { attachedServices: undefined, attachedSites: undefined }
    }
    const agendaIds = myAssignments.map((a) => a.agendaId)
    const siteIds = Array.from(new Set(myAssignments.map((a) => a.siteId)))
    return { attachedServices: agendaIds, attachedSites: siteIds }
  }, [myAssignments])

  const role = dataOwnerInfo?.role
  const isAdministrator = role === UserRole.ADMINISTRATOR
  const isHeadOfService = role === UserRole.HEAD_OF_SERVICE
  const isCityWorker = role === UserRole.CITY_WORKER
  const isAdminLevel = isAdministrator || isHeadOfService

  const value = useMemo(
    () => ({
      dataOwnerId: dataOwnerInfo?.dataOwner.id,
      currentDataOwner: dataOwnerInfo?.dataOwner as HealthcareParty,
      role,
      isAdministrator,
      isHeadOfService,
      isCityWorker,
      isAdminLevel,
      myAssignments,
      attachedServices,
      attachedSites,
      isLoading: isRoleLoading,
    }),
    [dataOwnerInfo, role, isAdministrator, isHeadOfService, isCityWorker, isAdminLevel, myAssignments, attachedServices, attachedSites, isRoleLoading],
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export const usePermissionContext = () => useContext(PermissionContext)

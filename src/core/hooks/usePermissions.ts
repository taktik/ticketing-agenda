import { useMemo } from 'react'
import { useGetCurrentDataOwnerRoleQuery } from '../api/dataOwnerApi'
import { UserRole } from '../api/roleApi'
import { useAppSelector } from '../hooks'
import { useServices } from './useServices'

export const usePermissions = (skipProp: boolean = false) => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user || skipProp
  const { data: dataOwnerInfo, isLoading: isRoleLoading } = useGetCurrentDataOwnerRoleQuery(undefined, { skip: skip })

  const dataOwnerId = useMemo(() => dataOwnerInfo?.dataOwner.id, [dataOwnerInfo])

  const isAdministrator = useMemo(() => dataOwnerInfo?.role === UserRole.ADMINISTRATOR, [dataOwnerInfo])
  const isHeadOfService = useMemo(() => dataOwnerInfo?.role === UserRole.HEAD_OF_SERVICE, [dataOwnerInfo])
  const isCityWorker = useMemo(() => dataOwnerInfo?.role === UserRole.CITY_WORKER, [dataOwnerInfo])
  const isAdminLevel = useMemo(() => isAdministrator || isHeadOfService, [isAdministrator, isHeadOfService])

  const attachedServices = useMemo(() => {
    const properties = dataOwnerInfo?.dataOwner?.properties
    if (!properties) return undefined
    return properties.flatMap((property) => {
      const value = property.typedValue?.stringValue
      if (property.id?.startsWith('ASSIGNMENT|') && value) {
        return [value]
      }
      return []
    })
  }, [dataOwnerInfo])

  const shouldFetchServices = (isHeadOfService || isCityWorker) && attachedServices && attachedServices.length > 0
  const { allServices } = useServices(!shouldFetchServices)

  const attachedSites = useMemo(() => {
    if (!shouldFetchServices || !allServices || !attachedServices) return undefined

    const allowedServiceIds = new Set(attachedServices)

    const matchingAgendas = allServices.filter((service) => allowedServiceIds.has(service.id))

    const authors = matchingAgendas.map((agenda) => agenda.author).filter((author): author is string => !!author)

    return Array.from(new Set(authors))
  }, [allServices, attachedServices, shouldFetchServices])

  return {
    dataOwnerId,
    isRoleLoading,
    isAdministrator,
    isHeadOfService,
    isCityWorker,
    isAdminLevel,
    attachedServices,
    attachedSites,
  }
}

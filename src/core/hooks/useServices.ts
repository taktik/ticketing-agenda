import { useMemo } from 'react'
import { useGetAgendasByAuthorIds } from '../api/agendaApi'
import { useSites } from './useSites'
import { usePermissions } from './usePermissions'

export const useServices = (skip: boolean = false) => {
  const { sites, isSitesLoading } = useSites()
  const sitesIds = useMemo(() => sites?.map((site) => site.id), [sites])

  const { attachedService } = usePermissions()

  const { data: allServices, isLoading: areServicesLoading } = useGetAgendasByAuthorIds({ skip: skip || !sitesIds, authorIds: sitesIds ?? [] })
  const servicesAvailable = useMemo(() => (attachedService ? allServices.filter((service) => service.id === attachedService) : allServices), [attachedService, allServices])

  const isServicesLoading = isSitesLoading || areServicesLoading

  return { allServices, servicesAvailable, isServicesLoading }
}

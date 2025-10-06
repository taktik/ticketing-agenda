import { useMemo } from 'react'
import { useGetAllAgendaByAuthorIds } from '../api/agendaApi'
import { useSites } from './useSites'

export const useAllServices = (skip: boolean = false) => {
  const { sites, isSitesLoading } = useSites()
  const sitesIds = useMemo(() => sites?.map((site) => site.id), [sites])

  const { data: allServices, isLoading: areServicesLoading } = useGetAllAgendaByAuthorIds({ skip: skip || !sitesIds, authorIds: sitesIds ?? [] })

  const isServicesLoading = isSitesLoading || areServicesLoading

  return { allServices, isServicesLoading }
}

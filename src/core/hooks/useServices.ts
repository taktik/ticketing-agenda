import { useMemo } from 'react'
import { useGetAgendasByAuthorIds } from '../api/agendaApi'
import { useSites } from './useSites'

export const useServices = (skip: boolean = false) => {
  const { sites, isSitesLoading } = useSites()
  const sitesIds = useMemo(() => sites?.map((site) => site.id), [sites])

  const { data: allServices, isLoading: areServicesLoading } = useGetAgendasByAuthorIds({ skip: skip || !sitesIds, authorIds: sitesIds ?? [] })

  const isServicesLoading = isSitesLoading || areServicesLoading

  return { allServices, isServicesLoading }
}

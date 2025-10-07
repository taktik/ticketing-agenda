import { HcpTag } from '../api/fetchType'
import { useGetHealthcarePartyByTagQuery } from '../api/healthcarePartyApi'
import { useAppSelector } from '../hooks'

export const useSites = () => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const { data: fetchedSites, isLoading: isSitesLoading } = useGetHealthcarePartyByTagQuery(HcpTag.SITE, { skip: skip })

  const sites = fetchedSites ? [...fetchedSites].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')) : undefined

  return { sites, isSitesLoading }
}

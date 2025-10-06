import { RootHcpType } from '../api/fetchType'
import { useGetHealthcarePartiesByParentQuery, useGetRootHealthcareParty } from '../api/healthcarePartyApi'
import { useAppSelector } from '../hooks'

export const useSites = () => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const { data: siteRoot, isLoading: isRootLoading } = useGetRootHealthcareParty({
    rootType: RootHcpType.SITE_ROOT,
    skip: skip,
  })
  const { data: fetchedSites, isLoading: isSitesFetchLoading } = useGetHealthcarePartiesByParentQuery({ parentId: siteRoot?.id ?? '' }, { skip: skip })

  const sites = fetchedSites ? [...fetchedSites].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')) : undefined
  const isSitesLoading = isRootLoading || isSitesFetchLoading

  return { sites, isSitesLoading }
}

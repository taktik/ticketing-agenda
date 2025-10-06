import { RootHcpType } from '../api/fetchType'
import { useGetRootHealthcareParty } from '../api/healthcarePartyApi'

export const useRoot = (skip: boolean = false) => {
  const { data: siteRoot, isLoading: isSiteRootLoading } = useGetRootHealthcareParty({ skip: skip, rootType: RootHcpType.SITE_ROOT })
  const { data: adminRoot, isLoading: isAdminRootLoading } = useGetRootHealthcareParty({ skip: skip, rootType: RootHcpType.ADMIN_ROOT })

  return {
    siteRoot,
    adminRoot,
    isSiteRootLoading: isSiteRootLoading,
    isAdminRootLoading: isAdminRootLoading,
  }
}

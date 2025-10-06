import { useMemo } from 'react'
import { RootHcpType } from '../api/fetchType'
import { useGetRootHealthcareParty } from '../api/healthcarePartyApi'
import { useAppSelector } from '../hooks'

export const useRoot = () => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const siteArgs = useMemo(() => ({ skip, rootType: RootHcpType.SITE_ROOT }), [skip])
  const adminArgs = useMemo(() => ({ skip, rootType: RootHcpType.ADMIN_ROOT }), [skip])
  const { data: siteRoot, isLoading: isSiteRootLoading } = useGetRootHealthcareParty(siteArgs)
  const { data: adminRoot, isLoading: isAdminRootLoading } = useGetRootHealthcareParty(adminArgs)

  return {
    siteRoot,
    adminRoot,
    isSiteRootLoading: isSiteRootLoading,
    isAdminRootLoading: isAdminRootLoading,
  }
}

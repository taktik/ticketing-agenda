import { HcpTag } from '../api/fetchType'
import { useGetRootHealthcareParty } from '../api/healthcarePartyApi'
import { useAppSelector } from '../hooks'

export const useRoot = (skipProp: boolean = false) => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user || skipProp

  const { data: siteRoot, isLoading: isSiteRootLoading } = useGetRootHealthcareParty({ rootType: HcpTag.SITE_ROOT, skip: skip })
  const { data: adminRoot, isLoading: isAdminRootLoading } = useGetRootHealthcareParty({ rootType: HcpTag.ADMIN_ROOT, skip: skip })

  return {
    siteRoot,
    adminRoot,
    isSiteRootLoading: isSiteRootLoading,
    isAdminRootLoading: isAdminRootLoading,
  }
}

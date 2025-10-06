import { useMemo } from 'react'
import { useGetCurrentDataOwnerRoleQuery } from '../api/dataOwnerApi'
import { UserRole } from '../api/roleApi'
import { useAppSelector } from '../hooks'

export const usePermissions = () => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const { data: dataOwnerInfo, isLoading: isRoleLoading } = useGetCurrentDataOwnerRoleQuery(undefined, { skip: skip })

  const isAdministrator = useMemo(() => dataOwnerInfo?.role === UserRole.ADMINISTRATOR, [dataOwnerInfo])
  const isHeadOfService = useMemo(() => dataOwnerInfo?.role === UserRole.HEAD_OF_SERVICE, [dataOwnerInfo])
  const isCityWorker = useMemo(() => dataOwnerInfo?.role === UserRole.CITY_WORKER, [dataOwnerInfo])

  const isAdminLevel = useMemo(() => isAdministrator || isHeadOfService, [isAdministrator, isHeadOfService])

  return {
    isRoleLoading,
    isAdministrator,
    isHeadOfService,
    isCityWorker,
    isAdminLevel,
  }
}

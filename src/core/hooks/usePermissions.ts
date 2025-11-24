import { useMemo } from 'react'
import { useGetCurrentDataOwnerRoleQuery } from '../api/dataOwnerApi'
import { UserRole } from '../api/roleApi'
import { useAppSelector } from '../hooks'

export const usePermissions = (skipProp: boolean = false) => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user || skipProp
  const { data: dataOwnerInfo, isLoading: isRoleLoading } = useGetCurrentDataOwnerRoleQuery(undefined, { skip: skip })

  const dataOwnerId = useMemo(() => dataOwnerInfo?.dataOwner.id, [dataOwnerInfo])

  const isAdministrator = useMemo(() => dataOwnerInfo?.role === UserRole.ADMINISTRATOR, [dataOwnerInfo])
  const isHeadOfService = useMemo(() => dataOwnerInfo?.role === UserRole.HEAD_OF_SERVICE, [dataOwnerInfo])
  const isCityWorker = useMemo(() => dataOwnerInfo?.role === UserRole.CITY_WORKER, [dataOwnerInfo])
  const isAdminLevel = useMemo(() => isAdministrator || isHeadOfService, [isAdministrator, isHeadOfService])

  const attachedService = useMemo(() => {
    const dataOwner = dataOwnerInfo?.dataOwner
    if (dataOwner && 'supervisorId' in dataOwner) {
      return dataOwner.supervisorId
    }
    return undefined
  }, [dataOwnerInfo])

  const attachedSite = useMemo(() => {
    const dataOwner = dataOwnerInfo?.dataOwner
    if (dataOwner && 'parentId' in dataOwner && (isHeadOfService || isCityWorker)) {
      return dataOwner.parentId
    }
    return undefined
  }, [dataOwnerInfo, isHeadOfService, isCityWorker])

  return {
    dataOwnerId,
    isRoleLoading,
    isAdministrator,
    isHeadOfService,
    isCityWorker,
    isAdminLevel,
    attachedService,
    attachedSite,
  }
}

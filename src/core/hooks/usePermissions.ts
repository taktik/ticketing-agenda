import { useGetCurrentDataOwnerRoleQuery } from '../api/dataOwnerApi'
import { UserRole } from '../api/roleApi'

export const usePermissions = () => {
  const { data: dataOwnerInfo, isLoading } = useGetCurrentDataOwnerRoleQuery()

  const role = dataOwnerInfo?.role

  const isAdministrator = role === UserRole.ADMINISTRATOR
  const isHeadOfService = role === UserRole.HEAD_OF_SERVICE
  const isCityWorker = role === UserRole.CITY_WORKER

  const isAdminLevel = isAdministrator || isHeadOfService

  return {
    isLoading,
    role,
    isAdministrator,
    isHeadOfService,
    isCityWorker,
    isAdminLevel,
  }
}

import { CodeStub, Role } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { ROLE_ADMINISTRATOR, ROLE_CHIEF_OF_SERVICE, ROLE_CITY_WORKER } from '../../constants'
import { cardinalApi } from '../services/auth.api'
import { baseQueryWithRetry, guard } from './utils'

export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  HEAD_OF_SERVICE = 'HEAD_OF_SERVICE',
  CITY_WORKER = 'CITY_WORKER',
}

export const roleTypeMap: { [key: string]: UserRole } = {
  ADMINISTRATOR: UserRole.ADMINISTRATOR,
  HEAD_OF_SERVICE: UserRole.HEAD_OF_SERVICE,
  CITY_WORKER: UserRole.CITY_WORKER,
}

export const cityWorkerRoles = [ROLE_CITY_WORKER]
export const headOfServiceRoles = [ROLE_CHIEF_OF_SERVICE]
export const adminRoles = [ROLE_ADMINISTRATOR, ROLE_CHIEF_OF_SERVICE, ROLE_CITY_WORKER]

export const rolesMap = {
  [UserRole.ADMINISTRATOR]: adminRoles,
  [UserRole.HEAD_OF_SERVICE]: headOfServiceRoles,
  [UserRole.CITY_WORKER]: cityWorkerRoles,
}

export const administratorTag = [new CodeStub({ id: UserRole.ADMINISTRATOR, code: UserRole.ADMINISTRATOR, type: UserRole.ADMINISTRATOR, version: '1' })]
export const headOfServiceTag = [new CodeStub({ id: UserRole.HEAD_OF_SERVICE, code: UserRole.HEAD_OF_SERVICE, type: UserRole.HEAD_OF_SERVICE, version: '1' })]
export const cityWorkerTag = [new CodeStub({ id: UserRole.CITY_WORKER, code: UserRole.CITY_WORKER, type: UserRole.CITY_WORKER, version: '1' })]
export const allRoleTags = [...administratorTag, ...headOfServiceTag, ...cityWorkerTag]

export const tagMap = {
  [UserRole.ADMINISTRATOR]: administratorTag,
  [UserRole.HEAD_OF_SERVICE]: headOfServiceTag,
  [UserRole.CITY_WORKER]: cityWorkerTag,
}

enum RoleTags {
  Role = 'Role',
}

export const roleApiRtk = createApi({
  reducerPath: 'roleApi',
  tagTypes: [RoleTags.Role],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    getAllRoles: builder.query<Role[] | undefined, void>({
      async queryFn(_, { getState }) {
        const roleApi = (await cardinalApi(getState))?.role
        return guard([roleApi], async (): Promise<Role[]> => {
          const roles = await roleApi?.getAllRoles()
          if (!roles) {
            throw new Error('Roles not found')
          }
          return roles
        })
      },
    }),
  }),
})

export const { useGetAllRolesQuery } = roleApiRtk

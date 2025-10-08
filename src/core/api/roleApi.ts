import { CodeStub, ListOfIds, Role } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'

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

export const cityWorkerRoles = new ListOfIds({ ids: ['ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:CITY_WORKER'] })
export const headOfServiceRoles = new ListOfIds({ ids: ['ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:HEAD_OF_SERVICE'] })
export const adminRoles = new ListOfIds({
  ids: ['ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:ADMINISTRATOR', 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:HEAD_OF_SERVICE', 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:CITY_WORKER'],
})

export const rolesMap = {
  [UserRole.ADMINISTRATOR]: adminRoles,
  [UserRole.HEAD_OF_SERVICE]: headOfServiceRoles,
  [UserRole.CITY_WORKER]: cityWorkerRoles,
}

export const administratorTag = [new CodeStub({ id: 'ADMINISTRATOR|1', code: 'ADMINISTRATOR', type: 'ADMINISTRATOR', version: '1' })]
export const headOfServiceTag = [new CodeStub({ id: 'HEAD_OF_SERVICE|1', code: 'HEAD_OF_SERVICE', type: 'HEAD_OF_SERVICE', version: '1' })]
export const cityWorkerTag = [new CodeStub({ id: 'CITY_WORKER|1', code: 'CITY_WORKER', type: 'CITY_WORKER', version: '1' })]

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
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
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

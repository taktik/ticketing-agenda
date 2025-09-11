import { Role } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'

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

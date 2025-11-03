import { ListOfIds, randomUuid, User, UserFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'

enum UserTags {
  User = 'User',
}

export const userApiRtk = createApi({
  reducerPath: 'userApi',
  tagTypes: [UserTags.User],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getCurrentUser: builder.query<User | undefined, void>({
      async queryFn(_, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User> => {
          const result = await userApi?.getCurrentUser()
          if (!result) {
            throw new Error('Cannot find current user')
          }
          return result
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    getUsers: builder.query<User[] | undefined, void>({
      async queryFn(_, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User[]> => {
          return await loadFromIterator(await userApi!.filterUsersBy(UserFilters.all()), 1000)
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    getUsersByIds: builder.query<User[] | undefined, string[]>({
      async queryFn(ids, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User[]> => {
          return await loadFromIterator(await userApi!.filterUsersBy(UserFilters.byIds(ids)), 1000)
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    getUserByEmail: builder.query<User | undefined, string>({
      async queryFn(email, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User> => {
          const result = await userApi?.getUserByEmail(email)
          if (!result) {
            throw new Error('Cannot find user')
          }
          return result
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    createUser: builder.mutation<User | undefined, { email: string; id: string; name: string }>({
      async queryFn({ email, id, name }, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User> => {
          const createdUser = await userApi?.createUser(
            new User({
              id: randomUuid(),
              name: name,
              email: email,
              patientId: id,
            }),
          )
          if (!createdUser) {
            throw new Error('User does not exist')
          }
          return new User(createdUser)
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    createUpdateUser: builder.mutation<User | undefined, User>({
      async queryFn(user, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User> => {
          const updatedUser = !!user.rev ? await userApi?.modifyUser(user) : await userApi?.createUser(user)
          if (!updatedUser) {
            throw new Error('User creation/update failed')
          }
          return updatedUser
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    deleteUser: builder.mutation<string | undefined, User>({
      async queryFn(user, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async () => {
          const result = await userApi?.deleteUser(user)
          if (!result) {
            throw new Error('User deletion failed')
          }
          return result.id
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    silentDeleteUser: builder.mutation<string | undefined, User>({
      async queryFn(user, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async () => {
          const result = await userApi?.deleteUser(user)
          if (!result) {
            throw new Error('User deletion failed')
          }
          return result.id
        })
      },
    }),
    setUserRoles: builder.mutation<User | undefined, { userId: string; roleIds: ListOfIds }>({
      async queryFn(params, { getState }) {
        const { userId, roleIds } = params
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async () => {
          const result = await userApi?.setUserRoles(userId, roleIds)
          if (!result) {
            throw new Error('User role update failed')
          }
          return result
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
    resetUserRoles: builder.mutation<User | undefined, string>({
      async queryFn(userId, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async () => {
          const result = await userApi?.resetUserRoles(userId)
          if (!result) {
            throw new Error('User role reset failed')
          }
          return result
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
  }),
})

export const {
  useGetCurrentUserQuery,
  useGetUsersQuery,
  useGetUsersByIdsQuery,
  useLazyGetUsersQuery,
  useGetUserByEmailQuery,
  useCreateUserMutation,
  useCreateUpdateUserMutation,
  useDeleteUserMutation,
  useLazyGetUserByEmailQuery,
  useSetUserRolesMutation,
  useResetUserRolesMutation,
  useSilentDeleteUserMutation,
} = userApiRtk

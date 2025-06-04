import { randomUuid, User, UserFilters } from '@icure/cardinal-sdk'
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
    getUsers: builder.query<User[] | undefined, undefined>({
      async queryFn(_, { getState }) {
        const userApi = (await cardinalApi(getState))?.user
        return guard([userApi], async (): Promise<User[]> => {
          return await loadFromIterator(await userApi!.filterUsersBy(UserFilters.all()), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: UserTags.User, id: 'all' }] : []),
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
  }),
})

export const { useGetUsersQuery, useCreateUserMutation, useCreateUpdateUserMutation, useDeleteUserMutation } = userApiRtk

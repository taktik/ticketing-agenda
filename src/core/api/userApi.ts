import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { guard, cardinalApi } from '../services/auth.api'
import { randomUuid, User, UserFilters } from '@icure/cardinal-sdk'
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
      invalidatesTags: (res) => (res ? [{ type: UserTags.User, id: 'all' }] : []),
    }),
  }),
})

export const { useGetUsersQuery, useCreateUserMutation } = userApiRtk

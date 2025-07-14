import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface GetKeyResponse {
  key: string
}

interface AddUserKeyRequest {
  userId: string
  key: string
}

interface AddUserKeyResponse {
  message: string
  status: 'created' | 'no_change'
}

enum KeyApiTag {
  Key = 'Key',
}

export const keyApiRtk = createApi({
  reducerPath: 'keyApi',
  tagTypes: [KeyApiTag.Key],
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:8080/api',
  }),
  endpoints: (builder) => ({
    getKey: builder.query<GetKeyResponse, string>({
      query: (userId) => `/keys/${userId}`,
      providesTags: (result, error, userId) => [{ type: KeyApiTag.Key, id: userId }],
    }),
    addUserKey: builder.mutation<AddUserKeyResponse, AddUserKeyRequest>({
      query: (body) => ({
        url: '/keys',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { userId }) => [{ type: KeyApiTag.Key, id: userId }],
    }),
  }),
})

export const { useLazyGetKeyQuery, useAddUserKeyMutation } = keyApiRtk

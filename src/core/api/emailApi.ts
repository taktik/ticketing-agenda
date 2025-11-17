import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi } from '../services/auth.api'
import { MSG_GW_URL, SPEC_ID } from '../../constants'
import { SendEmailResponse, SendEmailRequest } from './fetchType'

export const emailApiRtk = createApi({
  reducerPath: 'emailApi',
  tagTypes: ['Email'],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    sendEmail: builder.mutation<SendEmailResponse, SendEmailRequest>({
      async queryFn({ receiver, from, processId, variables }, { getState }, _extraOptions, fetchWithBQ) {
        const authApi = (await cardinalApi(getState))?.auth
        if (!authApi) {
          return { error: { status: 500, data: 'Could not initialize AuthApi' } }
        }
        const token = await authApi.getBearerToken()
        if (!token) {
          return { error: { status: 401, data: 'No bearer token found via AuthApi' } }
        }
        const result = await fetchWithBQ({
          url: `${MSG_GW_URL}/${SPEC_ID}/email/to/${receiver}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: { from, processId, variables },
        })
        if (result.error) return { error: result.error }
        return { data: result.data as SendEmailResponse }
      },
    }),
  }),
})

export const { useSendEmailMutation } = emailApiRtk

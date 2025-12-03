import { createApi } from '@reduxjs/toolkit/query/react'
import { MSG_GW_URL, SPEC_ID } from '../../constants'
import { cardinalApi } from '../services/auth.api'
import { SendEmailRequest, SendEmailResponse } from './fetchType'
import { baseQueryWithRetry } from './utils'

export const emailApiRtk = createApi({
  reducerPath: 'emailApi',
  tagTypes: ['Email'],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    sendEmail: builder.mutation<SendEmailResponse, SendEmailRequest>({
      async queryFn({ receiver, from, processId, variables, bcc, cc }, { getState }, _extraOptions, fetchWithBQ) {
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
          body: { from, processId, bcc, cc, variables },
        })
        if (result.error) return { error: result.error }
        return { data: result.data as SendEmailResponse }
      },
    }),
  }),
})

export const { useSendEmailMutation } = emailApiRtk

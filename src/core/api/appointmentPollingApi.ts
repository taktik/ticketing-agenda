import { createApi } from '@reduxjs/toolkit/query/react'
import { FetchArgs, fetchBaseQuery, retry } from '@reduxjs/toolkit/query'
import { BACKEND_API } from '../../constants'
import { AppState } from '../reducer'

export enum PropagationStatus {
  NOT_YET_RECEIVED = 'NOT_YET_RECEIVED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface PropagationTask {
  icureAppointmentId: string
  status: PropagationStatus
  confirmationCode?: string | null
  errorMessage?: string | null
  lastUpdated: string
}

export interface PropagationTimeout {
  status: 'TIMEOUT'
}

export type WaitForPropagationResult = PropagationTask | PropagationTimeout

type PropagationStatusTrigger = (
  arg: string,
  preferCacheValue?: boolean,
) => {
  unwrap: () => Promise<PropagationTask>
}

const authenticatedBaseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    const credentials = (getState() as AppState).app.savedCredentials
    const token = credentials?.bearerToken || credentials?.token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

const authenticatedBaseQueryWithRetry = retry(
  async (args: string | FetchArgs, api, extraOptions) => {
    const result = await authenticatedBaseQuery(args, api, extraOptions)
    if (result.error) {
      const { status } = result.error as { status: number | string }
      if (typeof status === 'number' && status >= 400 && status < 500) {
        retry.fail(result.error, result.meta)
      }
    }
    return result
  },
  { maxRetries: 3 },
)

enum AppointmentPollingApiTags {
  AppointmentPolling = 'AppointmentPolling',
}

export const AppointmentPollingApiRtk = createApi({
  reducerPath: 'AppointmentPollingApi',
  tagTypes: [AppointmentPollingApiTags.AppointmentPolling],
  baseQuery: authenticatedBaseQueryWithRetry,
  endpoints: (builder) => ({
    getPropagationStatus: builder.query<PropagationTask, string>({
      query: (icureAppointmentId) => ({
        url: `${BACKEND_API}/api/propagation-status/${icureAppointmentId}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: AppointmentPollingApiTags.AppointmentPolling, id }],
    }),
  }),
})

export const { useGetPropagationStatusQuery, useLazyGetPropagationStatusQuery } = AppointmentPollingApiRtk

export const waitForPropagation = async (trigger: PropagationStatusTrigger, id: string, intervalMs = 200, timeoutMs = 10000, signal?: AbortSignal): Promise<WaitForPropagationResult> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (signal?.aborted) return { status: 'TIMEOUT' }

    try {
      const result = await trigger(id, false).unwrap()

      if (result.status === PropagationStatus.SUCCESS || result.status === PropagationStatus.FAILED) {
        return result
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
  return { status: 'TIMEOUT' }
}

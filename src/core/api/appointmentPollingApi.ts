import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithRetry } from './utils'
import { BACKEND_API } from '../../constants'

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

enum AppointmentPollingApiTags {
  AppointmentPolling = 'AppointmentPolling',
}

export const AppointmentPollingApiRtk = createApi({
  reducerPath: 'AppointmentPollingApi',
  tagTypes: [AppointmentPollingApiTags.AppointmentPolling],
  baseQuery: baseQueryWithRetry,
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
    } catch (e) {
      console.warn(`Polling error for ${id}:`, e)
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
  console.warn(`Polling timed out for appointment ${id}`)
  return { status: 'TIMEOUT' }
}

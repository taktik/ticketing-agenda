import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithRetry } from './utils'

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
        url: `http://localhost:8080/api/propagation-status/${icureAppointmentId}`, //`${BACKEND_API}/api/propagation-status/${icureAppointmentId}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: AppointmentPollingApiTags.AppointmentPolling, id }],
    }),
  }),
})

export const { useGetPropagationStatusQuery, useLazyGetPropagationStatusQuery } = AppointmentPollingApiRtk

export const waitForPropagation = async (trigger: PropagationStatusTrigger, id: string, intervalMs = 200, timeoutMs = 10000): Promise<PropagationTask | null> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
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
  console.error(`Polling timed out for appointment ${id}`)
  return null
}

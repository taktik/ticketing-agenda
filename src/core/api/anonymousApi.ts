import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { DATABASE_ID } from '../../constants'
import { anonymousCardinalApi, guard } from '../services/auth.api'

enum AnonymousTags {
  Anonymous = 'Anonymous',
}

interface listAnonymousAvailabilitiesParams {
  agendaId: string
  calendarItemTypeId: string
  startDate: number
  endDate: number
}

export const anonymousApiRtk = createApi({
  reducerPath: 'anonymousApi',
  tagTypes: [AnonymousTags.Anonymous],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getAvailabilities: builder.query<number[] | undefined, listAnonymousAvailabilitiesParams>({
      async queryFn(params, { getState }) {
        const anonymousAgendaApi = (await anonymousCardinalApi())?.agenda
        return guard([anonymousAgendaApi], async (): Promise<number[]> => {
          const availabilities = await anonymousAgendaApi?.listAnonymousAvailabilities(DATABASE_ID!, params.agendaId, params.calendarItemTypeId, params.startDate, params.endDate)
          if (!availabilities) {
            throw new Error('No availabilities')
          }
          return availabilities
        })
      },
      providesTags: (res, error, params) => {
        const tagId = `${params.agendaId}-${params.calendarItemTypeId}-${params.startDate}-${params.endDate}`
        return [{ type: AnonymousTags.Anonymous, id: tagId }]
      },
    }),
  }),
})

export const { useGetAvailabilitiesQuery, useLazyGetAvailabilitiesQuery } = anonymousApiRtk

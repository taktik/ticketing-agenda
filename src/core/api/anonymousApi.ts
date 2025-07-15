import { DesignDocument } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { anonymousCardinalApi, cardinalApi, guard } from '../services/auth.api'
import { DB_ID } from '../../constants'

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
        const anonymousAgendaApi = (await anonymousCardinalApi(getState))?.agenda
        return guard([anonymousAgendaApi], async (): Promise<number[]> => {
          const availabilities = await anonymousAgendaApi?.listAnonymousAvailabilities(DB_ID!, params.agendaId, params.calendarItemTypeId, params.startDate, params.endDate)
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

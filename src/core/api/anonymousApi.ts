import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import dayjs from 'dayjs'
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
    getAvailabilities: builder.query<dayjs.Dayjs[] | undefined, listAnonymousAvailabilitiesParams>({
      async queryFn(params, { getState }) {
        const anonymousAgendaApi = (await anonymousCardinalApi())?.agenda
        return guard([anonymousAgendaApi], async (): Promise<dayjs.Dayjs[]> => {
          const availabilities = await anonymousAgendaApi?.listAnonymousAvailabilities(DATABASE_ID!, params.agendaId, params.calendarItemTypeId, params.startDate, params.endDate)
          if (!availabilities) {
            throw new Error('No availabilities')
          }
          const transformedData = availabilities.map((num) => dayjs(String(num), 'YYYYMMDDHHmmss'))

          return transformedData
        })
      },
    }),
  }),
})

export const { useGetAvailabilitiesQuery, useLazyGetAvailabilitiesQuery } = anonymousApiRtk

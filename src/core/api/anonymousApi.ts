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
        console.log('entry rtk', params)
        const anonymousAgendaApi = (await anonymousCardinalApi())?.agenda
        console.log('get api rtk', anonymousAgendaApi)
        console.log('db id', DATABASE_ID)
        return guard([anonymousAgendaApi], async (): Promise<number[]> => {
          const availabilities = await anonymousAgendaApi?.listAnonymousAvailabilities(
            'ic-taktikticketingagendamouscron-f7627de4-d674-4443-9987-2cc5c0d793b1',
            params.agendaId,
            params.calendarItemTypeId,
            params.startDate,
            params.endDate,
          )
          console.log('availabilities rtk', availabilities)
          if (!availabilities) {
            throw new Error('No availabilities')
          }
          console.log('result', availabilities)
          return availabilities
        })
      },
      providesTags: (res, error, params) => {
        const tagId = `${params.agendaId}-${params.calendarItemTypeId}-${params.startDate}-${params.endDate}`
        //        return [{ type: AnonymousTags.Anonymous, id: tagId }]
        return []
      },
    }),
  }),
})

export const { useGetAvailabilitiesQuery, useLazyGetAvailabilitiesQuery } = anonymousApiRtk

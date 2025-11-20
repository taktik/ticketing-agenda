import { PublicAgendasAndCalendarItemTypes } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import dayjs from 'dayjs'
import { DATABASE_ID } from '../../constants'
import { anonymousCardinalApi } from '../services/auth.api'
import { baseQueryWithRetry, guard } from './utils'

enum AnonymousTags {
  Anonymous = 'Anonymous',
}

interface listAnonymousAvailabilitiesParams {
  agendaId: string
  calendarItemTypeId: string
  startDate: number
  endDate: number
}

interface listAnonymousAgendaProceduresParams {
  propertyId: string
  propertyValue: string
}

export const anonymousApiRtk = createApi({
  reducerPath: 'anonymousApi',
  tagTypes: [AnonymousTags.Anonymous],
  baseQuery: baseQueryWithRetry,
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
    getAgendaAndProcedures: builder.query<PublicAgendasAndCalendarItemTypes | undefined, listAnonymousAgendaProceduresParams>({
      async queryFn(params, { getState }) {
        const anonymousAgendaApi = (await anonymousCardinalApi())?.agenda
        return guard([anonymousAgendaApi], async (): Promise<PublicAgendasAndCalendarItemTypes> => {
          const agendaAndProcedures = await anonymousAgendaApi?.listAnonymousAgendaAndAppointmentTypes(DATABASE_ID!, params.propertyId, params.propertyValue)
          if (!agendaAndProcedures) {
            throw new Error('No agenda and procedures')
          }
          return agendaAndProcedures
        })
      },
    }),
  }),
})

export const { useLazyGetAvailabilitiesQuery, useLazyGetAgendaAndProceduresQuery } = anonymousApiRtk

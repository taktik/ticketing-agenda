import { Agenda, AgendaFilters, TimeTableItem, CalendarItem, TimeTable, HealthcareParty } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'
import { useMemo } from 'react'

enum AgendaTags {
  Agenda = 'Agenda',
}

export const agendaApiRtk = createApi({
  reducerPath: 'agendaApi',
  tagTypes: [AgendaTags.Agenda],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getAgendas: builder.query<Agenda[] | undefined, void>({
      async queryFn(_, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda[]> => {
          return await loadFromIterator(await agendaApi!.filterAgendasBy(AgendaFilters.all()), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: AgendaTags.Agenda, id: 'all' }] : []),
    }),
    getAgenda: builder.query<Agenda | undefined, string>({
      async queryFn(id, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda> => {
          const agenda = await agendaApi?.getAgenda(id)
          if (!agenda) {
            throw new Error('Agenda does not exist')
          }
          return new Agenda(agenda)
        })
      },
      providesTags: (res) => (res ? [{ type: AgendaTags.Agenda, id: res.id }] : []),
    }),
    getAgendaByAuthorId: builder.query<Agenda[] | undefined, void>({
      async queryFn(_, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda[]> => {
          return await loadFromIterator(await agendaApi!.filterAgendasBy(AgendaFilters.all()), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: AgendaTags.Agenda, id: 'all' }] : []),
    }),
    createUpdateAgenda: builder.mutation<Agenda | undefined, Agenda>({
      async queryFn(agenda, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda> => {
          const updatedAgenda = !!agenda.rev ? await agendaApi?.modifyAgenda(agenda) : await agendaApi?.createAgenda(agenda)

          if (!updatedAgenda) {
            throw new Error('Agenda creation or update failed')
          }
          return new Agenda(updatedAgenda)
        })
      },
      invalidatesTags: (result, error, arg) => (result ? [{ type: AgendaTags.Agenda, id: 'all' }] : []),
    }),
    deleteAgenda: builder.mutation<string | undefined, Agenda>({
      async queryFn(agenda, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async () => {
          const result = await agendaApi?.deleteAgenda(agenda)
          if (!result) {
            throw new Error('Agenda can’t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: (id) => [
        { type: AgendaTags.Agenda, id: 'all' },
        { type: AgendaTags.Agenda, id },
      ],
    }),
  }),
})

export const { useGetAgendaQuery, useGetAgendasQuery, useGetAgendaByAuthorIdQuery, useCreateUpdateAgendaMutation, useDeleteAgendaMutation } = agendaApiRtk

export const useGetAgendaByAuthorId = (params: { skip: boolean; authorId: string }) => {
  const { data, ...rest } = useGetAgendaByAuthorIdQuery(undefined, {
    skip: params.skip,
  })

  const agendas = useMemo(() => (data?.length ? data : []), [data])

  const agendaResult = useMemo(() => agendas.find((agenda) => agenda.author === params.authorId), [agendas, params.authorId])

  return {
    data: agendaResult,
    ...rest,
  }
}

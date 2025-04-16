import { Agenda, AgendaFilters, Document, DocumentTemplate, DocumentGroup } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'

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
    createAgenda: builder.mutation<Agenda | undefined, Agenda>({
      async queryFn(agenda, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda> => {
          const newAgenda = await agendaApi?.createAgenda(agenda)
          if (!newAgenda) {
            throw new Error('Agenda creation failed')
          }
          return new Agenda(newAgenda)
        })
      },
      invalidatesTags: (result, error, arg) => (result ? [{ type: AgendaTags.Agenda, id: 'all' }] : []),
    }),
    updateAgenda: builder.mutation<Agenda | undefined, Agenda>({
      async queryFn(agenda, { getState, dispatch }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda> => {
          const updatedAgenda = await agendaApi?.modifyAgenda(agenda)
          if (!updatedAgenda) {
            throw new Error('Agenda update failed')
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

export const { useGetAgendaQuery, useGetAgendasQuery, useCreateAgendaMutation, useUpdateAgendaMutation, useDeleteAgendaMutation } = agendaApiRtk

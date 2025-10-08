import { Agenda, AgendaFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { GetAgendasByStringPropertyParameters } from './fetchType'
import { loadFromIterator } from './utils'
import { usePermissions } from '../hooks/usePermissions'

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
    getAgendasByStringProperty: builder.query<Agenda[] | undefined, GetAgendasByStringPropertyParameters>({
      async queryFn(params, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async (): Promise<Agenda[]> => {
          return await loadFromIterator(await agendaApi!.filterAgendasBy(AgendaFilters.byStringProperty(params.propertyId, params.propertyValue)), 1000)
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
    updateAgenda: builder.mutation<Agenda | undefined, Agenda>({
      async queryFn(agenda, { getState }) {
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
    deleteAgendas: builder.mutation<boolean | undefined, Agenda[]>({
      async queryFn(agendas, { getState }) {
        const agendaApi = (await cardinalApi(getState))?.agenda
        return guard([agendaApi], async () => {
          const result = await agendaApi?.deleteAgendas(agendas)
          if (!result) {
            throw new Error('HealthcareParty can’t be deleted')
          }
          return true
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
            throw new Error('HealthcareParty can’t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: (result, error, arg) => (result ? [{ type: AgendaTags.Agenda, id: 'all' }] : []),
    }),
  }),
})

export const { useGetAgendaQuery, useGetAgendasQuery, useCreateUpdateAgendaMutation, useUpdateAgendaMutation, useDeleteAgendasMutation, useDeleteAgendaMutation, useGetAgendasByStringPropertyQuery } = agendaApiRtk

export const useGetAgendasByAuthorIds = (params: { skip: boolean; authorIds: string[] }) => {
  const { data, ...rest } = useGetAgendasQuery(undefined, {
    skip: params.skip,
  })

  const result = data?.filter((agenda) => agenda.author && params.authorIds.includes(agenda.author)) ?? []

  return {
    data: result,
    ...rest,
  }
}

export const useGetAgendasByAuthorId = (params: { skip: boolean; authorId: string }) => {
  const { data, ...rest } = useGetAgendasQuery(undefined, {
    skip: params.skip,
  })

  const result = data?.filter((item) => item.author && params.authorId === item.author) ?? []

  return {
    data: result,
    ...rest,
  }
}

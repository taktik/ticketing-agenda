import { Agenda, AgendaFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { useEffect, useMemo, useState } from 'react'
import { cardinalApi, guard } from '../services/auth.api'
import { calendarItemTypeApiRtk } from './calendarItemTypeApi'
import { timeTableApiRtk } from './timeTableApi'
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
    deleteAgenda: builder.mutation<string | undefined, Agenda>({
      // Delete the agendas and the related CalendarItemTypes (demarches) and the TimeTable associated with it (backend will remove timetableItems related to the timetable)
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
      async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
        let getCalendarItemTypesAction
        try {
          // --- Step 1: Fetch Calendar Item Types ---
          getCalendarItemTypesAction = dispatch(calendarItemTypeApiRtk.endpoints.getCalendarItemTypes.initiate({ agendaId: id }))
          const calendarItemsResult = await getCalendarItemTypesAction
          getCalendarItemTypesAction.unsubscribe() // Unsubscribe after getting result

          // Check for errors from queryFn (expects { data: ... } or { error: ... })
          if (calendarItemsResult.error) {
            throw calendarItemsResult.error // Propagate the error
          }
          const calendarItemTypes = calendarItemsResult.data // Extract data on success

          // --- Step 2: Delete Calendar Item Types (if any) ---
          if (calendarItemTypes && calendarItemTypes.length > 0) {
            const idsToDelete = calendarItemTypes.map((item) => item.id)
            // Initiate the deletion mutation, passing the array of IDs
            // Use unwrap() to await completion and catch errors
            await dispatch(calendarItemTypeApiRtk.endpoints.deleteCalendarItemType.initiate(idsToDelete)).unwrap()
          } else {
            console.log(`[onQueryStarted deleteAgenda] No CalendarItemTypes found for agenda ${id}. Skipping deletion.`)
          }
        } catch (error) {
          console.error(`[onQueryStarted deleteAgenda] Error during orchestrated deletion for agenda ${id}:`, error)
          // Error could be from fetching/deleting children, or deleting the parent.
          // RTK Query handles the mutation's error state.
          // Ensure subscriptions are cleaned up on error
          getCalendarItemTypesAction?.unsubscribe()
          // Let the error propagate so the calling hook's .unwrap() catches it.
          throw error
        }
      },
    }),
  }),
})

export const { useGetAgendaQuery, useGetAgendasQuery, useCreateUpdateAgendaMutation, useUpdateAgendaMutation, useDeleteAgendaMutation } = agendaApiRtk

export const useGetAllAgendaByAuthorIds = (params: { skip: boolean; authorIds: string[] }) => {
  const { data, ...rest } = useGetAgendasQuery(undefined, {
    skip: params.skip,
  })

  const result = data?.filter((item) => item.author && params.authorIds.includes(item.author)) ?? []

  return {
    data: result,
    ...rest,
  }
}

export const useGetAgendaByAuthorId = (params: { skip: boolean; authorId: string }) => {
  const { data, ...rest } = useGetAgendasQuery(undefined, {
    skip: params.skip,
  })

  const agendas = useMemo(() => (data?.length ? data : []), [data])

  const agendaResult = useMemo(() => agendas.find((agenda) => agenda.author === params.authorId), [agendas, params.authorId])

  return {
    data: agendaResult,
    ...rest,
  }
}

export const useDeleteAgendaByAuthorId = () => {
  const [deleteAgendaMutation, { isError: isDeleteError, isSuccess: isDeleteSuccess, isLoading: isDeleteLoading }] = useDeleteAgendaMutation()
  const [authorId, setAuthorId] = useState<string | null>(null)

  const {
    data: agendas,
    isError: isGetError,
    isSuccess: isGetSuccess,
    isLoading: isGetLoading,
  } = useGetAgendasQuery(undefined, {
    skip: !authorId,
  })

  const agendaToDelete = useMemo(() => agendas?.find((agenda) => agenda.author === authorId), [agendas, authorId])

  const deleteAgenda = (params: { authorId: string }) => {
    setAuthorId(params.authorId)
  }

  useEffect(() => {
    if (agendaToDelete) {
      deleteAgendaMutation(agendaToDelete)
    }
  }, [agendaToDelete])

  return {
    data: agendaToDelete,
    deleteAgenda,
    isLoading: isDeleteLoading || isGetLoading,
    isError: isDeleteError || isGetError,
    isSuccess: isDeleteSuccess && isGetSuccess,
  }
}

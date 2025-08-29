import { CalendarItemType, DocIdentifier, ListOfIds } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { AllCalendarItemTypeServiceParameters, CalendarItemTypeServiceParameters } from './fetchType'

enum calendarItemTypeTag {
  CalendarItemType = 'CalendarItemTypeTag',
}

export const calendarItemTypeApiRtk = createApi({
  reducerPath: 'calendarItemTypeApi',
  tagTypes: [calendarItemTypeTag.CalendarItemType],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getCalendarItemTypes: builder.query<CalendarItemType[] | undefined, string>({
      async queryFn(agendaId, { getState }) {
        const calendarItemTypeApi = (await cardinalApi(getState))?.calendarItemType
        return guard([calendarItemTypeApi], async (): Promise<CalendarItemType[]> => {
          return await calendarItemTypeApi!.listCalendarItemTypesByAgendaId(agendaId)
        })
      },
      providesTags: (res) => (res ? [{ type: calendarItemTypeTag.CalendarItemType, id: 'all' }] : []),
    }),
    getCalendarItemTypesForMultipleAgendas: builder.query<CalendarItemType[][], string[]>({
      async queryFn(agendaIds, { getState, dispatch }) {
        if (!agendaIds || agendaIds.length === 0) {
          return { data: [] as CalendarItemType[][] }
        }

        const promises: Promise<CalendarItemType[] | undefined>[] = agendaIds.map((agendaId) => {
          if (!agendaId) {
            console.warn('An invalid agendaId was provided in the list:', agendaId)
            return Promise.resolve(undefined)
          }
          return dispatch(calendarItemTypeApiRtk.endpoints.getCalendarItemTypes.initiate(agendaId, { forceRefetch: true }))
            .unwrap()
            .catch((error) => {
              console.error(`Failed to fetch CalendarItemTypes for agendaId ${agendaId}:`, error)
              return undefined // Return undefined on failure so Promise.all doesn't fail fast
            })
        })

        const resultsArrayOfMaybeArrays = await Promise.all(promises)
        const finalData: CalendarItemType[][] = resultsArrayOfMaybeArrays.map((result) => result || [])

        return { data: finalData }
      },
      providesTags: (res) => (res ? [{ type: calendarItemTypeTag.CalendarItemType, id: 'all' }] : []),
    }),
    getCalendarItemType: builder.query<CalendarItemType | undefined, string>({
      async queryFn(id, { getState }) {
        const calendarItemTypeApi = (await cardinalApi(getState))?.calendarItemType
        return guard([calendarItemTypeApi], async (): Promise<CalendarItemType> => {
          const item = await calendarItemTypeApi?.getCalendarItemType(id)
          if (!item) {
            throw new Error('CalendarItemType does not exist')
          }
          return new CalendarItemType(item)
        })
      },
      providesTags: (res) => (res ? [{ type: calendarItemTypeTag.CalendarItemType, id: 'all' }] : []),
    }),
    createUpdateCalendarItemType: builder.mutation<CalendarItemType | undefined, CalendarItemType>({
      async queryFn(item, { getState }) {
        const calendarItemTypeApi = (await cardinalApi(getState))?.calendarItemType
        return guard([calendarItemTypeApi], async (): Promise<CalendarItemType> => {
          const updated = !!item.rev ? await calendarItemTypeApi?.modifyCalendarItemType(item) : await calendarItemTypeApi?.createCalendarItemType(item)
          if (!updated) {
            throw new Error('CalendarItemType creation failed')
          }
          return new CalendarItemType(updated)
        })
      },
      invalidatesTags: (result) => (result ? [{ type: calendarItemTypeTag.CalendarItemType, id: 'all' }] : []),
    }),
    deleteCalendarItemType: builder.mutation<DocIdentifier[] | undefined, string[]>({
      async queryFn(ids, { getState }) {
        const calendarItemTypeIds = new ListOfIds({ ids: ids })
        const calendarItemTypeApi = (await cardinalApi(getState))?.calendarItemType
        return guard([calendarItemTypeApi], async () => {
          const result = await calendarItemTypeApi?.deleteCalendarItemTypes(calendarItemTypeIds)
          if (!result) {
            throw new Error('CalendarItemType can`t be deleted')
          }
          return result
        })
      },
      invalidatesTags: () => [{ type: calendarItemTypeTag.CalendarItemType, id: 'all' }],
    }),
  }),
})

export const {
  useGetCalendarItemTypesQuery,
  useLazyGetCalendarItemTypesQuery,
  useGetCalendarItemTypesForMultipleAgendasQuery,
  useLazyGetCalendarItemTypesForMultipleAgendasQuery,
  useGetCalendarItemTypeQuery,
  useCreateUpdateCalendarItemTypeMutation,
  useDeleteCalendarItemTypeMutation,
} = calendarItemTypeApiRtk

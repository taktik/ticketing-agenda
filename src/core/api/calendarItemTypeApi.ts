import { CalendarItemType, CalendarItemTypeApi, DocIdentifier, ListOfIds } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'
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
    getCalendarItemTypes: builder.query<CalendarItemType[] | undefined, CalendarItemTypeServiceParameters>({
      async queryFn(params, { getState }) {
        const calendarItemTypeApi = (await cardinalApi(getState))?.calendarItemType
        return guard([calendarItemTypeApi], async (): Promise<CalendarItemType[]> => {
          return await calendarItemTypeApi!.listCalendarItemTypesByAgendaId(params.agendaId)
        })
      },
      providesTags: (res) => (res ? [{ type: calendarItemTypeTag.CalendarItemType, id: 'all' }] : []),
    }),

    getCalendarItemTypesForMultipleAgendas: builder.query<CalendarItemType[][], AllCalendarItemTypeServiceParameters>({
      async queryFn(params, { getState, dispatch }) {
        const { agendaIds } = params

        if (!agendaIds || agendaIds.length === 0) {
          return { data: [] as CalendarItemType[][] } // Return empty outer array
        }

        // Explicitly type the promises array. Each promise resolves to CalendarItemType[] | undefined.
        const promises: Promise<CalendarItemType[] | undefined>[] = agendaIds.map((agendaId) => {
          if (!agendaId) {
            // Handle null, undefined, or empty string agendaIds if they can occur
            console.warn('An invalid agendaId was provided in the list:', agendaId)
            return Promise.resolve(undefined) // Treat as "no data found" for this specific ID
          }
          return dispatch(
            calendarItemTypeApiRtk.endpoints.getCalendarItemTypes.initiate(
              { agendaId } as CalendarItemTypeServiceParameters,
              // Optional: { forceRefetch: true } // if you want to bypass cache for sub-queries
            ),
          )
            .unwrap() // This promise resolves with CalendarItemType[] | undefined or rejects
            .catch((error) => {
              // If a specific sub-query fails, log it.
              // To ensure Promise.all doesn't fail the entire batch immediately AND
              // to match the CalendarItemType[][] output where failures become empty arrays,
              // we can return 'undefined' here. Promise.all will collect these.
              // Alternatively, if any failure should make the whole query fail, re-throw 'error'.
              console.error(`Failed to fetch CalendarItemTypes for agendaId ${agendaId}:`, error)
              return undefined // Treat as "no data" for this specific ID on error
            })
        })

        // Wait for all promises. `resultsArray` will be (CalendarItemType[] | undefined)[]
        const resultsArrayOfMaybeArrays = await Promise.all(promises)

        // Transform into CalendarItemType[][], converting undefineds to empty arrays
        const finalData: CalendarItemType[][] = resultsArrayOfMaybeArrays.map(
          (result) => result || [], // If a sub-query result was undefined (due to error or explicit return), use []
        )

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

export const { useGetCalendarItemTypesQuery, useGetCalendarItemTypesForMultipleAgendasQuery, useGetCalendarItemTypeQuery, useCreateUpdateCalendarItemTypeMutation, useDeleteCalendarItemTypeMutation } =
  calendarItemTypeApiRtk

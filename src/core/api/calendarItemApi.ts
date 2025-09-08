import { AccessLevel, CalendarItem, CalendarItemFilters, DecryptedCalendarItem, Patient } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { addDays, endOfMonth, startOfMonth, subDays } from 'date-fns'
import { cardinalApi, guard } from '../services/auth.api'
import { GetCalendarItemsByAgendaAndPeriods } from './fetchType'
import { loadFromIterator } from './utils'

enum CalendarItemTags {
  CalendarItem = 'CalendarItem',
}

export const calendarItemApiRtk = createApi({
  reducerPath: 'calendarItemApi',
  tagTypes: [CalendarItemTags.CalendarItem],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getCalendarItem: builder.query<DecryptedCalendarItem | undefined, string>({
      async queryFn(id, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<DecryptedCalendarItem> => {
          const calendarItem = await calendarApi?.getCalendarItem(id)
          if (!calendarItem) {
            throw new Error('CalendarItem does not exist')
          }
          return new DecryptedCalendarItem(calendarItem)
        })
      },
      providesTags: (res) => (res ? [{ type: CalendarItemTags.CalendarItem, id: 'all' }] : []),
    }),
    getCalendarItemByAgendaIdAndPeriod: builder.query<DecryptedCalendarItem[] | undefined, GetCalendarItemsByAgendaAndPeriods>({
      async queryFn({ agendaId, from, to }, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<DecryptedCalendarItem[]> => {
          return await loadFromIterator(await calendarApi!.filterCalendarItemsBy(CalendarItemFilters.byPeriodAndAgenda(agendaId, from, to)), 1000)
        })
      },
      providesTags: (result, error, { from, to }) => {
        const fromDate = from ? new Date(from) : subDays(startOfMonth(new Date()), 5)
        const toDate = to ? new Date(to) : addDays(endOfMonth(new Date()), 5)
        return [
          {
            type: CalendarItemTags.CalendarItem,
            id: `CALENDAR-${fromDate.getTime()}-${toDate.getTime()}`,
          },
        ]
      },
    }),
    createUpdateCalendarItem: builder.mutation<DecryptedCalendarItem | undefined, { calendarItem: DecryptedCalendarItem; patient: Patient; delegates: string[] }>({
      async queryFn({ calendarItem, patient, delegates }, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<DecryptedCalendarItem> => {
          const delegatesAcessLevel = delegates.reduce(
            (acc, currentDelegateId) => {
              acc[currentDelegateId] = AccessLevel.Write
              return acc
            },
            {} as { [key: string]: AccessLevel },
          )

          const updatedCalendarItem = !!calendarItem.rev
            ? await calendarApi?.modifyCalendarItem(calendarItem)
            : await calendarApi?.createCalendarItem(await calendarApi.withEncryptionMetadata(calendarItem, patient, { delegates: delegatesAcessLevel }))
          if (!updatedCalendarItem) {
            throw new Error('CalendarItem update failed')
          }
          return new DecryptedCalendarItem(updatedCalendarItem)
        })
      },
      invalidatesTags: () => [{ type: CalendarItemTags.CalendarItem, id: 'all' }],
    }),
    deleteCalendarItem: builder.mutation<string | undefined, DecryptedCalendarItem>({
      async queryFn(calendarItem, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async () => {
          const result = await calendarApi?.deleteCalendarItem(calendarItem)
          if (!result) {
            throw new Error('CalendarItem can’t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: (id) => [
        { type: CalendarItemTags.CalendarItem, id: 'all' },
        { type: CalendarItemTags.CalendarItem, id },
      ],
    }),
    shareCalendarItemWith: builder.mutation<DecryptedCalendarItem | undefined, { calendarItem: DecryptedCalendarItem; delegateId: string }>({
      async queryFn({ calendarItem, delegateId }, { getState }) {
        const calendarItemApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarItemApi], async (): Promise<DecryptedCalendarItem> => {
          const updatedCalendarItem = await calendarItemApi?.shareWith(delegateId, calendarItem)
          if (!updatedCalendarItem) {
            throw new Error('CalendarItem does not exist')
          }
          return new DecryptedCalendarItem(updatedCalendarItem)
        })
      },
      invalidatesTags: () => [{ type: CalendarItemTags.CalendarItem, id: 'all' }],
    }),
  }),
})

export const { useGetCalendarItemQuery, useCreateUpdateCalendarItemMutation, useDeleteCalendarItemMutation, useGetCalendarItemByAgendaIdAndPeriodQuery, useShareCalendarItemWithMutation } = calendarItemApiRtk

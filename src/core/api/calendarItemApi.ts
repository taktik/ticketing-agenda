import { CalendarItem, CalendarItemFilters, DecryptedCalendarItem } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { GetCalendarItemsByAgendaAndPeriods } from './fetchType'
import { loadFromIterator } from './utils'
import { addDays, endOfMonth, startOfMonth, subDays } from 'date-fns'

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
    getCalendarItemByAgendaIdAndPeriod: builder.query<CalendarItem[] | undefined, GetCalendarItemsByAgendaAndPeriods>({
      async queryFn({ agendaId, from, to }, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<CalendarItem[]> => {
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
    createUpdateCalendarItem: builder.mutation<DecryptedCalendarItem | undefined, DecryptedCalendarItem>({
      async queryFn(calendarItem, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<DecryptedCalendarItem> => {
          const updatedCalendarItem = !!calendarItem.rev ? await calendarApi?.modifyCalendarItem(calendarItem) : await calendarApi?.createCalendarItem(calendarItem)
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
  }),
})

export const { useGetCalendarItemQuery, useCreateUpdateCalendarItemMutation, useDeleteCalendarItemMutation, useGetCalendarItemByAgendaIdAndPeriodQuery } = calendarItemApiRtk

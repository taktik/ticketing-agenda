import { DecryptedCalendarItem } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'

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

export const { useGetCalendarItemQuery, useCreateUpdateCalendarItemMutation, useDeleteCalendarItemMutation } = calendarItemApiRtk

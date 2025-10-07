import { AccessLevel, CalendarItemFilters, DecryptedCalendarItem, Patient } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { endOfWeek, startOfWeek } from 'date-fns'
import { dateToYYYYMMDD, timestampToDate } from '../../components/common/helpers'
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
          const fromFormat = dateToYYYYMMDD(new Date(from))
          const toFormat = dateToYYYYMMDD(new Date(to))

          return await loadFromIterator(await calendarApi!.filterCalendarItemsBy(CalendarItemFilters.byPeriodAndAgenda(agendaId, fromFormat, toFormat)), 1000)
        })
      },
      providesTags: (result, error, { from, to }) => {
        return [
          {
            type: CalendarItemTags.CalendarItem,
            id: `CALENDAR-${from}-${to}`,
          },
        ]
      },
    }),
    createUpdateCalendarItem: builder.mutation<DecryptedCalendarItem | undefined, { calendarItem: DecryptedCalendarItem; patient: Patient | undefined; delegates: string[] }>({
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
      invalidatesTags: [{ type: CalendarItemTags.CalendarItem }],
    }),
    updateCalendarItem: builder.mutation<DecryptedCalendarItem | undefined, { calendarItem: DecryptedCalendarItem }>({
      async queryFn({ calendarItem }, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<DecryptedCalendarItem> => {
          if (!calendarItem.rev) {
            throw new Error('Only calendarItem update is allowed')
          }
          const updatedCalendarItem = await calendarApi?.modifyCalendarItem(calendarItem)
          if (!updatedCalendarItem) {
            throw new Error('CalendarItem update failed')
          }
          return updatedCalendarItem
        })
      },
      invalidatesTags: [{ type: CalendarItemTags.CalendarItem }],
    }),
    deleteCalendarItemById: builder.mutation<string | undefined, { calendarItemId: string; rev: string }>({
      async queryFn({ calendarItemId, rev }, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async () => {
          const result = await calendarApi?.deleteCalendarItemById(calendarItemId, rev)
          if (!result) {
            throw new Error('CalendarItem can’t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: [{ type: CalendarItemTags.CalendarItem }],
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

export const {
  useGetCalendarItemQuery,
  useCreateUpdateCalendarItemMutation,
  useGetCalendarItemByAgendaIdAndPeriodQuery,
  useShareCalendarItemWithMutation,
  useDeleteCalendarItemByIdMutation,
  useUpdateCalendarItemMutation,
} = calendarItemApiRtk

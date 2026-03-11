import { AccessLevel, CalendarItem, CalendarItemFilters, DecryptedCalendarItem, EntityReferenceInGroup, Patient, SecretIdUseOption } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { dateToYYYYMMDD } from '../../components/common/helpers'
import { cardinalApi } from '../services/auth.api'
import { GetCalendarItemsByAgendaAndPeriods } from './fetchType'
import { baseQueryWithRetry, guard, loadFromIterator } from './utils'

export enum CalendarItemTags {
  CalendarItem = 'CalendarItem',
}

export const calendarItemApiRtk = createApi({
  reducerPath: 'calendarItemApi',
  tagTypes: [CalendarItemTags.CalendarItem],
  baseQuery: baseQueryWithRetry,
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
    getCalendarItemPatientId: builder.query<string | undefined, CalendarItem>({
      async queryFn(calendarItem, { getState }) {
        const calendarApi = (await cardinalApi(getState))?.calendarItem
        return guard([calendarApi], async (): Promise<string | undefined> => {
          const entityReference = await calendarApi?.decryptPatientIdOf(calendarItem)
          if (!entityReference) {
            throw new Error('EntityReference does not exist')
          }
          return entityReference?.find((entity) => entity !== null)?.entityId
        })
      },
      providesTags: (res) => (res ? [{ type: CalendarItemTags.CalendarItem, id: 'all' }] : []),
    }),
    createUpdateCalendarItem: builder.mutation<DecryptedCalendarItem | undefined, { calendarItem: DecryptedCalendarItem; patient: Patient | undefined; delegates: { adminRootId: string; siteRootId: string } }>({
      async queryFn({ calendarItem, patient, delegates }, { getState }) {
        const { adminRootId, siteRootId } = delegates
        const api = await cardinalApi(getState)
        const calendarApi = api?.calendarItem
        const patientApi = api?.patient
        return guard([calendarApi], async (): Promise<DecryptedCalendarItem> => {
          const delegatesAcessLevel = {
            [siteRootId]: AccessLevel.Write,
            [adminRootId]: AccessLevel.Write,
          }
          if (patient?.id) {
            delegatesAcessLevel[patient.id] = AccessLevel.Write
          }
          let secretId: SecretIdUseOption = SecretIdUseOption.UseNone
          if (!calendarItem.rev && patient && patientApi) {
            try {
              const secretIds = await patientApi.getSecretIdsOf(patient)
              const firstSecretId = Object.keys(secretIds)[0]
              if (firstSecretId) {
                secretId = new SecretIdUseOption.Use({ secretIds: [firstSecretId] })
              }
            } catch {
              // Fall back to UseNone if secret IDs cannot be retrieved
            }
          }
          const updatedCalendarItem = !!calendarItem.rev
            ? await calendarApi?.modifyCalendarItem(calendarItem)
            : await calendarApi?.createCalendarItem(await calendarApi.withEncryptionMetadata(calendarItem, patient, { delegates: delegatesAcessLevel, secretId }))
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
  }),
})

export const {
  useGetCalendarItemQuery,
  useCreateUpdateCalendarItemMutation,
  useGetCalendarItemByAgendaIdAndPeriodQuery,
  useDeleteCalendarItemByIdMutation,
  useUpdateCalendarItemMutation,
  useGetCalendarItemPatientIdQuery,
} = calendarItemApiRtk

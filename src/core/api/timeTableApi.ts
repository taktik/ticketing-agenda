import { DocIdentifier, TimeTable, TimeTableFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'
import { TimeTablesServiceParameters } from './fetchType'

enum TimeTableTags {
  TimeTable = 'TimeTable',
}

export const timeTableApiRtk = createApi({
  reducerPath: 'timeTableApi',
  tagTypes: [TimeTableTags.TimeTable],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getTimeTables: builder.query<TimeTable[] | undefined, TimeTablesServiceParameters>({
      async queryFn(params, { getState }) {
        const timeTableApi = (await cardinalApi(getState))?.timeTable
        return guard([timeTableApi], async (): Promise<TimeTable[]> => {
          return await loadFromIterator(await timeTableApi!.filterTimeTablesBy(TimeTableFilters.byAgendaId(params.agendaId)), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: TimeTableTags.TimeTable, id: 'all' }] : []),
    }),
    getTimeTable: builder.query<TimeTable | undefined, string>({
      async queryFn(id, { getState }) {
        const timeTableApi = (await cardinalApi(getState))?.timeTable
        return guard([timeTableApi], async (): Promise<TimeTable> => {
          const timeTable = await timeTableApi?.getTimeTable(id)
          if (!timeTable) {
            throw new Error('TimeTable does not exist')
          }
          return new TimeTable(timeTable)
        })
      },
      providesTags: (res) => (res ? [{ type: TimeTableTags.TimeTable, id: 'all' }] : []),
    }),
    createUpdateTimeTable: builder.mutation<TimeTable | undefined, TimeTable>({
      async queryFn(timeTable, { getState }) {
        const timeTableApi = (await cardinalApi(getState))?.timeTable
        return guard([timeTableApi], async (): Promise<TimeTable> => {
          const updatedTimeTable = !!timeTable.rev ? await timeTableApi?.modifyTimeTable(timeTable) : await timeTableApi?.createTimeTable(timeTable)
          if (!updatedTimeTable) {
            throw new Error('TimeTable creation failed')
          }
          return new TimeTable(updatedTimeTable)
        })
      },
      invalidatesTags: (result, error, arg) => (result ? [{ type: TimeTableTags.TimeTable, id: 'all' }] : []),
    }),
    deleteTimeTable: builder.mutation<string | undefined, TimeTable>({
      async queryFn(timeTable, { getState }) {
        const timeTableApi = (await cardinalApi(getState))?.timeTable
        return guard([timeTableApi], async () => {
          const result = await timeTableApi?.deleteTimeTable(timeTable)
          if (!result) {
            throw new Error('TimeTable can`t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: (id) => [
        { type: TimeTableTags.TimeTable, id: 'all' },
        { type: TimeTableTags.TimeTable, id: id },
      ],
    }),
    deleteTimeTables: builder.mutation<DocIdentifier[] | undefined, TimeTable[]>({
      async queryFn(timeTables, { getState }) {
        const timeTableApi = (await cardinalApi(getState))?.timeTable
        return guard([timeTableApi], async () => {
          const result = await timeTableApi?.deleteTimeTables(timeTables)
          if (!result) {
            throw new Error('TimeTable can`t be deleted')
          }
          return result
        })
      },
      invalidatesTags: () => [{ type: TimeTableTags.TimeTable, id: 'all' }],
    }),
  }),
})

export const { useGetTimeTablesQuery, useGetTimeTableQuery, useCreateUpdateTimeTableMutation, useDeleteTimeTableMutation, useDeleteTimeTablesMutation } = timeTableApiRtk

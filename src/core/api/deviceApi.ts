import { Device, DeviceFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator, tagsByIds } from './utils'

export const deviceApiRtk = createApi({
  reducerPath: 'deviceApi',
  tagTypes: ['Device'],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getDevices: builder.query<Device[] | undefined, void>({
      async queryFn(_, { getState }) {
        const deviceApi = (await cardinalApi(getState))?.device
        return guard([deviceApi], async (): Promise<Device[]> => {
          return await loadFromIterator(await deviceApi!.filterDevicesBy(DeviceFilters.all()), 1000)
        })
      },
      providesTags: tagsByIds('Device'),
    }),
  }),
})

export const { useGetDevicesQuery } = deviceApiRtk

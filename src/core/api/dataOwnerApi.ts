import { DataOwnerWithType, Device, EncryptedPatient, HealthcareParty } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { cardinalApi } from '../services/auth.api'
import { roleTypeMap, UserRole } from './roleApi'
import { baseQueryWithRetry, guard } from './utils'

enum dataOwnerTypeTag {
  DataOwnerType = 'DataOwnerTypeTag',
}

export interface DataOwnerWithRole {
  dataOwner: Device | EncryptedPatient | HealthcareParty
  role: UserRole | undefined
}

export const dataOwnerApiRtk = createApi({
  reducerPath: 'dataOwnerTypeApi',
  tagTypes: [dataOwnerTypeTag.DataOwnerType],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    getCurrentDataOwner: builder.query<DataOwnerWithType | undefined, void>({
      async queryFn(_, { getState }) {
        const dataOwnerTypeApi = (await cardinalApi(getState))?.dataOwner
        return guard([dataOwnerTypeApi], async (): Promise<DataOwnerWithType> => {
          return await dataOwnerTypeApi!.getCurrentDataOwner()
        })
      },
      providesTags: (res) => (res ? [{ type: dataOwnerTypeTag.DataOwnerType, id: 'all' }] : []),
    }),
    getCurrentDataOwnerRole: builder.query<DataOwnerWithRole | undefined, void>({
      async queryFn(_, { getState }) {
        const dataOwnerTypeApi = (await cardinalApi(getState))?.dataOwner
        return guard([dataOwnerTypeApi], async (): Promise<DataOwnerWithRole> => {
          const currentDataOwner = await dataOwnerTypeApi!.getCurrentDataOwner()
          const roleTag = currentDataOwner.dataOwner.tags?.find((tag) => tag.type && roleTypeMap[tag.type])
          const role = roleTag && roleTag.type ? roleTypeMap[roleTag.type] : undefined
          return {
            dataOwner: currentDataOwner.dataOwner,
            role: role,
          }
        })
      },
      providesTags: (res) => (res ? [{ type: dataOwnerTypeTag.DataOwnerType, id: 'all' }] : []),
    }),
  }),
})

export const { useGetCurrentDataOwnerQuery, useGetCurrentDataOwnerRoleQuery } = dataOwnerApiRtk

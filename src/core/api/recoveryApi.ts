import { RecoveryDataKey } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'

export const recoveryApiRtk = createApi({
  reducerPath: 'recoveryApi',
  tagTypes: ['Recovery'],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    createExchangeDataRecovery: builder.mutation<RecoveryDataKey | undefined, string>({
      async queryFn(delegateId, { getState }) {
        const recoveryApi = (await cardinalApi(getState))?.recovery
        return guard([recoveryApi], async (): Promise<RecoveryDataKey> => {
          const recoveryDataKey = await recoveryApi?.createExchangeDataRecoveryInfo(delegateId)
          if (!recoveryDataKey) {
            throw new Error('Error creating exchange datas')
          }
          return recoveryDataKey
        })
      },
    }),
  }),
})

export const { useCreateExchangeDataRecoveryMutation } = recoveryApiRtk

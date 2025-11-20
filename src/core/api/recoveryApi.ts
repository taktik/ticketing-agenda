import { RecoveryDataKey } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { cardinalApi } from '../services/auth.api'
import { baseQueryWithRetry, guard } from './utils'

export const recoveryApiRtk = createApi({
  reducerPath: 'recoveryApi',
  tagTypes: ['Recovery'],
  baseQuery: baseQueryWithRetry,
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

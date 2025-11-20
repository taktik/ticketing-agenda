import { DesignDocument } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { DATABASE_ID } from '../../constants'
import { cardinalApi } from '../services/auth.api'
import { baseQueryWithRetry, guard } from './utils'

export const groupApiRtk = createApi({
  reducerPath: 'groupApi',
  tagTypes: ['Group'],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    initDesignDoc: builder.mutation<DesignDocument[] | undefined, void>({
      async queryFn(_, { getState }) {
        const groupApi = (await cardinalApi(getState))?.group
        return guard([groupApi], async (): Promise<DesignDocument[]> => {
          const result = await groupApi?.initDesignDocs(DATABASE_ID!, true, false)
          if (!result) {
            throw new Error('Error during init design docs')
          }
          return result
        })
      },
    }),
  }),
})

export const { useInitDesignDocMutation } = groupApiRtk

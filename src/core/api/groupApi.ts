import { DesignDocument } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { DATABASE_ID } from '../../constants'

export const groupApiRtk = createApi({
  reducerPath: 'groupApi',
  tagTypes: ['Group'],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
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

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { DesignDocument, Device, DeviceFilters } from '@icure/cardinal-sdk'
import { loadFromIterator, tagsByIds } from './utils'

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
          const result = await groupApi?.initDesignDocs('ic-taktikticketingagendamouscron-f7627de4-d674-4443-9987-2cc5c0d793b1', true, false)
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

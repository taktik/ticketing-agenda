import { DecryptedHealthElement, DecryptedPatient } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'

export const healthElementApiRtk = createApi({
  reducerPath: 'healthElementApi',
  tagTypes: ['HealthElement'],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    createHealthElement: builder.mutation<DecryptedHealthElement | undefined, { patient: DecryptedPatient; healthElement: DecryptedHealthElement }>({
      async queryFn({ patient, healthElement }, { getState }) {
        const healthElementApi = (await cardinalApi(getState))?.healthElement
        return guard([healthElementApi], async (): Promise<DecryptedHealthElement | undefined> => {
          const healthElementWithMetadata = await healthElementApi?.withEncryptionMetadata(healthElement, patient)

          if (!healthElementWithMetadata) {
            throw new Error('Error while creating healthElementWithMetadata')
          }

          return await healthElementApi?.createHealthElement(healthElementWithMetadata)
        })
      },

      invalidatesTags: (result) =>
        !!result
          ? [
              { type: 'HealthElement', id: 'all' },
              { type: 'HealthElement', id: result.id },
            ]
          : [],
    }),
    getHealthElements: builder.query<DecryptedHealthElement[] | undefined, string[]>({
      async queryFn(entityIds, { getState }) {
        const healthElementApi = (await cardinalApi(getState))?.healthElement
        return guard([healthElementApi], async (): Promise<Array<DecryptedHealthElement> | undefined> => {
          return await healthElementApi?.getHealthElements(entityIds)
        })
      },
      providesTags: (res) =>
        res
          ? [
              { type: 'HealthElement', id: 'all' },
              ...res.map((healthElement) => {
                return {
                  type: 'HealthElement',
                  id: healthElement.id,
                } as { type: 'HealthElement'; id: string }
              }),
            ]
          : [],
    }),
  }),
})

export const { useCreateHealthElementMutation, useGetHealthElementsQuery } = healthElementApiRtk

import { HealthcareParty } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'

enum HealthcarePartyTags {
  HealthcareParty = 'HealthcareParty',
}

export const healthcarePartyApiRtk = createApi({
  reducerPath: 'healthcarePartyApi',
  tagTypes: [HealthcarePartyTags.HealthcareParty],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getHealthcareParty: builder.query<HealthcareParty | undefined, string>({
      async queryFn(id, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const hcp = await hcpApi?.getHealthcareParty(id)
          if (!hcp) {
            throw new Error('HealthcareParty does not exist')
          }
          return new HealthcareParty(hcp)
        })
      },
      providesTags: (res) => (res ? [{ type: HealthcarePartyTags.HealthcareParty, id: res.id }] : []),
    }),

    createHealthcareParty: builder.mutation<HealthcareParty | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const newHcp = await hcpApi?.createHealthcareParty(hcp)
          if (!newHcp) {
            throw new Error('HealthcareParty creation failed')
          }
          return new HealthcareParty(newHcp)
        })
      },
      invalidatesTags: () => [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }],
    }),

    updateHealthcareParty: builder.mutation<HealthcareParty | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const updatedHcp = await hcpApi?.modifyHealthcareParty(hcp)
          if (!updatedHcp) {
            throw new Error('HealthcareParty update failed')
          }
          return new HealthcareParty(updatedHcp)
        })
      },
      invalidatesTags: () => [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }],
    }),

    deleteHealthcareParty: builder.mutation<string | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async () => {
          const result = await hcpApi?.deleteHealthcareParty(hcp)
          if (!result) {
            throw new Error('HealthcareParty can’t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: (id) => [
        { type: HealthcarePartyTags.HealthcareParty, id: 'all' },
        { type: HealthcarePartyTags.HealthcareParty, id },
      ],
    }),
  }),
})

export const { useGetHealthcarePartyQuery, useCreateHealthcarePartyMutation, useUpdateHealthcarePartyMutation, useDeleteHealthcarePartyMutation } = healthcarePartyApiRtk

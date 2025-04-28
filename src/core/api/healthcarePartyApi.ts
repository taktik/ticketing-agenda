import { HealthcareParty, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'
import { GetHealthcarePartyByParentParameters, GetRootHealthcarePartyParameters } from './fetchType'

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
    getHealthcareParties: builder.query<HealthcareParty[] | undefined, undefined>({
      async queryFn(_, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.all()), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getHealthcarePartiesByParent: builder.query<HealthcareParty[] | undefined, GetHealthcarePartyByParentParameters>({
      async queryFn(params, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.byParentId(params.parentId)), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getRootHealthcareParty: builder.query<HealthcareParty[] | undefined, undefined>({
      async queryFn(_, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.byName('Mouscron')), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
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
    createUpdateHealthcareParty: builder.mutation<HealthcareParty | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const updatedHcp = !!hcp.rev ? await hcpApi?.modifyHealthcareParty(hcp) : await hcpApi?.createHealthcareParty(hcp)
          if (!updatedHcp) {
            throw new Error('HealthcareParty creation failed')
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

export const {
  useGetHealthcarePartiesQuery,
  useGetHealthcarePartiesByParentQuery,
  useGetRootHealthcarePartyQuery,
  useGetHealthcarePartyQuery,
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
} = healthcarePartyApiRtk

export const useGetRootHealthcareParty = (params: GetRootHealthcarePartyParameters) => {
  const { data, ...rest } = useGetRootHealthcarePartyQuery(undefined, {
    skip: params.skip,
  })

  const root = data ? data[0] : undefined

  return {
    data: root,
    ...rest,
  }
}

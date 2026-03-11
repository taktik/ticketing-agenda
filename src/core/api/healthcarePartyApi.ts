import { HealthcareParty, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { useMemo } from 'react'
import { cardinalApi } from '../services/auth.api'
import { GetHealthcarePartyByParentParameters, GetRootHealthcarePartyParameters, UndeleteHcpByIdParameters } from './fetchType'
import { allRoleTags } from './roleApi'
import { baseQueryWithRetry, guard, loadFromIterator } from './utils'

enum HealthcarePartyTags {
  HealthcareParty = 'HealthcareParty',
}

export const healthcarePartyApiRtk = createApi({
  reducerPath: 'healthcarePartyApi',
  tagTypes: [HealthcarePartyTags.HealthcareParty],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    getCurrentHealthcareParty: builder.query<HealthcareParty | undefined, void>({
      async queryFn(_, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const hcp = await hcpApi?.getCurrentHealthcareParty()
          if (!hcp) {
            throw new Error('HealthcareParty does not exist')
          }
          return hcp
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getHealthcareParties: builder.query<HealthcareParty[] | undefined, undefined>({
      async queryFn(_, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.all()), 1000)
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getHealthcarePartiesByParent: builder.query<HealthcareParty[] | undefined, GetHealthcarePartyByParentParameters>({
      async queryFn(params, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.byParentId(params.parentId)), 1000)
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getHealthcarePartiesByIds: builder.query<HealthcareParty[] | undefined, string[]>({
      async queryFn(ids, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          const hcps = await hcpApi?.getHealthcareParties(ids)
          if (!hcps) {
            throw new Error('HealthcareParty does not exist')
          }
          return hcps
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getHealthcarePartyByTag: builder.query<HealthcareParty[] | undefined, string>({
      async queryFn(rootType, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.byTag(rootType)), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
      keepUnusedDataFor: Infinity,
    }),
    getHealthcareParty: builder.query<HealthcareParty | undefined, string>({
      async queryFn(id, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const hcp = await hcpApi?.getHealthcareParty(id)
          if (!hcp) {
            throw new Error('HealthcareParty does not exist')
          }
          return hcp
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    getHealthcarePartyByName: builder.query<HealthcareParty[] | undefined, string>({
      async queryFn(rootType, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.byName(rootType)), 1000)
        })
      },
      providesTags: (res) => (res ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
      keepUnusedDataFor: Infinity,
    }),
    createUpdateHealthcareParty: builder.mutation<HealthcareParty | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty> => {
          const updatedHcp = !!hcp.rev ? await hcpApi?.modifyHealthcareParty(hcp) : await hcpApi?.createHealthcareParty(hcp)
          if (!updatedHcp) {
            throw new Error('HealthcareParty creation failed')
          }
          return updatedHcp
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
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
      invalidatesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    deleteHealthcareParties: builder.mutation<boolean | undefined, HealthcareParty[]>({
      async queryFn(hcps, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async () => {
          const result = await hcpApi?.deleteHealthcareParties(hcps)
          if (!result) {
            throw new Error('HealthcareParties can’t be deleted')
          }
          return true
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    silentDeleteHealthcareParty: builder.mutation<string | undefined, HealthcareParty>({
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
    }),
    unDeleteHealthcareParty: builder.mutation<string | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async () => {
          const result = await hcpApi?.undeleteHealthcareParty(hcp)
          if (!result) {
            throw new Error('HealthcareParty can’t be recovered')
          }
          return result.id
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    unDeleteHealthcarePartyById: builder.mutation<string | undefined, UndeleteHcpByIdParameters>({
      async queryFn(params, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async () => {
          const result = await hcpApi?.undeleteHealthcarePartyById(params.HcpId, params.rev)
          if (!result) {
            throw new Error('HealthcareParty can’t be recovered')
          }
          return result.id
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: 'all' }] : []),
    }),
    silentUnDeleteHealthcareParty: builder.mutation<string | undefined, HealthcareParty>({
      async queryFn(hcp, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async () => {
          const result = await hcpApi?.undeleteHealthcareParty(hcp)
          if (!result) {
            throw new Error('HealthcareParty can’t be recovered')
          }
          return result.id
        })
      },
    }),
  }),
})

export const {
  useGetHealthcarePartiesQuery,
  useLazyGetHealthcarePartiesQuery,
  useGetHealthcarePartiesByParentQuery,
  useGetHealthcarePartiesByIdsQuery,
  useGetHealthcarePartyByTagQuery,
  useGetHealthcarePartyQuery,
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useDeleteHealthcarePartiesMutation,
  useSilentDeleteHealthcarePartyMutation,
  useUnDeleteHealthcarePartyMutation,
  useUnDeleteHealthcarePartyByIdMutation,
  useSilentUnDeleteHealthcarePartyMutation,
  useGetHealthcarePartyByNameQuery,
  useGetCurrentHealthcarePartyQuery,
} = healthcarePartyApiRtk

export const useGetRootHealthcareParty = (params: GetRootHealthcarePartyParameters) => {
  const { data, ...rest } = useGetHealthcarePartyByTagQuery(params.rootType, {
    skip: params.skip,
  })

  const root = data ? data[0] : undefined

  return {
    data: root,
    ...rest,
  }
}

export const useGetHealthcarePartyUsers = () => {
  const data1 = useGetHealthcarePartyByTagQuery(allRoleTags[0]?.type ?? '', { skip: !allRoleTags[0]?.type })
  const data2 = useGetHealthcarePartyByTagQuery(allRoleTags[1]?.type ?? '', { skip: !allRoleTags[1]?.type })
  const data3 = useGetHealthcarePartyByTagQuery(allRoleTags[2]?.type ?? '', { skip: !allRoleTags[2]?.type })

  const isLoading = data1.isLoading || data2.isLoading || data3.isLoading

  // Only combine data once all queries have settled to prevent cascade re-fetching of downstream queries
  const combinedData = useMemo(() => {
    if (isLoading) return []
    return [...(data1.data ?? []), ...(data2.data ?? []), ...(data3.data ?? [])]
  }, [isLoading, data1.data, data2.data, data3.data])

  return { data: combinedData, isLoading }
}

import { HealthcareParty, HealthcarePartyFilters, AgendaFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { useCallback, useState } from 'react'
import { useAppDispatch } from '../hooks'
import { cardinalApi, guard } from '../services/auth.api'
import { agendaApiRtk, useDeleteAgendaMutation } from './agendaApi'
import { GetAllServiceBySiteIdParameters, GetHealthcarePartyByParentParameters, GetRootHealthcarePartyParameters, GetServicesForMultipleSitesParameters, UndeleteHcpByIdParameters } from './fetchType'
import { loadFromIterator } from './utils'

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
    getServicesForMultipleSites: builder.query<HealthcareParty[], GetServicesForMultipleSitesParameters>({
      async queryFn(params, { getState, dispatch }) {
        const { siteIds } = params
        if (!siteIds || siteIds.length === 0) {
          return { data: [] as HealthcareParty[] }
        }

        const promises: Promise<HealthcareParty[] | undefined>[] = siteIds.map((siteId) =>
          dispatch(healthcarePartyApiRtk.endpoints.getHealthcarePartiesByParent.initiate({ parentId: siteId }, { forceRefetch: true }))
            .unwrap()
            .catch((error: unknown) => {
              console.error(`Failed to fetch services for site ID ${siteId}:`, error)
              return undefined
            }),
        )

        try {
          const resultArray = await Promise.all(promises)
          const finalData: HealthcareParty[] = resultArray.map((result) => result || []).flat()
          return { data: finalData }
        } catch (error: unknown) {
          const err = error as { message?: string }
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Batch fetch for services failed.' } as FetchBaseQueryError }
        }
      },
      providesTags: (result, error, arg) => (result ? arg.siteIds.map((id) => ({ type: HealthcarePartyTags.HealthcareParty, id: 'all' })) : []),
    }),
    getRootHealthcareParty: builder.query<HealthcareParty[] | undefined, undefined>({
      async queryFn(_, { getState }) {
        const hcpApi = (await cardinalApi(getState))?.healthcareParty
        return guard([hcpApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await hcpApi!.filterHealthPartiesBy(HealthcarePartyFilters.byTag('root-hcp')), 1000)
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
          return hcp
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: HealthcarePartyTags.HealthcareParty, id: res.id }] : []),
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
      invalidatesTags: () => [],
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
      invalidatesTags: () => [],
    }),
  }),
})

export const {
  useGetHealthcarePartiesQuery,
  useGetHealthcarePartiesByParentQuery,
  useGetHealthcarePartiesByIdsQuery,
  useGetRootHealthcarePartyQuery,
  useGetHealthcarePartyQuery,
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useSilentDeleteHealthcarePartyMutation,
  useUnDeleteHealthcarePartyMutation,
  useUnDeleteHealthcarePartyByIdMutation,
  useSilentUnDeleteHealthcarePartyMutation,
  useGetServicesForMultipleSitesQuery,
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

export const useGetAllServiceBySiteId = (params: GetAllServiceBySiteIdParameters) => {
  const { data, ...rest } = useGetHealthcarePartiesQuery(undefined, {
    skip: params.skip,
  })

  const result = data?.filter((item) => item.parentId && params.sitesIds.includes(item.parentId)) ?? []

  return {
    data: result,
    ...rest,
  }
}

export const useRecursiveHcpDeletion = () => {
  const dispatch = useAppDispatch()
  const [deleteHcpMutation] = useDeleteHealthcarePartyMutation()
  const [deleteAgendaMutation] = useDeleteAgendaMutation()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Wrap the function you return in useCallback.
  const startRecursiveHcpDeletion = useCallback(
    async (hcp: HealthcareParty) => {
      console.log(`[Hook] Starting recursive deletion for initial HCP ID: ${hcp.id}`)
      setIsLoading(true)
      setError(null)
      setIsSuccess(false)

      try {
        // We need to define the internal function inside or make it a stable dependency.
        // Let's define it inside for simplicity, or you could wrap it in its own useCallback.
        const deleteInternal = async (currentHcp: HealthcareParty): Promise<void> => {
          // --- 1. Fetch and process children ---
          const childrenResult = (await dispatch(healthcarePartyApiRtk.endpoints.getHealthcarePartiesByParent.initiate({ parentId: currentHcp.id })).unwrap()) ?? []
          if (childrenResult.length > 0) {
            for (const child of childrenResult) {
              await deleteInternal(child)
            }
          }
          // --- 2. Fetch and delete agenda ---
          const allAgendas = (await dispatch(agendaApiRtk.endpoints.getAgendas.initiate()).unwrap()) ?? []
          const agenda = allAgendas.find((a) => a.author === currentHcp.id)
          if (agenda?.id) {
            await deleteAgendaMutation(agenda).unwrap()
          }
          // --- 3. Delete HCP itself ---
          await deleteHcpMutation(currentHcp).unwrap()
        }

        await deleteInternal(hcp)

        console.log(`[Hook] Recursive deletion completed successfully for initial HCP ID: ${hcp.id}`)
        setIsSuccess(true)
      } catch (err) {
        console.error(`[Hook] Recursive deletion failed starting from HCP ID ${hcp.id}. Error:`, err)
        setError(err)
        setIsSuccess(false)
      } finally {
        console.log(`[Hook] Finished recursive deletion attempt for initial HCP ID: ${hcp.id}. Loading: false.`)
        setIsLoading(false)
      }
    },
    [dispatch, deleteHcpMutation, deleteAgendaMutation],
  ) // Dependencies for the callback

  return {
    deleteHcpRecursively: startRecursiveHcpDeletion,
    isLoading,
    isSuccess,
    error,
  }
}

import { HealthcareParty, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'
import { GetAllServiceBySiteIdParameters, GetHealthcarePartyByParentParameters, GetRootHealthcarePartyParameters } from './fetchType'
import { agendaApiRtk, useDeleteAgendaByAuthorId, useDeleteAgendaMutation, useGetAgendaByAuthorId } from './agendaApi'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { healthElementApiRtk } from './healthElementApi'
import { useAppDispatch } from '../hooks'

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

export const { useGetHealthcarePartiesQuery, useGetHealthcarePartiesByParentQuery, useGetRootHealthcarePartyQuery, useGetHealthcarePartyQuery, useCreateUpdateHealthcarePartyMutation, useDeleteHealthcarePartyMutation } =
  healthcarePartyApiRtk

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

  const deleteHcpRecursivelyInternal = async (hcp: HealthcareParty): Promise<void> => {
    console.log(`[Internal] Processing HCP ID: ${hcp.id}`)

    // --- 1. Fetch and process children ---
    let childrenResult: HealthcareParty[] = []
    try {
      console.log(`[Internal] Fetching children for HCP ID: ${hcp.id}`)
      childrenResult = (await dispatch(healthcarePartyApiRtk.endpoints.getHealthcarePartiesByParent.initiate({ parentId: hcp.id })).unwrap()) ?? []
      console.log(`[Internal] Found ${childrenResult.length} children for HCP ID: ${hcp.id}`)
    } catch (fetchChildrenErr) {
      console.error(`[Internal] Failed to fetch children for HCP ID ${hcp.id}:`, fetchChildrenErr)
      throw fetchChildrenErr // Propagate error to stop the process for this branch
    }

    // Recursively delete children if any were found
    if (childrenResult.length > 0) {
      console.log(`[Internal] Starting recursive deletion for ${childrenResult.length} children of HCP ID: ${hcp.id}`)
      for (const child of childrenResult) {
        await deleteHcpRecursivelyInternal(child) // Errors from child deletion will propagate up
      }
      console.log(`[Internal] Finished recursive deletion for children of HCP ID: ${hcp.id}`)
    }

    // --- 2. Fetch and delete agenda ---
    console.log(`[Internal] Handling agenda for HCP ID: ${hcp.id}`)
    try {
      // Fetching all agendas to find one is inefficient - consider a specific endpoint if possible
      const allAgendas = (await dispatch(agendaApiRtk.endpoints.getAgendas.initiate()).unwrap()) ?? []
      const agenda = allAgendas.find((a) => a.author === hcp.id)

      if (agenda?.id) {
        console.log(`[Internal] Found agenda ID ${agenda.id} for HCP ID ${hcp.id}. Attempting deletion...`)
        // Pass only the necessary identifier if the mutation expects it (e.g., { agendaId: agenda.id })
        await deleteAgendaMutation(agenda).unwrap()
        console.log(`[Internal] Successfully deleted agenda ID: ${agenda.id}`)
      } else {
        console.log(`[Internal] No matching agenda found for HCP ID: ${hcp.id}`)
      }
    } catch (agendaErr: unknown) {
      let status: number | undefined
      if (typeof agendaErr === 'object' && agendaErr != null && 'status' in agendaErr) {
        status = (agendaErr as FetchBaseQueryError).status as number
      }

      if (status === 404) {
        // Log 404 specifically if it occurs during the getAgendas or deleteAgenda calls
        console.log(`[Internal] Agenda operation resulted in 404 for HCP ID ${hcp.id} (might be expected if no agenda exists).`)
      } else {
        // Log other errors encountered during agenda fetch or delete
        console.error(`[Internal] Error during agenda fetch/delete for HCP ID ${hcp.id}:`, agendaErr)
        if (agendaErr instanceof Error) {
          console.error('Error message:', agendaErr.message)
        }
        throw agendaErr // Re-throw the error to stop the process for this HCP
      }
    }

    // --- 3. Delete HCP itself ---
    try {
      console.log(`[Internal] Deleting HCP ID: ${hcp.id}`)
      // Pass only the necessary identifier if the mutation expects it (e.g., { hcpId: hcp.id })
      await deleteHcpMutation(hcp).unwrap()
      console.log(`[Internal] Successfully deleted HCP ID: ${hcp.id}`)
    } catch (deleteHcpErr) {
      console.error(`[Internal] Failed to delete HCP ID ${hcp.id}:`, deleteHcpErr)
      throw deleteHcpErr // Propagate error
    }
  }

  const startRecursiveHcpDeletion = async (hcp: HealthcareParty) => {
    console.log(`[Hook] Starting recursive deletion for initial HCP ID: ${hcp.id}`)
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      await deleteHcpRecursivelyInternal(hcp)
      console.log(`[Hook] Recursive deletion completed successfully for initial HCP ID: ${hcp.id}`)
      setIsSuccess(true)
    } catch (err) {
      // Log the overall failure of the process initiated by the hook
      console.error(`[Hook] Recursive deletion failed starting from HCP ID ${hcp.id}. Error:`, err)
      setError(err)
      setIsSuccess(false)
    } finally {
      console.log(`[Hook] Finished recursive deletion attempt for initial HCP ID: ${hcp.id}. Loading: false.`)
      setIsLoading(false)
    }
  }

  return {
    deleteHcpRecursively: startRecursiveHcpDeletion,
    isLoading,
    isSuccess,
    error,
  }
}

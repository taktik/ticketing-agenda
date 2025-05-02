import { HealthcareParty, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator } from './utils'
import { GetAllServiceBySiteIdParameters, GetHealthcarePartyByParentParameters, GetRootHealthcarePartyParameters } from './fetchType'
import { useDeleteAgendaMutation, useGetAgendaByAuthorId } from './agendaApi'

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

const deleteHcpRecursively = async (hcp: HealthcareParty) => {
  // Delete the healthcareParty and all its associated children (healthcare parties that have their parentId field set)
  const { data: childrenHcp = [] } = useGetHealthcarePartiesByParentQuery({ skip: !hcp, parentId: hcp.id })
  const { data: agenda } = useGetAgendaByAuthorId({ skip: !hcp, authorId: hcp.id })
  const [deleteHealthcareParty, { isError, isSuccess, isLoading }] = useDeleteHealthcarePartyMutation()

  // Step 2: Recursively delete each child
  for (const child of childrenHcp) {
    await deleteHcpRecursively(child)
  }

  // Step 3: Delete the current Hcp
  await deleteHealthcareParty(hcp)
}

export const useRecursiveHcpDeletion = () => {
  const [deleteHcp] = useDeleteHealthcarePartyMutation()
  const [deleteAgenda] = useDeleteAgendaMutation()
  const getChildren = useGetHealthcarePartiesByParentQuery
  const getAgenda = useGetAgendaByAuthorId

  const deleteHcpRecursively = async (hcp: HealthcareParty) => {
    // 1. Fetch children
    const { data: children } = await getChildren({ parentId: hcp.id })
    if (children && children.length > 0) {
      for (const child of children) {
        await deleteHcpRecursively(child)
      }
    }

    // 2. Fetch and delete agenda (if any)
    const { data: agenda } = await getAgenda({ skip: !hcp, authorId: hcp.id })
    if (agenda) {
      await deleteAgenda(agenda).unwrap()
    }

    // 3. Delete this Hcp
    await deleteHcp(hcp).unwrap()
  }

  return { deleteHcpRecursively }
}

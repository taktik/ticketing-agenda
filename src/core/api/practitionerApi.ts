import { HealthcareParty, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cardinalApi, guard } from '../services/auth.api'
import { loadFromIterator, tagsByIds } from './utils'

export const practitionerApiRtk = createApi({
  reducerPath: 'practitionerApi',
  tagTypes: ['Practitioner'],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    getPractitioner: builder.query<HealthcareParty | undefined, string>({
      async queryFn(id, { getState }) {
        const practitionerApi = (await cardinalApi(getState))?.healthcareParty
        return guard([practitionerApi], async (): Promise<HealthcareParty> => {
          const practitioner = await practitionerApi?.getHealthcareParty(id)
          if (!practitioner) {
            throw new Error('Practitioner does not exist')
          }
          return practitioner
        })
      },
      providesTags: (res) => (res ? [{ type: 'Practitioner', id: res.id }] : []),
    }),
    filterPractitionersByName: builder.query<HealthcareParty[] | undefined, string>({
      async queryFn(name, { getState }) {
        const practitionerApi = (await cardinalApi(getState))?.healthcareParty
        return guard([practitionerApi], async (): Promise<HealthcareParty[]> => {
          return await loadFromIterator(await practitionerApi!.filterHealthPartiesBy(HealthcarePartyFilters.byName(name)), 1000)
        })
      },
      providesTags: tagsByIds('Practitioner'),
    }),
    createOrUpdatePractitioner: builder.mutation<HealthcareParty | undefined, HealthcareParty>({
      async queryFn(practitioner, { getState }) {
        const practitionerApi = (await cardinalApi(getState))?.healthcareParty
        return guard([practitionerApi], async (): Promise<HealthcareParty> => {
          const updatedPractitioner = !!practitioner.rev ? await practitionerApi?.modifyHealthcareParty(practitioner) : await practitionerApi?.createHealthcareParty(practitioner)
          if (!updatedPractitioner) {
            throw new Error('Practitioner does not exist')
          }
          return updatedPractitioner
        })
      },
      invalidatesTags: (result) =>
        !!result
          ? [
              { type: 'Practitioner', id: 'all' },
              { type: 'Practitioner', id: result.id },
            ]
          : [],
    }),
  }),
})

export const { useGetPractitionerQuery, useFilterPractitionersByNameQuery, useCreateOrUpdatePractitionerMutation } = practitionerApiRtk

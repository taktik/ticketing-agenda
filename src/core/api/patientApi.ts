import { AccessLevel, DecryptedPatient, EncryptedPatient, PatientFilters } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { cardinalApi } from '../services/auth.api'
import { baseQueryWithRetry, guard, loadFromIterator } from './utils'

enum PatientTags {
  Patient = 'Patient',
}

export const patientApiRtk = createApi({
  reducerPath: 'patientApi',
  tagTypes: [PatientTags.Patient],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    createDecryptedPatient: builder.mutation<DecryptedPatient | undefined, { patient: DecryptedPatient; delegates: { adminRootId: string; siteRootId: string } }>({
      async queryFn({ patient, delegates }, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient> => {
          const createdPatient = await patientApi?.createPatient(
            await patientApi?.withEncryptionMetadata(patient, {
              delegates: { [delegates.siteRootId]: AccessLevel.Write, [delegates.adminRootId]: AccessLevel.Write },
            }),
          )
          if (!createdPatient) {
            throw new Error("Couldn't create the citizen")
          }
          return new DecryptedPatient(createdPatient)
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    updateEncryptedPatient: builder.mutation<EncryptedPatient | undefined, EncryptedPatient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<EncryptedPatient> => {
          const updatedPatient = await patientApi?.encrypted.modifyPatient(patient)
          if (!updatedPatient) {
            throw new Error("Couldn't update the citizen")
          }
          return new EncryptedPatient(updatedPatient)
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    getEncryptedPatientById: builder.query<EncryptedPatient | undefined, string>({
      async queryFn(patientId, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<EncryptedPatient> => {
          const patient = await patientApi!.encrypted.getPatient(patientId)
          if (!patient) {
            throw new Error('Citizen not found')
          }
          return patient
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    searchPatients: builder.query<DecryptedPatient[] | undefined, { searchTerm: string; dataOwnerId: string }>({
      async queryFn({ searchTerm, dataOwnerId }, { getState }) {
        const api = await cardinalApi(getState)
        const patientApi = api?.patient
        return guard([patientApi, dataOwnerId], async (): Promise<DecryptedPatient[]> => {
          const words = searchTerm.trim().split(/\s+/).filter(Boolean)
          const telecomFilter = PatientFilters.byTelecomForDataOwner(dataOwnerId!, searchTerm)

          const nameSearchPromise = (async () => {
            if (words.length <= 1) {
              return patientApi!.filterPatientsBy(PatientFilters.byFuzzyNameForDataOwner(dataOwnerId!, searchTerm)).then((iter) => loadFromIterator(iter, 50))
            }
            // Multi-word: search each word, intersect results (patient must match ALL words)
            const perWordResults = await Promise.all(words.map((word) => patientApi!.filterPatientsBy(PatientFilters.byFuzzyNameForDataOwner(dataOwnerId!, word)).then((iter) => loadFromIterator(iter, 50))))
            const idSets = perWordResults.map((results) => new Set(results.map((p) => p.id)))
            const intersection = idSets.reduce((acc, set) => {
              const filtered = new Set<string>()
              acc.forEach((id) => {
                if (set.has(id)) filtered.add(id)
              })
              return filtered
            })
            const firstResults = perWordResults[0] ?? []
            return firstResults.filter((p) => intersection.has(p.id))
          })()

          const [nameResults, telecomResults] = await Promise.all([
            nameSearchPromise,
            patientApi!
              .filterPatientsBy(telecomFilter)
              .then((iter) => loadFromIterator(iter, 50))
              .catch(() => [] as DecryptedPatient[]),
          ])

          const seen = new Set<string>()
          const merged: DecryptedPatient[] = []
          for (const patient of [...nameResults, ...telecomResults]) {
            if (!seen.has(patient.id)) {
              seen.add(patient.id)
              merged.push(patient)
            }
          }
          return merged
        })
      },
      providesTags: [{ type: PatientTags.Patient, id: 'search' }],
    }),
    initializeExchangeData: builder.mutation<boolean | undefined, string>({
      async queryFn(patientId, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<boolean> => {
          const isInitialized = await patientApi?.forceInitializeExchangeDataToNewlyInvitedPatient(patientId)
          if (!isInitialized) {
            throw new Error("Couldn't initialize the citizen exchange data")
          }
          return isInitialized
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
  }),
})

export const { useCreateDecryptedPatientMutation, useUpdateEncryptedPatientMutation, useGetEncryptedPatientByIdQuery, useLazyGetEncryptedPatientByIdQuery, useInitializeExchangeDataMutation, useLazySearchPatientsQuery } =
  patientApiRtk

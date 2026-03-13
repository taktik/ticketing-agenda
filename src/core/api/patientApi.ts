import { DecryptedPatient, EncryptedPatient, PatientFilters } from '@icure/cardinal-sdk'
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
    createDecryptedPatient: builder.mutation<DecryptedPatient | undefined, DecryptedPatient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient> => {
          const createdPatient = await patientApi?.createPatient(await patientApi?.withEncryptionMetadata(patient))
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
    searchPatients: builder.query<DecryptedPatient[] | undefined, string>({
      async queryFn(searchTerm, { getState }) {
        const api = await cardinalApi(getState)
        const patientApi = api?.patient
        const dataOwnerId = (await api?.dataOwner.getCurrentDataOwner())?.dataOwner.id
        return guard([patientApi, dataOwnerId], async (): Promise<DecryptedPatient[]> => {
          const nameFilter = PatientFilters.byFuzzyNameForDataOwner(dataOwnerId!, searchTerm)
          const telecomFilter = PatientFilters.byTelecomForDataOwner(dataOwnerId!, searchTerm)

          const [nameResults, telecomResults] = await Promise.all([
            loadFromIterator(await patientApi!.filterPatientsBy(nameFilter), 50),
            loadFromIterator(await patientApi!.filterPatientsBy(telecomFilter), 50).catch(() => [] as DecryptedPatient[]),
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

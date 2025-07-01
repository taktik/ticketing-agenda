import { DecryptedPatient, EncryptedPatient, IdWithRev, intersection, Patient } from '@icure/cardinal-sdk'
import { PatientFilters, union } from '@icure/cardinal-sdk/filters.mjs'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { allPatientsTagsEnum } from '../../helpers/types'
import { cardinalApi, guard } from '../services/auth.api'

enum PatientTags {
  Patient = 'Patient',
}

export const patientApiRtk = createApi({
  reducerPath: 'patientApi',
  tagTypes: [PatientTags.Patient],
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  endpoints: (builder) => ({
    createOrUpdatePatient: builder.mutation<DecryptedPatient | undefined, DecryptedPatient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient> => {
          const updatedPatient = !!patient.rev ? await patientApi?.modifyPatient(patient) : await patientApi?.createPatient(await patientApi.withEncryptionMetadata(patient))
          if (!updatedPatient) {
            throw new Error('Patient does not exist')
          }
          return new DecryptedPatient(updatedPatient)
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    updatePatient: builder.mutation<EncryptedPatient | undefined, EncryptedPatient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<EncryptedPatient> => {
          const updatedPatient = await patientApi?.encrypted.modifyPatient(patient)
          if (!updatedPatient) {
            throw new Error('Patient does not exist')
          }
          return new EncryptedPatient(updatedPatient)
        })
      },
      invalidatesTags: (result) => (result ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    createPatients: builder.mutation<IdWithRev[] | undefined, DecryptedPatient[]>({
      async queryFn(patients, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<Array<IdWithRev> | undefined> => {
          const patientsWithEncryptionMetadata = await Promise.all(patients.map(async (patient) => await patientApi?.withEncryptionMetadata(patient)))

          // Filter out undefined values
          const validPatients = patientsWithEncryptionMetadata.filter((patient): patient is DecryptedPatient => patient !== undefined)

          if (validPatients.length === 0) {
            throw new Error('No valid patients to create')
          }

          return await patientApi?.createPatients(validPatients)
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    filterPatientsByDataOwner: builder.query<string[] | undefined, string>({
      async queryFn(practitionerId, { getState }) {
        const api = await cardinalApi(getState)

        return guard([api], async (): Promise<string[]> => {
          if (!api) {
            throw new Error('Something went wrong')
          }
          const patientApi = api?.patient
          const filterForMatch = PatientFilters.allPatientsForDataOwner(practitionerId)

          const patientsList = await patientApi?.matchPatientsBy(filterForMatch)
          if (!patientsList) {
            throw new Error('Patients do not found')
          }

          return patientsList
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    filterPatientsByFuzzyNameForDataOwner: builder.query<string[] | undefined, { practitionerId: string; searchString: string }>({
      async queryFn({ practitionerId, searchString }, { getState }) {
        const api = await cardinalApi(getState)

        return guard([api], async (): Promise<string[]> => {
          if (!api) {
            throw new Error('Something went wrong')
          }
          const patientApi = api?.patient

          const predicates = searchString
            .trim()
            .split(/\s+/)
            .map((word) => {
              const matchingTags = allPatientsTagsEnum.filter((e) => e.toLowerCase().includes(word.toLowerCase())).map((c) => PatientFilters.byTagForDataOwner(practitionerId, 'PREVENTI', c))
              const partailFilter = matchingTags.length
                ? union(PatientFilters.byFuzzyNameForDataOwner(practitionerId, word), matchingTags.length == 1 ? matchingTags[0] : union(matchingTags[0], matchingTags[1], ...matchingTags.slice(2)))
                : PatientFilters.byFuzzyNameForDataOwner(practitionerId, word)

              const filterWithPostalCode = word.match(/[0-9]+/) ? union(partailFilter, PatientFilters.byAddressPostalCodeHouseNumberForDataOwner(practitionerId, '', word)) : partailFilter

              return filterWithPostalCode
            })

          const patientsList = await patientApi?.matchPatientsBy(predicates.length == 1 ? predicates[0] : intersection(predicates[0], predicates[1], ...predicates.slice(2)))
          if (!patientsList) {
            throw new Error('Patients do not found')
          }

          return patientsList
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    getPatientById: builder.query<DecryptedPatient | undefined, string>({
      async queryFn(patientId, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient> => {
          const patient = await patientApi!.decrypt(await patientApi!.encrypted.getPatient(patientId))
          if (!patient) {
            throw new Error('Patients do not found')
          }
          return patient
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    getPatientsByIds: builder.query<DecryptedPatient[] | undefined, string[]>({
      async queryFn(patientsIds, { getState }) {
        if (!patientsIds.length) {
          return { data: [] }
        }
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient[]> => {
          const patientsList = (await patientApi!.tryAndRecover.getPatients(patientsIds)).filter((p): p is DecryptedPatient => !!p)
          if (!patientsList) {
            throw new Error('Patients do not found')
          }
          return patientsList
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    deletePatient: builder.mutation<string | undefined, Patient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async () => {
          const result = await patientApi?.deletePatient(patient)
          if (!result) {
            throw new Error('Patient can`t be deleted')
          }
          return result.id
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    deletePatients: builder.mutation<(string | undefined)[] | undefined, Patient[]>({
      async queryFn(patients, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async () => {
          const results = await patientApi?.deletePatients(patients)
          if (!results) {
            throw new Error('Patients can`t be deleted')
          }
          const r = results.map((res) => res.id)
          console.log(r)

          return r
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),

    sharePatientWith: builder.mutation<DecryptedPatient | undefined, { patient: DecryptedPatient; delegateId: string }>({
      async queryFn({ patient, delegateId }, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient> => {
          const updatedPatient = await patientApi?.shareWith(delegateId, patient)
          if (!updatedPatient) {
            throw new Error('Patient does not exist')
          }
          return new DecryptedPatient(updatedPatient)
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
  }),
})

export const {
  useCreateOrUpdatePatientMutation,
  useFilterPatientsByDataOwnerQuery,
  useFilterPatientsByFuzzyNameForDataOwnerQuery,
  useGetPatientsByIdsQuery,
  useDeletePatientMutation,
  useDeletePatientsMutation,
  useSharePatientWithMutation,
  useCreatePatientsMutation,
  useLazyGetPatientByIdQuery,
  useUpdatePatientMutation,
} = patientApiRtk

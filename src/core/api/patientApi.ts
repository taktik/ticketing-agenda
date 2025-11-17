import { DecryptedPatient, EncryptedPatient } from '@icure/cardinal-sdk'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
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
    createDecryptedPatient: builder.mutation<DecryptedPatient | undefined, DecryptedPatient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<DecryptedPatient> => {
          const createdPatient = await patientApi?.createPatient(await patientApi?.withEncryptionMetadata(patient))
          if (!createdPatient) {
            throw new Error('Couldnt create the citizen')
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
            throw new Error('Couldnt update the citizen')
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
            throw new Error('Citizens do not found')
          }
          return patient
        })
      },
      providesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
    initializeExchangeData: builder.mutation<boolean | undefined, string>({
      async queryFn(patientId, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<boolean> => {
          const isInitialized = await patientApi?.forceInitializeExchangeDataToNewlyInvitedPatient(patientId)
          if (!isInitialized) {
            throw new Error('Couldnt initialize the citizen exchange datas')
          }
          return isInitialized
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
  }),
})

export const { useCreateDecryptedPatientMutation, useUpdateEncryptedPatientMutation, useGetEncryptedPatientByIdQuery, useLazyGetEncryptedPatientByIdQuery, useInitializeExchangeDataMutation } = patientApiRtk

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
    createOrUpdatePatient: builder.mutation<EncryptedPatient | undefined, EncryptedPatient>({
      async queryFn(patient, { getState }) {
        const patientApi = (await cardinalApi(getState))?.patient
        return guard([patientApi], async (): Promise<EncryptedPatient> => {
          const updatedPatient = !!patient.rev ? await patientApi?.encrypted.modifyPatient(patient) : await patientApi?.encrypted.createPatient(patient)
          if (!updatedPatient) {
            throw new Error('Patient does not exist')
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
            throw new Error('Patients do not found')
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
            throw new Error('Couldnt initialize the patient exchange datas')
          }
          return isInitialized
        })
      },
      invalidatesTags: (res, error) => (res && !error ? [{ type: PatientTags.Patient, id: 'all' }] : []),
    }),
  }),
})

export const { useCreateOrUpdatePatientMutation, useGetEncryptedPatientByIdQuery, useLazyGetEncryptedPatientByIdQuery, useInitializeExchangeDataMutation } = patientApiRtk

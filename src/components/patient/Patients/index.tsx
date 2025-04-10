import { createSelector } from '@reduxjs/toolkit'
import React, { useState } from 'react'
import { useFilterPatientsByDataOwnerQuery, useFilterPatientsByFuzzyNameForDataOwnerQuery, useGetPatientsByIdsQuery } from '../../../core/api/patientApi'
import { useAppSelector } from '../../../core/hooks'
import { CardinalApiState } from '../../../core/services/auth.api'
import { ActionsPanel } from '../components/ActionsPanel'
import { PatientsTable } from '../components/PatientsTable'
import './index.css'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    healthcarePartyId: cardinalApi.user?.healthcarePartyId,
  }),
)

export const Patients = () => {
  const { healthcarePartyId } = useAppSelector(reduxSelector)
  const [searchString, setSearchString] = useState<string | undefined>(undefined)

  const { data: patientsByDataOwnerIds, isLoading: patientsByDataOwnerIdsAreLoading } = useFilterPatientsByDataOwnerQuery(healthcarePartyId ?? '', {
    skip: !healthcarePartyId || searchString?.length === 0,
  })
  const {
    data: patientsByFuzzyNameForDataOwnerIds,
    isLoading: patientsByFuzzyNameForDataOwnerIdsAreLoading,
    originalArgs: searchArgs,
  } = useFilterPatientsByFuzzyNameForDataOwnerQuery(
    { practitionerId: healthcarePartyId ?? '', searchString: searchString?.trim() ?? '' },
    { skip: !healthcarePartyId || !searchString?.length },
  )

  const patientsIdsList = searchString?.length ? patientsByFuzzyNameForDataOwnerIds : patientsByDataOwnerIds
  const noMatchingPatients = !!searchString?.length && patientsIdsList?.length === 0

  const { data: fullPatientList, isLoading: patientListIsLoading } = useGetPatientsByIdsQuery(patientsIdsList ?? [], {
    skip: !!searchString?.length && searchArgs?.searchString !== searchString,
  })
  const patientsListToRender = !noMatchingPatients ? fullPatientList : []

  return (
    <div className="patients">
      <h3>Patients</h3>
      <ActionsPanel onSearch={setSearchString} onClear={() => setSearchString(undefined)} />
      <PatientsTable
        patientList={patientsListToRender}
        noMatchingPatientsPlaceholder={noMatchingPatients}
        showSpinner={patientsByDataOwnerIdsAreLoading || patientListIsLoading || patientsByFuzzyNameForDataOwnerIdsAreLoading}
      />
    </div>
  )
}

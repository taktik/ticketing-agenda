import { DecryptedPatient } from '@icure/cardinal-sdk'
import React from 'react'
import { CommonPlaceholder } from '../../../common/CommonPlaceholder'
import { SpinLoader } from '../../../common/SpinLoader'

import { PatientRow } from '../PatientRow'
import './index.css'

interface PatientsTableProps {
  showSpinner: boolean
  patientList?: DecryptedPatient[]
  noMatchingPatientsPlaceholder?: boolean
}

export const PatientsTable = ({ showSpinner, patientList, noMatchingPatientsPlaceholder }: PatientsTableProps) => {
  return (
    <div className="patientsTable">
      {showSpinner && <SpinLoader />}
      {patientList && patientList?.length !== 0 ? (
        patientList?.map((patient: DecryptedPatient, index: number) => {
          return <PatientRow key={index} patient={patient} />
        })
      ) : (
        <CommonPlaceholder
          title={noMatchingPatientsPlaceholder ? 'No Patients Found' : 'No Patients Added Yet'}
          content={
            noMatchingPatientsPlaceholder
              ? 'Try adjusting your search criteria or adding a new patient.'
              : "It looks like you haven't added any patients to your list. Don't worry, you can easily add them by clicking the 'Add' or 'Import' button."
          }
        />
      )}
    </div>
  )
}

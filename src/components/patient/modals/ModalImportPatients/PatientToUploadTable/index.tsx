import React from 'react'
import { UploadedPatientsTableTitlesEnum, UploadedPatientType } from '../utils/types'
import './index.css'

interface PatientToUploadTableProps {
  patients: UploadedPatientType[]
}

export const PatientToUploadTable = ({ patients }: PatientToUploadTableProps) => {
  return (
    <div className="PatientToUploadTable">
      <div className="PatientToUploadTable__scrollContainer">
        <div className="PatientToUploadTable__scrollContent">
          <div className="PatientToUploadTable__scrollContent__head">
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.FIRST_NAME}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.LAST_NAME}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.EMAIL}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.DATE_OF_BIRTH}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.BIRTH_SEX}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.LANGUAGE}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.STATUS_TAGS}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.STREET_ADDRESS}</span>
            </div>
            <div className="PatientToUploadTable__scrollContent__head__cell">
              <span>{UploadedPatientsTableTitlesEnum.POSTAL_ADDRESS}</span>
            </div>
          </div>
          <div className="PatientToUploadTable__scrollContent__body">
            {patients?.map((patient: UploadedPatientType, index: number) => {
              return (
                <div key={index} className="PatientToUploadTable__scrollContent__body__row">
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.firstName}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.lastName}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.email}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.dateOfBirth}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.birthSex}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.language}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.statusTags}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.streetAddress}</span>
                  </div>
                  <div className="PatientToUploadTable__scrollContent__body__row__cell">
                    <span>{patient.postalAddress}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

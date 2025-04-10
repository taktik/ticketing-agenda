import Icon from '@ant-design/icons'
import { AddressType, CodeStub, DecryptedAddress, DecryptedPatient, DecryptedTelecom, Gender, PersonName, PersonNameUse, TelecomType } from '@icure/cardinal-sdk'
import { Alert, Button, Upload, UploadFile, UploadProps } from 'antd'
import { getTime, parse } from 'date-fns'
import { saveAs } from 'file-saver'
import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { attachedFileIcn, deleteIcn } from '../../../../assets/CustomIcons'
import { DATE_FORMAT } from '../../../../constants'
import { useCreatePatientsMutation } from '../../../../core/api/patientApi'
import { getPatientBirthDateFromImport, splitAddressGeneric } from '../../../../helpers/patientDataManipulations'
import { PatientsTagsEnum } from '../../../../helpers/types'

import { CustomModal } from '../../../common/CustomModal'
import './index.css'
import { SpinLoader } from '../../../common/SpinLoader'
import { PatientToUploadTable } from './PatientToUploadTable'
import { getExampleSheetBuffer, sheetTitle } from './utils/fileUtils'
import { UploadedPatientsTableTitlesEnum, UploadedPatientType } from './utils/types'

interface ModalImportPatientsProps {
  isVisible: boolean
  onClose: () => void
}

type ComponentStateType = 'upload' | 'import'

export const ModalImportPatients = ({ onClose, isVisible }: ModalImportPatientsProps) => {
  const [componentState, setComponentState] = useState<ComponentStateType>('upload')
  const getModalTitle = (state: ComponentStateType): string => (state === 'upload' ? 'Upload file' : 'Import patients')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploadState, setUploadState] = useState({
    validRowsList: [] as UploadedPatientType[],
    unValidEmailRowsList: [] as UploadedPatientType[],
    missingFieldsRowsList: [] as UploadedPatientType[],
  })

  const [createPatients, { error: createPatientsError, isError: isCreatePatientsError, isSuccess: isPatientsCreatedSuccessfully, isLoading: isPatientsCreatingLoading }] =
    useCreatePatientsMutation()

  useEffect(() => {
    if (isPatientsCreatedSuccessfully) {
      onClose()
    }
  }, [isPatientsCreatedSuccessfully])

  if (isCreatePatientsError) console.error(createPatientsError)

  const handleImport = () => {
    const getPreparedPatientData = (value: UploadedPatientType) => {
      const { firstName, lastName, email, birthSex, language, statusTags, streetAddress, postalAddress, dateOfBirth } = value
      const name = new PersonName({
        firstNames: [firstName],
        lastName: lastName,
        use: PersonNameUse.Official,
      })

      const address = new DecryptedAddress({
        addressType: AddressType.Home,
        telecoms: [
          new DecryptedTelecom({
            telecomType: TelecomType.Email,
            telecomNumber: email,
          }),
        ],
        street: splitAddressGeneric(streetAddress).nonNumericPart,
        houseNumber: splitAddressGeneric(streetAddress).numericPart,
        city: splitAddressGeneric(postalAddress).nonNumericPart,
        postalCode: splitAddressGeneric(postalAddress).numericPart,
      })

      const getTags = () => {
        const separatedTags = statusTags.split(', ')
        return separatedTags.map((tag) => {
          const tagType = 'PREVENTI'
          const tagVersion = '1'

          return new CodeStub({
            id: `${tagType}|${tag}|${tagVersion}`,
            type: tagType,
            code: tag,
            version: tagVersion,
          })
        })
      }
      const getBirthSex = () => (birthSex === 'Male' ? Gender.Male : birthSex === 'Female' ? Gender.Female : Gender.Unknown)

      const getDateOfBirthUnixTimestamp = () => {
        if (!dateOfBirth) {
          return undefined
        }
        const parsedDate = parse(dateOfBirth, DATE_FORMAT, new Date())
        return Math.floor(getTime(parsedDate) / 1000)
      }

      return {
        firstName,
        lastName,
        names: [name],
        dateOfBirth: getDateOfBirthUnixTimestamp(),
        birthSex: getBirthSex(),
        addresses: [address],
        tags: getTags(),
        languages: [language],
      }
    }
    const patientsToBeCreated = uploadState.validRowsList.map((patient) => new DecryptedPatient(getPreparedPatientData(patient)))
    createPatients(patientsToBeCreated)
  }

  const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmail = (email: string): boolean => emailRegExp.test(email)
  const SheetJSFT = ['xlsx', 'xls', 'xml', 'csv', 'txt', 'ods'].map((x) => '.' + x).join(', ')

  const handleChange: UploadProps['onChange'] = (info) => {
    setFileList([info.file])
    setComponentState('import')
  }

  const handleDelete = (file: UploadFile) => {
    // in case if multiple: true
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid))

    setUploadState({
      missingFieldsRowsList: [],
      unValidEmailRowsList: [],
      validRowsList: [],
    })
    setComponentState('upload')
  }
  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (!e.target?.result) return

      const data = new Uint8Array(e.target.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array', bookVBA: true }) // Use 'array' instead of 'binary'

      if (!workbook) return
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      if (!worksheet) return
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as { [key: string]: string }[]

      // Process Data
      const formattedData = jsonData.map((row) => ({
        firstName: row[UploadedPatientsTableTitlesEnum.FIRST_NAME],
        lastName: row[UploadedPatientsTableTitlesEnum.LAST_NAME],
        email: row[UploadedPatientsTableTitlesEnum.EMAIL],
        birthSex: row[UploadedPatientsTableTitlesEnum.BIRTH_SEX],
        dateOfBirth: getPatientBirthDateFromImport(row[UploadedPatientsTableTitlesEnum.DATE_OF_BIRTH]),
        language: row[UploadedPatientsTableTitlesEnum.LANGUAGE],
        statusTags: row[UploadedPatientsTableTitlesEnum.STATUS_TAGS],
        streetAddress: row[UploadedPatientsTableTitlesEnum.STREET_ADDRESS],
        postalAddress: row[UploadedPatientsTableTitlesEnum.POSTAL_ADDRESS],
      }))

      // Validate Data
      setUploadState({
        validRowsList: formattedData.filter((row) => !!row.firstName && !!row.lastName && !!row.email && isEmail(row.email) && !!row.statusTags),
        unValidEmailRowsList: formattedData.filter((row) => row.email && !isEmail(row.email)),
        missingFieldsRowsList: formattedData.filter((row) => !row.firstName || !row.lastName || !row.email || !row.statusTags),
      })
    }

    reader.readAsArrayBuffer(file) // Correct method for binary files
    return false // Prevent upload
  }

  const uploadProps: UploadProps = {
    accept: SheetJSFT,
    beforeUpload: handleFileUpload,
    onChange: handleChange,
    onRemove: handleDelete,
    maxCount: 1,
    multiple: false,
    showUploadList: false,
  }

  const customFooter = () => {
    return [
      <div key="customFooter" className="customFooter">
        <Upload {...uploadProps}>
          <Button type="primary">Upload file</Button>
        </Upload>
        <div className="customFooter__btnsRight">
          <Button onClick={onClose}>Cancel</Button>

          <Button type="primary" onClick={handleImport} disabled={componentState !== 'import' || uploadState.validRowsList.length === 0}>
            Import patients
          </Button>
        </div>
      </div>,
    ]
  }

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} customFooter={customFooter()} title={getModalTitle(componentState)}>
      <div className="modalImportPatients">
        {componentState === 'upload' && (
          <div className="modalImportPatients__upload">
            <p>
              To import patients, upload a file in one of supported formats (.xlsx, .xls, .xml, .csv, .txt, .ods) with the correct field structure (you can find it in the template
              <a onClick={() => saveAs(new Blob([getExampleSheetBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${sheetTitle}.xlsx`)}>
                Download the template here
              </a>
              ).
            </p>

            <Alert
              message={
                <>
                  <p>
                    Entries will be rejected if required fields are missing: <span className="highlighted"> Fist Name, Last Name, Email, and Tags.</span>
                  </p>
                  <p>
                    The Date of Birth should be in the <span className="highlighted">{DATE_FORMAT}</span> format. For example: 31/01/1970
                  </p>
                </>
              }
              type="warning"
              showIcon
            />
            <Alert
              message={
                <p>
                  There are 5 available patient tags:{' '}
                  <span className="highlighted--info">
                    {PatientsTagsEnum.UNINVITED +
                      ', ' +
                      PatientsTagsEnum.WELCOMED +
                      ', ' +
                      PatientsTagsEnum.QUESTIONNAIRE_SENT +
                      ', ' +
                      PatientsTagsEnum.RESPONSE_RECEIVED +
                      ', ' +
                      PatientsTagsEnum.NURSE_APPOINTMENT_TAKEN +
                      ', ' +
                      PatientsTagsEnum.DOCTOR_APPOINTMENT_TAKEN}
                  </span>
                </p>
              }
              type="info"
              showIcon
            />
          </div>
        )}
        {componentState === 'import' && (
          <div className="modalImportPatients__import">
            {isPatientsCreatingLoading && <SpinLoader />}
            <div className="modalImportPatients__import__results">
              {uploadState.missingFieldsRowsList.length !== 0 && (
                <div className="modalImportPatients__import__results__item">
                  <Alert message="Entries were rejected due to missing required fields." type="error" showIcon />
                  <PatientToUploadTable patients={uploadState.missingFieldsRowsList} />
                </div>
              )}
              {uploadState.unValidEmailRowsList.length !== 0 && (
                <div className="modalImportPatients__import__results__item">
                  <Alert message="Entries were rejected due to invalid email." type="error" showIcon />
                  <PatientToUploadTable patients={uploadState.unValidEmailRowsList} />
                </div>
              )}
              {uploadState.validRowsList.length !== 0 && (
                <div className="modalImportPatients__import__results__item">
                  <Alert message="Entries were successfully uploaded and ready to be imported." type="success" showIcon />
                  <PatientToUploadTable patients={uploadState.validRowsList} />
                </div>
              )}
            </div>
            <div className="modalImportPatients__import__fileList">
              {fileList.map((file, index) => (
                <div key={index} className="modalImportPatients__import__fileList__item">
                  <div className="modalImportPatients__import__fileList__item__title">
                    <Icon component={attachedFileIcn} className="icon attachedFileIcn" />
                    <p>{file.name}</p>
                  </div>

                  <Icon component={deleteIcn} onClick={() => handleDelete(file)} className="icon deleteIcn" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CustomModal>
  )
}

import * as XLSX from 'xlsx'
import { UploadedPatientsTableKeysEnum, UploadedPatientsTableTitlesEnum } from './types'

export const sheetTitle = 'Patients-sheet-example'
export const getExampleSheetBuffer = () => {
  // Generate Excel Sheet
  const exampleSheet = XLSX.utils.book_new()
  const columns = [
    { title: UploadedPatientsTableTitlesEnum.FIRST_NAME, dataIndex: UploadedPatientsTableKeysEnum.FIRST_NAME, key: UploadedPatientsTableKeysEnum.FIRST_NAME },
    { title: UploadedPatientsTableTitlesEnum.LAST_NAME, dataIndex: UploadedPatientsTableKeysEnum.LAST_NAME, key: UploadedPatientsTableKeysEnum.LAST_NAME },
    { title: UploadedPatientsTableTitlesEnum.EMAIL, dataIndex: UploadedPatientsTableKeysEnum.EMAIL, key: UploadedPatientsTableKeysEnum.EMAIL },
    { title: UploadedPatientsTableTitlesEnum.DATE_OF_BIRTH, dataIndex: UploadedPatientsTableKeysEnum.DATE_OF_BIRTH, key: UploadedPatientsTableKeysEnum.DATE_OF_BIRTH },
    { title: UploadedPatientsTableTitlesEnum.BIRTH_SEX, dataIndex: UploadedPatientsTableKeysEnum.BIRTH_SEX, key: UploadedPatientsTableKeysEnum.BIRTH_SEX },
    { title: UploadedPatientsTableTitlesEnum.LANGUAGE, dataIndex: UploadedPatientsTableKeysEnum.LANGUAGE, key: UploadedPatientsTableKeysEnum.LANGUAGE },
    { title: UploadedPatientsTableTitlesEnum.STATUS_TAGS, dataIndex: UploadedPatientsTableKeysEnum.STATUS_TAGS, key: UploadedPatientsTableKeysEnum.STATUS_TAGS },
    { title: UploadedPatientsTableTitlesEnum.STREET_ADDRESS, dataIndex: UploadedPatientsTableKeysEnum.STREET_ADDRESS, key: UploadedPatientsTableKeysEnum.STREET_ADDRESS },
    { title: UploadedPatientsTableTitlesEnum.POSTAL_ADDRESS, dataIndex: UploadedPatientsTableKeysEnum.POSTAL_ADDRESS, key: UploadedPatientsTableKeysEnum.POSTAL_ADDRESS },
  ]
  exampleSheet.Props = { Title: sheetTitle }
  exampleSheet.SheetNames.push(sheetTitle)
  const columnTitles = columns.map((col) => col.title)
  exampleSheet.Sheets[sheetTitle] = XLSX.utils.aoa_to_sheet([columnTitles])
  // Convert Binary String to ArrayBuffer
  const binaryToArrayBuffer = (binary: string) => {
    const buffer = new ArrayBuffer(binary.length)
    const view = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i) & 0xff
    }
    return buffer
  }

  const exampleSheetBinary = XLSX.write(exampleSheet, { bookType: 'xlsx', type: 'binary' })
  return binaryToArrayBuffer(exampleSheetBinary)
}

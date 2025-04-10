import { AddressType, CodeStub, DecryptedAddress, DecryptedPatient, DecryptedTelecom, Gender, PersonName, PersonNameUse, TelecomType } from '@icure/cardinal-sdk'
import type { GetProps, UploadFile, UploadProps } from 'antd'
import { DatePicker, Form, Input, Select, Upload } from 'antd'
import ImgCrop from 'antd-img-crop'
import dayjs from 'dayjs'
import React, { ReactElement, useEffect, useState } from 'react'
import { DATE_FORMAT_TO_DISPLAY, DEFAULT_MODAL_WIDTH } from '../../../../constants'
import { useCreateOrUpdatePatientMutation } from '../../../../core/api/patientApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../../../helpers/fileToBase64'
import { getPatientDataFormated } from '../../../../helpers/patientDataManipulations'
import { PatientsTagsEnum } from '../../../../helpers/types'
import { breakpoints, getWindowSize } from '../../../../helpers/windowSize'

import { CustomModal, getCustomModalResponsiveStyles } from '../../../common/CustomModal'
import './index.css'
import { SpinLoader } from '../../../common/SpinLoader'

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>

type PatientForm = {
  firstName: string
  lastName: string
  dateOfBirth: number
  birthSex: Gender
  language: string
  phoneNumber: string
  emailAddress: string
  country: string
  city: string
  street: string
  houseNumber: string
  postalCode: string
  picture: Int8Array | undefined
  tags: PatientsTagsEnum[]
}

interface ModalPatientFormProps {
  mode: 'edit' | 'create'
  isVisible: boolean
  onClose: () => void
  patientToEdit?: DecryptedPatient
}

export const ModalPatientForm = ({ mode, isVisible, onClose, patientToEdit }: ModalPatientFormProps): ReactElement => {
  const [patientPictureAsInt8Array, setPatientPictureAsInt8Array] = useState<Int8Array | undefined>(undefined)
  const patientAvatarSrc = patientToEdit?.picture
  const [fileList, setFileList] = useState<UploadFile[]>(
    patientAvatarSrc
      ? [
          {
            uid: '-1',
            name: 'image.png',
            status: 'done',
            url: getImgSRC(patientAvatarSrc),
          },
        ]
      : [],
  )
  const [form] = Form.useForm()

  const [
    createOrUpdatePatient,
    { error: createOrUpdatePatientError, isError: isCreateOrUpdatePatientError, isSuccess: isPatientCreatedOrUpdateSuccessfully, isLoading: isPatientCreatingOrUpdatingLoading },
  ] = useCreateOrUpdatePatientMutation()

  if (isCreateOrUpdatePatientError) {
    console.log(createOrUpdatePatientError)
  }

  const getPreparedUserData = (value: PatientForm) => {
    const { firstName, lastName, dateOfBirth, birthSex, phoneNumber, emailAddress, country, city, street, houseNumber, postalCode, tags, language } = value
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
          telecomNumber: emailAddress,
        }),
        new DecryptedTelecom({
          telecomType: TelecomType.Mobile,
          telecomNumber: phoneNumber,
        }),
      ],
      country,
      city,
      street,
      houseNumber,
      postalCode,
    })
    const dateOfBirthUnixTimestamp = dayjs(dateOfBirth).unix()
    const picture = patientPictureAsInt8Array ?? patientAvatarSrc
    const getTags = () => {
      return tags.map((tag) => {
        const tagType = 'PETRA_CARE'
        const tagVersion = '1'

        return new CodeStub({
          id: `${tagType}|${tag}|${tagVersion}`,
          type: tagType,
          code: tag,
          version: tagVersion,
        })
      })
    }

    return { firstName, lastName, birthSex, names: [name], addresses: [address], dateOfBirth: dateOfBirthUnixTimestamp, picture, tags: getTags(), languages: [language] }
  }
  const handleSubmit = (value: PatientForm) => {
    if (mode === 'create') createOrUpdatePatient(new DecryptedPatient(getPreparedUserData(value)))
    if (mode === 'edit') createOrUpdatePatient(new DecryptedPatient({ ...patientToEdit, ...getPreparedUserData(value) }))

    form.resetFields()
  }
  const getPatientToEdit = (patient: DecryptedPatient) => {
    const { firstName, lastName, dateOfBirth, birthSex, language, tags, phoneNumber, emailAddress, country, city, street, houseNumber, postalCode, picture } =
      getPatientDataFormated(patient)
    return {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? dayjs.unix(dateOfBirth) : undefined,
      birthSex,
      language,
      phoneNumber,
      emailAddress,
      country,
      city,
      street,
      houseNumber,
      postalCode,
      picture,
      tags: tags.map((tag) => tag.code),
    }
  }

  useEffect(() => {
    if (isPatientCreatedOrUpdateSuccessfully) {
      onClose()
    }
  }, [isPatientCreatedOrUpdateSuccessfully])

  const handleOnClose = () => {
    setFileList([])
    setPatientPictureAsInt8Array(undefined)
    form.resetFields()
    onClose()
  }

  const { Option } = Select

  const fileUploaderProps: UploadProps = {
    listType: 'picture-card',
    multiple: false,
    showUploadList: {
      showRemoveIcon: true,
    },
    maxCount: 1,
    fileList: fileList,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList)
    },
    onRemove() {
      setFileList([])
      setPatientPictureAsInt8Array(undefined)
    },
  }

  const disabledDate: RangePickerProps['disabledDate'] = (current) => {
    // Can not select days before today and today
    return current && current > dayjs().endOf('day')
  }
  const { innerWidth } = getWindowSize()

  return (
    <CustomModal
      isVisible={isVisible}
      handleClose={handleOnClose}
      secondaryBtnTitle="Cancel"
      handleClickPrimaryBtn={() => form.submit()}
      primaryBtnTitle="Save"
      title={mode === 'edit' ? 'Edit patient' : 'Create patient'}
    >
      <div className="modalPatientForm">
        {isPatientCreatingOrUpdatingLoading && <SpinLoader />}
        <Form
          className="modalPatientForm__form"
          layout="vertical"
          colon={false}
          form={form}
          onFinish={(values) => handleSubmit(values)}
          initialValues={mode === 'edit' && patientToEdit ? getPatientToEdit(patientToEdit) : {}}
        >
          <div className="modalPatientForm__form__infoBlock">
            <h3 className="modalPatientForm__form__infoBlock__title">Main information:</h3>
            <div className="modalPatientForm__form__infoBlock__inputs">
              <Form.Item name="firstName" label="First name" rules={[{ required: true, message: 'First name is required' }]}>
                <Input placeholder="First name" size="large" />
              </Form.Item>
              <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: 'Last name is required' }]}>
                <Input placeholder="Last name" size="large" />
              </Form.Item>
              <Form.Item name="dateOfBirth" label="Date of birth" rules={[{ required: true, message: 'Date of birth is required' }]}>
                <DatePicker format={DATE_FORMAT_TO_DISPLAY} placeholder="Date of birth" size="large" style={{ width: '100%' }} disabledDate={disabledDate} />
              </Form.Item>
              <Form.Item name="birthSex" label="Sex at birth" rules={[{ required: true, message: 'Sex at birth is required' }]}>
                <Select placeholder="Sex at birth" size="large">
                  <Option value={Gender.Male}>{Gender.Male}</Option>
                  <Option value={Gender.Female}>{Gender.Female}</Option>
                </Select>
              </Form.Item>
              <Form.Item name="language" label="Language" rules={[{ required: true, message: 'Language is required' }]}>
                <Input placeholder="Language" size="large" />
              </Form.Item>
              <Form.Item label="Picture" valuePropName="file">
                <ImgCrop
                  rotationSlider
                  modalClassName="PatientImgCrop"
                  modalWidth={innerWidth < breakpoints.md ? '100vw' : DEFAULT_MODAL_WIDTH}
                  modalProps={{ style: getCustomModalResponsiveStyles(innerWidth < breakpoints.md) }}
                >
                  <Upload {...fileUploaderProps} {...getFileUploaderCommonProps((data: Int8Array | undefined) => setPatientPictureAsInt8Array(data))}>
                    {fileList.length === 0 ? '+ Upload' : '+ Replace'}
                  </Upload>
                </ImgCrop>
              </Form.Item>
            </div>
          </div>
          <div className="modalPatientForm__form__infoBlock">
            <h3 className="modalPatientForm__form__infoBlock__title">Contacts:</h3>
            <div className="modalPatientForm__form__infoBlock__inputs">
              <Form.Item name="phoneNumber" label="Phone number" rules={[{ required: true, message: 'Phone number is required' }]}>
                <Input placeholder="Phone number" size="large" />
              </Form.Item>
              <Form.Item name="emailAddress" label="Email address" rules={[{ required: true, message: 'Email address is required' }]}>
                <Input placeholder="Email address" size="large" />
              </Form.Item>
            </div>
          </div>
          <div className="modalPatientForm__form__infoBlock">
            <h3 className="modalPatientForm__form__infoBlock__title">Home address:</h3>
            <div className="modalPatientForm__form__infoBlock__inputs">
              <Form.Item name="country" label="Country" rules={[{ required: true, message: 'Country is required' }]}>
                <Input placeholder="Country" size="large" />
              </Form.Item>
              <Form.Item name="city" label="City" rules={[{ required: true, message: 'City is required' }]}>
                <Input placeholder="City" size="large" />
              </Form.Item>
              <Form.Item name="street" label="Street" rules={[{ required: true, message: 'Street is required' }]}>
                <Input placeholder="Street" size="large" />
              </Form.Item>
              <Form.Item name="houseNumber" label="House number" rules={[{ required: true, message: 'House number is required' }]}>
                <Input placeholder="House number" size="large" />
              </Form.Item>
              <Form.Item name="postalCode" label="Postal code" rules={[{ required: true, message: 'Postal code is required' }]}>
                <Input placeholder="Postal code" size="large" />
              </Form.Item>
            </div>
          </div>
          <div className="modalPatientForm__form__infoBlock">
            <h3 className="modalPatientForm__form__infoBlock__title">Tags:</h3>
            <div className="modalPatientForm__form__infoBlock__inputs">
              <Form.Item name="tags" label="Tags" rules={[{ required: true, message: 'Tags are required' }]}>
                <Select placeholder="Tags" size="large" mode="multiple">
                  <Option value={PatientsTagsEnum.UNINVITED}>{PatientsTagsEnum.UNINVITED}</Option>
                  <Option value={PatientsTagsEnum.WELCOMED}>{PatientsTagsEnum.WELCOMED}</Option>
                  <Option value={PatientsTagsEnum.QUESTIONNAIRE_SENT}>{PatientsTagsEnum.QUESTIONNAIRE_SENT}</Option>
                  <Option value={PatientsTagsEnum.RESPONSE_RECEIVED}>{PatientsTagsEnum.RESPONSE_RECEIVED}</Option>
                  <Option value={PatientsTagsEnum.NURSE_APPOINTMENT_TAKEN}>{PatientsTagsEnum.NURSE_APPOINTMENT_TAKEN}</Option>
                  <Option value={PatientsTagsEnum.DOCTOR_APPOINTMENT_TAKEN}>{PatientsTagsEnum.DOCTOR_APPOINTMENT_TAKEN}</Option>
                </Select>
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

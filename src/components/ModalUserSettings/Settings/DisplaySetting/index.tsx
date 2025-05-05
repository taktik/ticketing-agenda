import { AddressType, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType } from '@icure/cardinal-sdk'
import { Form, UploadFile, UploadProps, Input, Upload, Button, Tabs } from 'antd'
import React, { ReactElement, useEffect, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../../../helpers/fileToBase64'
import './index.css'

interface DisplaySettingProps {
  onClose: () => void
}
export const AgendaSetting = ({ onClose }: DisplaySettingProps): ReactElement => {
  const { TabPane } = Tabs
  return <div className="root">Display setting</div>
}

/*

return (
    <div className="modalManageAccountForm">
      {isPractitionerUpdatingLoading && <SpinLoader />}
      <Form
        className="modalManageAccountForm__form"
        layout="vertical"
        onFinish={(values) => handleSubmit(values)}
        colon={false}
        form={form}
        initialValues={{
          emailAddress: currentUserEmail,
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
          speciality: currentUser?.speciality,
          file: currentUser?.picture,
        }}
      >
        <div className="modalManageAccountForm__form__inputs">
          <Form.Item name="firstName" label="First name" rules={[{ required: true, message: 'First name is required' }]}>
            <Input placeholder="First name" size="large" style={{ fontSize: 13 }} />
          </Form.Item>
          <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: 'Last name is required' }]}>
            <Input placeholder="Last name" size="large" style={{ fontSize: 13 }} />
          </Form.Item>
          <Form.Item name="emailAddress" label="Email address" rules={[{ required: true, message: 'Email address is required' }]}>
            <Input placeholder="Email address" size="large" style={{ fontSize: 13 }} />
          </Form.Item>
          <Form.Item name="speciality" label="Speciality" rules={[{ required: true, message: 'Speciality is required' }]}>
            <Input placeholder="Speciality" size="large" style={{ fontSize: 13 }} />
          </Form.Item>
          <Form.Item label="Picture" valuePropName="file">
            <ImgCrop rotationSlider modalClassName="PatientImgCrop">
              <Upload {...fileUploaderProps} {...getFileUploaderCommonProps((data: Int8Array | undefined) => setPatientPictureAsBase64(data))}>
                {fileList.length === 0 ? '+ Upload' : '+ Replace'}
              </Upload>
            </ImgCrop>
          </Form.Item>
        </div>
        <div className="agendaFormFooter">
          <Form.Item>
            <Button htmlType="button" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              Save
            </Button>
          </Form.Item>
        </div>
      </Form>
    </div>
  )

  */

import { AddressType, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType, User } from '@icure/cardinal-sdk'
import { Button, Form, Input, Upload, UploadFile, UploadProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import { ReactElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateOrUpdatePractitionerMutation } from '../../../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../../../helpers/fileToBase64'
import { SpinLoader } from '../../../common/SpinLoader'
import './index.css'
import { useCreateUpdateUserMutation, useGetUserByEmailQuery } from '../../../../core/api/userApi'

interface AccountSettingProps {
  currentUser?: HealthcareParty
  user?: User
}
export const AccountSetting = ({ currentUser, user }: AccountSettingProps): ReactElement => {
  const [form] = Form.useForm()
  const [createUpdateUser, { isError: isCreateUpdateUserError, isSuccess: isCreateUpdateUserSuccess, isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [updatePractitioner, { isSuccess: isPractitionerUpdatedSuccessfully, isLoading: isPractitionerUpdatingLoading }] = useCreateOrUpdatePractitionerMutation()
  const { t } = useTranslation()

  const userAvatarSrc = getImgSRC(currentUser?.picture)

  const [patientPictureAsBase64, setPatientPictureAsBase64] = useState<Int8Array | undefined>(undefined)
  const [fileList, setFileList] = useState<UploadFile[]>(
    !userAvatarSrc
      ? []
      : [
          {
            uid: '-1',
            name: 'image.png',
            status: 'done',
            url: userAvatarSrc,
          },
        ],
  )
  const handleSubmit = (value: { firstName: string; lastName: string; emailAddress: string }) => {
    const { firstName, lastName, emailAddress } = value
    const picture = patientPictureAsBase64 ?? currentUser?.picture
    updatePractitioner(new HealthcareParty({ ...currentUser, firstName, lastName, picture }))
    createUpdateUser(new User({ ...user, email: emailAddress }))
    form.resetFields()
  }

  const currentUserEmail = user?.email

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
      setPatientPictureAsBase64(undefined)
    },
  }

  const handleCancel = () => {
    form.resetFields()
  }

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
          file: currentUser?.picture,
        }}
      >
        <div className="modalManageAccountForm__form__inputs">
          <Form.Item name="firstName" label={t('content.firstname')} rules={[{ required: true, message: t('validation.firstname_required') }]}>
            <Input placeholder={t('content.firstname')} size="large" style={{ fontSize: 13 }} />
          </Form.Item>
          <Form.Item name="lastName" label={t('content.lastname')} rules={[{ required: true, message: t('validation.lastname_required') }]}>
            <Input placeholder={t('content.lastname')} size="large" style={{ fontSize: 13 }} />
          </Form.Item>
          <Form.Item name="emailAddress" label={t('content.email')} rules={[{ required: true, message: t('validation.email_required') }]}>
            <Input placeholder={t('content.email')} size="large" style={{ fontSize: 13 }} />
          </Form.Item>

          <Form.Item label={t('content.picture')} valuePropName="file">
            <ImgCrop rotationSlider modalClassName="PatientImgCrop">
              <Upload {...fileUploaderProps} {...getFileUploaderCommonProps((data: Int8Array | undefined) => setPatientPictureAsBase64(data))}>
                {fileList.length === 0 ? '+' + t('content.upload') : '+' + t('content.replace')}
              </Upload>
            </ImgCrop>
          </Form.Item>
        </div>
        <div className="agendaFormFooter">
          <Form.Item>
            <Button htmlType="button" onClick={handleCancel}>
              {t('content.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              {t('content.save')}
            </Button>
          </Form.Item>
        </div>
      </Form>
    </div>
  )
}

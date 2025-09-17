import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Form, Input, Upload, UploadFile, UploadProps, message, notification } from 'antd'
import ImgCrop from 'antd-img-crop'
import { ReactElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateHealthcarePartyMutation } from '../../../../core/api/healthcarePartyApi'
import { useCreateUpdateUserMutation } from '../../../../core/api/userApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../../../helpers/fileToBase64'
import { SpinLoader } from '../../../common/SpinLoader'
import './index.css'

interface AccountSettingProps {
  currentUserHcp?: HealthcareParty
  user?: User
}

export const AccountSetting = ({ currentUserHcp, user }: AccountSettingProps): ReactElement => {
  const [form] = Form.useForm()
  const [updateUser, { isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [updateHcp, { isLoading: isHcpUpdatingLoading }] = useCreateUpdateHealthcarePartyMutation()
  const { t } = useTranslation()

  const userAvatarSrc = getImgSRC(currentUserHcp?.picture)

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
  const handleSubmit = async (value: { firstName: string; lastName: string; emailAddress: string }) => {
    try {
      const { firstName, lastName, emailAddress } = value
      const picture = patientPictureAsBase64 ?? currentUserHcp?.picture
      await updateHcp(new HealthcareParty({ ...currentUserHcp, firstName, lastName, picture })).unwrap()
      await updateUser(new User({ ...user, email: emailAddress })).unwrap()
      showMessageFeedback('success', t('notification.user_modified'))
      form.resetFields()
    } catch (error) {
      openNotification('error', t('notification.user_modify_failed'), t('notification.user_modify_error'))
    }
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

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  return (
    <div className="manage-account-root">
      {notificationContextHolder}
      {messageContextHolder}
      {(isHcpUpdatingLoading || isCreateUpdateUserLoading) && <SpinLoader />}
      <Form
        className="manage-account-root__form"
        layout="vertical"
        onFinish={(values) => handleSubmit(values)}
        colon={false}
        form={form}
        initialValues={{
          emailAddress: currentUserEmail,
          firstName: currentUserHcp?.firstName,
          lastName: currentUserHcp?.lastName,
          file: currentUserHcp?.picture,
        }}
      >
        <div className="manage-account-root__form__inputs">
          <Form.Item name="firstName" label={t('content.firstname')} rules={[{ required: true, message: t('validation.firstname_required') }]}>
            <Input placeholder={t('content.firstname')} size="large" />
          </Form.Item>
          <Form.Item name="lastName" label={t('content.lastname')} rules={[{ required: true, message: t('validation.lastname_required') }]}>
            <Input placeholder={t('content.lastname')} size="large" />
          </Form.Item>
          <Form.Item name="emailAddress" label={t('content.email')} rules={[{ required: true, message: t('validation.email_required') }]}>
            <Input placeholder={t('content.email')} size="large" />
          </Form.Item>

          <Form.Item label={t('content.picture')} valuePropName="file">
            <ImgCrop rotationSlider modalClassName="PatientImgCrop">
              <Upload {...fileUploaderProps} {...getFileUploaderCommonProps((data: Int8Array | undefined) => setPatientPictureAsBase64(data))}>
                {fileList.length === 0 ? '+' + t('content.upload') : '+' + t('content.replace')}
              </Upload>
            </ImgCrop>
          </Form.Item>
        </div>
        <div className="agenda-form-footer">
          <Form.Item>
            <Button htmlType="button" onClick={handleCancel}>
              {t('content.cancel')}
            </Button>
            <Button type="primary" htmlType="submit">
              {t('content.save')}
            </Button>
          </Form.Item>
        </div>
      </Form>
    </div>
  )
}

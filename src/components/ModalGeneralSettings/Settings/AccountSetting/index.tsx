import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Form, Input, Upload, UploadFile, UploadProps, message, notification } from 'antd'
import ImgCrop from 'antd-img-crop'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
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
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const [updateUser, { isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [updateHcp, { isLoading: isHcpUpdatingLoading }] = useCreateUpdateHealthcarePartyMutation()

  const userAvatarSrc = useMemo(() => getImgSRC(currentUserHcp?.picture), [currentUserHcp?.picture])

  const [patientPictureAsBase64, setPatientPictureAsBase64] = useState<Int8Array | undefined>(undefined)
  const [isPictureRemoved, setIsPictureRemoved] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const [api, notificationContextHolder] = notification.useNotification()
  const [messageApi, messageContextHolder] = message.useMessage()

  useEffect(() => {
    form.setFieldsValue({
      firstName: currentUserHcp?.firstName,
      lastName: currentUserHcp?.lastName,
      emailAddress: user?.email,
    })
  }, [currentUserHcp, user, form])

  useEffect(() => {
    if (userAvatarSrc) {
      setFileList([
        {
          uid: '-1',
          name: 'profile-picture.png',
          status: 'done',
          url: userAvatarSrc,
        },
      ])
      setIsPictureRemoved(false)
    } else {
      setFileList([])
    }
  }, [userAvatarSrc])

  const handleSubmit = useCallback(
    async (values: { firstName: string; lastName: string; emailAddress: string }) => {
      try {
        const { firstName, lastName, emailAddress } = values

        let finalPicture = currentUserHcp?.picture

        if (patientPictureAsBase64) {
          finalPicture = patientPictureAsBase64
        } else if (isPictureRemoved) {
          finalPicture = undefined
        }

        await updateHcp(
          new HealthcareParty({
            ...currentUserHcp,
            firstName,
            lastName,
            picture: finalPicture,
          }),
        ).unwrap()

        if (user && emailAddress !== user.email) {
          await updateUser(new User({ ...user, email: emailAddress })).unwrap()
        }

        messageApi.success(t('notification.user_modified'))
      } catch (error) {
        api.error({
          message: t('notification.user_modify_failed'),
          description: t('notification.user_modify_error'),
        })
      }
    },
    [currentUserHcp, user, patientPictureAsBase64, isPictureRemoved, updateHcp, updateUser, messageApi, api, t],
  )

  const handleCancel = useCallback(() => {
    form.resetFields()
    setIsPictureRemoved(false)
    setPatientPictureAsBase64(undefined)
    setFileList(userAvatarSrc ? [{ uid: '-1', name: 'image.png', status: 'done', url: userAvatarSrc }] : [])
  }, [form, userAvatarSrc])

  const handleFileChange = useCallback(({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList)
    if (newFileList.length > 0) {
      setIsPictureRemoved(false)
    }
  }, [])

  const handleFileRemove = useCallback(() => {
    setFileList([])
    setPatientPictureAsBase64(undefined)
    setIsPictureRemoved(true)
  }, [])

  const onUploadData = useCallback((data: Int8Array | undefined) => {
    setPatientPictureAsBase64(data)
  }, [])

  const fileUploaderProps: UploadProps = useMemo(
    () => ({
      listType: 'picture-card',
      maxCount: 1,
      fileList: fileList,
      onChange: handleFileChange,
      onRemove: handleFileRemove,
    }),
    [fileList, handleFileChange, handleFileRemove],
  )

  const isLoading = isHcpUpdatingLoading || isCreateUpdateUserLoading

  return (
    <div className="manage-account-root">
      {notificationContextHolder}
      {messageContextHolder}

      {isLoading && <SpinLoader />}

      <Form
        className="manage-account-root__form"
        layout="vertical"
        onFinish={handleSubmit}
        colon={false}
        form={form}
        initialValues={{
          emailAddress: user?.email,
          firstName: currentUserHcp?.firstName,
          lastName: currentUserHcp?.lastName,
        }}
      >
        <div className="manage-account-root__form__inputs">
          <Form.Item name="firstName" label={t('content.firstname')} rules={[{ required: true, message: t('validation.firstname_required') }]}>
            <Input placeholder={t('content.firstname')} size="large" />
          </Form.Item>

          <Form.Item name="lastName" label={t('content.lastname')} rules={[{ required: true, message: t('validation.lastname_required') }]}>
            <Input placeholder={t('content.lastname')} size="large" />
          </Form.Item>

          <Form.Item
            name="emailAddress"
            label={t('content.email')}
            rules={[
              { required: true, message: t('validation.email_required') },
              { type: 'email', message: t('validation.email_invalid') },
            ]}
          >
            <Input placeholder={t('content.email')} size="large" />
          </Form.Item>

          <Form.Item label={t('content.picture')}>
            <ImgCrop rotationSlider modalClassName="PatientImgCrop">
              <Upload {...fileUploaderProps} {...getFileUploaderCommonProps(onUploadData)}>
                {fileList.length === 0 ? `+ ${t('content.upload')}` : `+ ${t('content.replace')}`}
              </Upload>
            </ImgCrop>
          </Form.Item>
        </div>

        <div className="agenda-form-footer">
          <Form.Item>
            <Button htmlType="button" onClick={handleCancel} disabled={isLoading}>
              {t('content.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {t('content.save')}
            </Button>
          </Form.Item>
        </div>
      </Form>
    </div>
  )
}

import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Form, Input, message } from 'antd'
import { ReactElement, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateHealthcarePartyMutation } from '../../../../core/api/healthcarePartyApi'
import { useNotificationHelper } from '../../../../core/hooks/useNotificationHelper'
import { SpinLoader } from '../../../common/SpinLoader'
import './index.less'

interface AccountSettingProps {
  currentUserHcp?: HealthcareParty
}

export const AccountSetting = ({ currentUserHcp }: AccountSettingProps): ReactElement => {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const [updateHcp, { isLoading: isHcpUpdatingLoading }] = useCreateUpdateHealthcarePartyMutation()

  const { openNotification, notificationContextHolder } = useNotificationHelper()
  const [messageApi, messageContextHolder] = message.useMessage()

  useEffect(() => {
    form.setFieldsValue({
      firstName: currentUserHcp?.firstName,
      lastName: currentUserHcp?.lastName,
    })
  }, [currentUserHcp, form])

  const handleSubmit = useCallback(
    async (values: { firstName: string; lastName: string }) => {
      try {
        const { firstName, lastName } = values

        await updateHcp(
          new HealthcareParty({
            ...currentUserHcp,
            firstName,
            lastName,
          }),
        ).unwrap()

        messageApi.success(t('notification.user_modified'))
      } catch (error) {
        openNotification('error', t('notification.user_modify_failed'), t('notification.user_modify_error'))
      }
    },
    [currentUserHcp, updateHcp, messageApi, openNotification, t],
  )

  const handleCancel = useCallback(() => {
    form.resetFields()
  }, [form])

  const isLoading = isHcpUpdatingLoading

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

import { CheckOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Col, Form, Input, Row, Space, notification } from 'antd'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RESERVED_WORDS } from '../../../constants'
import { getStringProperty } from '../helpers'

export type SiteInfoFormValues = {
  name: string
  location: string
  qBetterLocationId: string
}

interface EditableSiteInfoProps {
  hcp: HealthcareParty
  setShowEditableSite: React.Dispatch<React.SetStateAction<boolean>>
  onSave: (params: SiteInfoFormValues) => void
}

export const EditableSiteInfo = React.memo(({ hcp, setShowEditableSite, onSave }: EditableSiteInfoProps) => {
  const { t } = useTranslation()
  const [form] = Form.useForm<SiteInfoFormValues>()

  useEffect(() => {
    form.setFieldValue('name', hcp.name)
    form.setFieldValue('location', hcp.addresses[0]?.street ?? '')
    form.setFieldValue('qBetterLocationId', getStringProperty(hcp.publicProperties, 'SITE|QBETTER_LOCATION_ID'))
  }, [hcp, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      onSave(values)
      form.resetFields()
    } catch (error) {
      openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
    }
  }

  const handleCancel = useCallback(() => {
    form.resetFields()
    setShowEditableSite(false)
  }, [form, setShowEditableSite])

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

  const cardActions = (
    <Space>
      <Button size="middle" onClick={handleCancel}>
        {t('content.cancel')}
      </Button>
      <Button type="primary" size="middle" icon={<CheckOutlined />} onClick={handleSave}>
        {t('content.save')}
      </Button>
    </Space>
  )

  return (
    <Card title={t('content.edit_site_information')} extra={cardActions} style={{ maxWidth: 800, background: '#fafafa' }} size="small">
      {notificationContextHolder}
      <Form form={form} layout="vertical" autoComplete="off">
        <Row gutter={[16, 0]}>
          <Col span={8}>
            <Form.Item
              name="name"
              label={t('content.site_name')}
              style={{ marginBottom: 12 }}
              rules={[
                { required: true },
                {
                  validator: (_, value) => {
                    const cleanedValue = value ? value.toLowerCase().trim() : undefined
                    if (cleanedValue && RESERVED_WORDS.includes(cleanedValue)) {
                      return Promise.reject(new Error(t('validation.name_is_reserved', { word: cleanedValue })))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input autoFocus />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="location" label={t('content.address')} style={{ marginBottom: 12 }}>
              <Input prefix={<EnvironmentOutlined />} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="qBetterLocationId" label={t('content.qBetterLocationId')} style={{ marginBottom: 12 }}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  )
})

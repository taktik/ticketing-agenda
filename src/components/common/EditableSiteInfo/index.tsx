import { CheckOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Col, Form, Input, Row, Space } from 'antd'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RESERVED_WORDS } from '../../../constants'
import { getStringProperty } from '../helpers'
import { PropertyId } from '../../../core/api/fetchType'

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
    form.setFieldsValue({
      name: hcp.name,
      location: hcp.addresses[0]?.street ?? '',
      qBetterLocationId: getStringProperty(hcp.publicProperties, PropertyId.SITE_QBETTER_LOCATION_ID),
    })
  }, [hcp, form])

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      onSave(values)
    } catch (error) {}
  }, [form, onSave])

  const handleCancel = useCallback(() => {
    setShowEditableSite(false)
  }, [setShowEditableSite])

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
    <Card title={t('content.edit_site_information')} extra={cardActions} style={{ background: '#fafafa', marginBottom: 16 }} size="small">
      <Form form={form} layout="vertical" autoComplete="off" onFinish={handleSave}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="name"
              label={t('content.site_name')}
              rules={[
                { required: true, message: t('validation.name_required') },
                {
                  validator: async (_, value) => {
                    const cleanedValue = value ? value.toLowerCase().trim() : undefined
                    if (cleanedValue && RESERVED_WORDS.includes(cleanedValue)) {
                      return Promise.reject(new Error(t('validation.name_is_reserved', { word: cleanedValue })))
                    }
                  },
                },
              ]}
            >
              <Input autoFocus onPressEnter={handleSave} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="location" label={t('content.address')}>
              <Input prefix={<EnvironmentOutlined />} onPressEnter={handleSave} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="qBetterLocationId" label={t('content.qBetterLocationId')}>
              <Input onPressEnter={handleSave} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  )
})

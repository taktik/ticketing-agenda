import { CheckOutlined, CloseOutlined, EnvironmentOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Form, Input, Tooltip, Button, Space, Card } from 'antd'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export type SiteInfoFormValues = {
  name: string
  location: string
}

interface EditableSiteInfoProps {
  hcp: HealthcareParty
  setShowRenameInput: React.Dispatch<React.SetStateAction<boolean>>
  onSave: (params: SiteInfoFormValues) => void
}

export const EditableSiteInfo = React.memo(({ hcp, setShowRenameInput, onSave }: EditableSiteInfoProps) => {
  const { t } = useTranslation()
  const [form] = Form.useForm<SiteInfoFormValues>()

  useEffect(() => {
    form.setFieldValue('name', hcp.name)
    console.log('hcp', hcp)
  }, [hcp, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      onSave(values)
      form.resetFields()
    } catch (error) {
      console.log('Validation Failed:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setShowRenameInput(false)
  }

  return (
    <Card title="Edit Site Information" style={{ maxWidth: 500, background: '#fafafa' }}>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Site Name" rules={[{ required: true, message: 'Please enter the site name.' }]}>
          <Input size="large" placeholder="e.g., Main Clinic" autoFocus />
        </Form.Item>

        <Form.Item name="location" label="Location">
          <Input size="large" placeholder="e.g., Brussels, Belgium" prefix={<EnvironmentOutlined />} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button size="large" icon={<CloseOutlined />} onClick={handleCancel}>
              {t('content.cancel')}
            </Button>
            <Button type="primary" size="large" icon={<CheckOutlined />} onClick={handleSave}>
              {t('content.save')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
})

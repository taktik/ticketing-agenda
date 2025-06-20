import { CheckOutlined, CloseOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Form, Input, Tooltip, Button, Space } from 'antd'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

type FormValues = {
  name: string
}

interface renameInputProps {
  hcp: HealthcareParty
  setShowRenameInput: React.Dispatch<React.SetStateAction<boolean>>
  rename: (name: string) => void
}

export const RenameInput = React.memo(({ hcp, setShowRenameInput, rename }: renameInputProps) => {
  const { t } = useTranslation()

  const [form] = Form.useForm<FormValues>()
  const watchName = Form.useWatch('name', form)

  useEffect(() => {
    form.setFieldValue('name', hcp.name)
  }, [hcp, form])

  const handleRename = (newName: string) => {
    rename(newName)
    form.resetFields()
  }

  const handleCancel = () => {
    form.resetFields()
    setShowRenameInput(false)
  }

  return (
    <div className="site-rename-root">
      <Form form={form} className="site-rename-form">
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="name" rules={[{ required: true, message: 'Name of the site' }]} noStyle>
            <Input autoFocus style={{ minWidth: '350px', borderRadius: 0 }} />
          </Form.Item>

          <Button type="primary" size="large" icon={<CheckOutlined />} onClick={() => handleRename(watchName)}>
            {t('content.save')}
          </Button>
          <Button size="large" icon={<CloseOutlined />} onClick={handleCancel}>
            {t('content.cancel')}
          </Button>
        </Space.Compact>
      </Form>
    </div>
  )
})

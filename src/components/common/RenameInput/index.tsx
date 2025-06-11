import { RollbackOutlined, SaveOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Form, Input, Tooltip, Button } from 'antd'
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

  return (
    <div className="site-rename-root">
      <Form form={form} className="site-rename-form">
        <Form.Item name="name" rules={[{ required: true, message: 'Name of the site' }]}>
          <Input autoFocus />
        </Form.Item>
        <Tooltip title={t('content.cancel')}>
          <Button icon={<RollbackOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} disabled={watchName !== hcp.name} onClick={() => setShowRenameInput(false)} />
        </Tooltip>
        <Tooltip title={t('content.save_site')}>
          <Button icon={<SaveOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} disabled={watchName === hcp.name} onClick={() => handleRename(watchName)} />
        </Tooltip>
      </Form>
    </div>
  )
})

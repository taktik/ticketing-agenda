import React, { useState, useEffect } from 'react'
import type { Dispatch, FC, SetStateAction } from 'react'
import { Typography, Button, Input, Segmented, Space, Card, message, Divider, Form } from 'antd'
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { LanguageDescription } from '../ModalHierarchySettings/ServiceSetting'
import { useTranslation } from 'react-i18next'

const { Paragraph } = Typography

interface EditableServiceTitleProps {
  initialTitles: LanguageDescription | undefined
  onSave: (newTitles: LanguageDescription) => void
  showEditServiceTitle: boolean
  setShowEditServiceTitle: Dispatch<SetStateAction<boolean>>
}

export const EditableServiceTitle = ({ initialTitles, onSave, showEditServiceTitle, setShowEditServiceTitle }: EditableServiceTitleProps) => {
  const { t } = useTranslation()
  const [selectedLang, setSelectedLang] = useState('FR')
  const [form] = Form.useForm()

  const languages = ['FR', 'EN', 'NDLS', 'DE']

  useEffect(() => {
    if (showEditServiceTitle) {
      form.setFieldsValue({ descr: initialTitles })
    }
  }, [showEditServiceTitle, initialTitles, form])

  const handleCancel = () => {
    // Reset any changes and exit edit mode
    form.resetFields()
    setShowEditServiceTitle(false)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      onSave(values.descr)
    } catch (error) {
      message.error('Validation failed. Please check the required fields.')
    }
  }

  if (!showEditServiceTitle) {
    // --- DISPLAY MODE ---
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography.Title level={2}>{initialTitles?.FR || 'No title set.'}</Typography.Title>
      </div>
    )
  }

  // --- EDIT MODE ---
  return (
    <Form form={form} layout="vertical" style={{ paddingBottom: '1.5rem' }}>
      <Space direction="vertical" align="start">
        <Segmented options={languages} value={selectedLang} onChange={(lang) => setSelectedLang(String(lang))} />

        <Space.Compact style={{ width: '100%' }}>
          {languages.map((lang) => (
            <div key={lang} style={{ display: selectedLang === lang ? 'block' : 'none', width: '100%' }}>
              <Form.Item name={['descr', lang]} rules={[{ required: lang === 'FR', message: 'The service name in French is mandatory.' }]} noStyle>
                <Input size="large" placeholder={`Service name in ${lang}`} autoFocus onPressEnter={handleSave} style={{ minWidth: '350px', borderRadius: 0 }} />
              </Form.Item>
            </div>
          ))}
          <Button type="primary" size="large" icon={<CheckOutlined />} onClick={handleSave}>
            {t('content.save')}
          </Button>
          <Button size="large" icon={<CloseOutlined />} onClick={handleCancel}>
            {t('content.cancel')}
          </Button>
        </Space.Compact>
      </Space>
    </Form>
  )
}

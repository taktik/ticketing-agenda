import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Button, Form, FormInstance, Input, notification, Segmented, Space, Typography } from 'antd'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormValuesService, LanguageDescription } from '../ModalHierarchySettings/ServiceSetting'

interface EditableServiceTitleProps {
  form: FormInstance<FormValuesService>
  initialTitles: LanguageDescription | undefined
  onSave: (newTitles: LanguageDescription) => void
  showEditServiceTitle: boolean
  setShowEditServiceTitle: Dispatch<SetStateAction<boolean>>
}

export const EditableServiceTitle = ({ form, initialTitles, onSave, showEditServiceTitle, setShowEditServiceTitle }: EditableServiceTitleProps) => {
  const { t } = useTranslation()
  const [selectedLang, setSelectedLang] = useState('FR')

  const languages = ['FR', 'NL', 'EN', 'DE']
  const currentTitles = Form.useWatch('descr', form) || initialTitles

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

  useEffect(() => {
    if (showEditServiceTitle) {
      form.setFieldsValue({ descr: initialTitles })
    }
  }, [showEditServiceTitle, initialTitles, form])

  const handleCancel = useCallback(() => {
    form.resetFields()
    setShowEditServiceTitle(false)
  }, [setShowEditServiceTitle, form])

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      onSave(values.descr)
      form.resetFields()
    } catch (error) {
      openNotification('error', t('validation.validation_failed'), t('validation.check_highlighted_fields_correct_errors'))
    }
  }, [form, onSave])

  if (!showEditServiceTitle) {
    // --- DISPLAY MODE ---
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography.Title level={2}>{currentTitles?.FR || ''}</Typography.Title>
      </div>
    )
  }

  // --- EDIT MODE ---
  return (
    <Space direction="vertical" align="start">
      {notificationContextHolder}
      <Segmented options={languages} value={selectedLang} onChange={(lang) => setSelectedLang(String(lang))} />
      <Space.Compact style={{ width: '100%' }}>
        {languages.map((lang) => (
          <div key={lang} style={{ display: selectedLang === lang ? 'block' : 'none', width: '100%' }}>
            <Form.Item name={['descr', lang]} rules={[{ required: lang === 'FR', message: t('validation.service_name_in_french_mandatory') }]} noStyle>
              <Input size="large" placeholder={t('content.service_name_in_lang', { lang })} autoFocus onPressEnter={handleSave} style={{ minWidth: '350px', borderRadius: 0 }} />
            </Form.Item>
          </div>
        ))}
        <Button size="large" icon={<CloseOutlined />} onClick={handleCancel}>
          {t('content.cancel')}
        </Button>
        <Button type="primary" size="large" icon={<CheckOutlined />} onClick={handleSave}>
          {t('content.save')}
        </Button>
      </Space.Compact>
    </Space>
  )
}

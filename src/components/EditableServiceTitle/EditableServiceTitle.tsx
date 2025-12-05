import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Button, Form, FormInstance, Input, Segmented, Space, Typography } from 'antd'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormValuesService, LanguageDescription } from '../ModalHierarchySettings/ServiceSetting'
import { languages } from '../common/helpers'

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

  const currentTitles = Form.useWatch('descr', form) || initialTitles

  useEffect(() => {
    if (showEditServiceTitle && initialTitles) {
      form.setFieldsValue({ descr: initialTitles })
    }
  }, [showEditServiceTitle, initialTitles, form])

  const handleCancel = useCallback(() => {
    form.setFieldsValue({ descr: initialTitles })
    setShowEditServiceTitle(false)
  }, [setShowEditServiceTitle, form, initialTitles])

  const handleSave = useCallback(async () => {
    try {
      await form.validateFields([
        ['descr', 'FR'],
        ['descr', 'NL'],
        ['descr', 'EN'],
        ['descr', 'DE'],
      ])

      const values = form.getFieldsValue()
      onSave(values.descr)
    } catch (error) {}
  }, [form, onSave])

  // --- DISPLAY MODE ---
  if (!showEditServiceTitle) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {currentTitles?.FR || ''}
        </Typography.Title>
      </div>
    )
  }

  // --- EDIT MODE ---
  return (
    <Space direction="vertical" align="start" style={{ width: '100%' }}>
      <Segmented options={languages} value={selectedLang} onChange={(lang) => setSelectedLang(String(lang))} />

      <Space.Compact style={{ width: '100%', display: 'flex' }}>
        {languages.map((lang) => (
          <div key={lang} style={{ display: selectedLang === lang ? 'block' : 'none', flex: 1 }}>
            <Form.Item name={['descr', lang]} rules={[{ required: lang === 'FR', message: t('validation.service_name_in_french_mandatory') }]} noStyle>
              <Input size="large" placeholder={t('content.service_name_in_lang', { lang })} autoFocus={selectedLang === 'FR'} onPressEnter={handleSave} style={{ width: '100%', borderRadius: 0 }} />
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

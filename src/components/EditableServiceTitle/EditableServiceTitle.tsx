import { CheckOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, FormInstance, Input, Row, Segmented, Space, Typography } from 'antd'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormValuesService, LanguageDescription } from '../ModalHierarchySettings/ServiceSetting'
import { languages } from '../common/helpers'

interface EditableServiceTitleProps {
  form: FormInstance<FormValuesService>
  initialTitles: LanguageDescription | undefined
  initialQBetterServiceId: string
  onSave: (newTitles: LanguageDescription, qBetterServiceId: string) => void
  showEditServiceTitle: boolean
  setShowEditServiceTitle: Dispatch<SetStateAction<boolean>>
}

export const EditableServiceTitle = ({ form, initialTitles, initialQBetterServiceId, onSave, showEditServiceTitle, setShowEditServiceTitle }: EditableServiceTitleProps) => {
  const { t } = useTranslation()
  const [selectedLang, setSelectedLang] = useState('FR')

  const currentTitles = Form.useWatch('descr', form) || initialTitles

  useEffect(() => {
    if (showEditServiceTitle && initialTitles) {
      form.setFieldsValue({ descr: initialTitles, qBetterServiceId: initialQBetterServiceId })
    }
  }, [showEditServiceTitle, initialTitles, initialQBetterServiceId, form])

  const handleCancel = useCallback(() => {
    form.setFieldsValue({ descr: initialTitles, qBetterServiceId: initialQBetterServiceId })
    setShowEditServiceTitle(false)
  }, [setShowEditServiceTitle, form, initialTitles, initialQBetterServiceId])

  const handleSave = useCallback(async () => {
    try {
      await form.validateFields([
        ['descr', 'FR'],
        ['descr', 'NL'],
        ['descr', 'EN'],
        ['descr', 'DE'],
      ])

      const values = form.getFieldsValue()
      onSave(values.descr, values.qBetterServiceId ?? '')
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
    <Card title={t('content.edit_service_information')} extra={cardActions} style={{ background: '#fafafa', marginBottom: 16 }} size="small">
      <Row gutter={16} align="bottom">
        <Col span={12}>
          <Form.Item label={t('content.service_name')} required style={{ marginBottom: 0 }}>
            <Segmented options={languages} value={selectedLang} onChange={(lang) => setSelectedLang(String(lang))} style={{ marginBottom: 8 }} size="small" />
            {languages.map((lang) => (
              <div key={lang} style={{ display: selectedLang === lang ? 'block' : 'none' }}>
                <Form.Item name={['descr', lang]} rules={[{ required: lang === 'FR', message: t('validation.service_name_in_french_mandatory') }]} noStyle>
                  <Input placeholder={t('content.service_name_in_lang', { lang })} autoFocus={selectedLang === 'FR'} onPressEnter={handleSave} />
                </Form.Item>
              </div>
            ))}
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="qBetterServiceId" label={t('content.qBetterServiceId')} style={{ marginBottom: 0 }}>
            <Input onPressEnter={handleSave} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  )
}

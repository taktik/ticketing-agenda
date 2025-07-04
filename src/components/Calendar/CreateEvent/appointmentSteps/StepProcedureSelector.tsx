import { InfoCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, FormInstance, Select, Space, Tooltip, Typography } from 'antd'
import React, { FC, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AppointmentForm, FormProcedure } from '../CreateEvent'
import './index.css'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'

const { Title, Paragraph } = Typography
const { Option } = Select

interface ProcedureRowProps {
  name: number
  remove: (index: number) => void
  isFirst: boolean
  canRemove: boolean
  procedures: ProcedureSelection[]
  isProcedureLoading: boolean
}

const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

export const ProcedureRow = ({ name, remove, isFirst, canRemove, procedures, isProcedureLoading }: ProcedureRowProps): React.ReactElement => {
  const { t, i18n } = useTranslation()
  const form = Form.useFormInstance<AppointmentForm>()
  const formProcedures = Form.useWatch('procedures', form) || []

  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR' // Fallback
  }, [i18n.language])

  // Watch the procedureId for THIS specific row
  const procedureId = Form.useWatch(['procedures', name, 'procedureSelectionId'], form)
  const siteId = Form.useWatch(['procedures', name, 'site'], form)

  // Selected main procedure
  const selectedProcedure = procedures.find((s) => s.id === procedureId)

  // Selected SiteVariant
  const selectedSiteVariant = selectedProcedure ? selectedProcedure.siteVariants.find((siteVariant) => siteVariant.site.id === siteId) : undefined

  // Determine the list of available procedures for the dropdown
  const firstProcedureId = formProcedures[0]?.procedureSelectionId
  const firstService = procedures.find((s) => s.id === firstProcedureId)
  const selectedServiceName = firstService?.serviceName

  const availableProcedures = !isFirst && selectedServiceName ? procedures.filter((s) => s.serviceName === selectedServiceName) : procedures

  const onProcedureChange = (value: string, event: unknown) => {
    // When a procedure changes, reset the quantity to 1
    const newProcedures = [...formProcedures]
    if (newProcedures[name]) {
      newProcedures[name] = { ...newProcedures[name], procedureSelectionId: value, quantity: 1 }
      form.setFieldsValue({ procedures: newProcedures })
    }
  }

  const renderLabelWithTooltip = () => {
    return <div>hey</div>
    /*
    return (
      <Space>
        <span>{t('content.procedure')}</span>
        {selectedProcedure?.procedureDetails && (
          <Tooltip title={selectedProcedure.procedureDetails}>
            <InfoCircleOutlined
              style={{
                color: 'orange',
                cursor: 'help',
                fontSize: '16px',
              }}
            />
          </Tooltip>
        )}
      </Space>
    )
      */
  }

  return (
    <Card>
      <Space align="baseline" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: 0 }}>
          <Form.Item
            name={[name, 'procedureSelectionId']}
            label={renderLabelWithTooltip()}
            rules={[{ required: true, message: t('content.select_procedure_prompt') }]}
            style={{ marginBottom: 0 }}
            className="procedure-select "
          >
            <Select
              loading={isProcedureLoading}
              placeholder={t('content.select_procedure_placeholder')}
              showSearch
              disabled={!isFirst && !selectedServiceName}
              onChange={onProcedureChange}
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {availableProcedures.map((procedure) => (
                <Option key={procedure.id} value={procedure.id} label={procedure.displayTextByLanguage[langCode]}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>{procedure.displayTextByLanguage[langCode]}</div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className="right">
          <Form.Item name={[name, 'site']} label={t('content.select_site_prompt')} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
            <Select placeholder="Site" style={{ minWidth: '80px' }} disabled={selectedProcedure?.siteVariants && selectedProcedure?.siteVariants.length < 2} loading={isProcedureLoading}>
              {selectedProcedure?.siteVariants.map((variant) => (
                <Option key={variant.site.id} value={variant.site.id}>
                  {variant.site.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name={[name, 'quantity']} label={t('content.quantity')} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
            <Select placeholder="Qty" style={{ minWidth: '80px' }} disabled={!procedureId} loading={isProcedureLoading}>
              {selectedSiteVariant?.variants.map((variant) => (
                <Option key={variant.attendees} value={variant.attendees}>
                  {variant.attendees}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Tooltip title={t('content.remove_selection')}>
            <Button
              type="text"
              danger
              icon={<MinusCircleOutlined />}
              onClick={() => {
                remove(name)
              }}
              disabled={!canRemove}
              size="middle"
              style={{ fontSize: '18px', cursor: 'pointer' }}
            />
          </Tooltip>
        </div>
      </Space>
    </Card>
  )
}

export const StepProcedureSelector: FC<{ form: FormInstance<AppointmentForm>; procedures: ProcedureSelection[]; isProcedureLoading: boolean }> = ({ form, procedures, isProcedureLoading }) => {
  const { t } = useTranslation()
  const formProcedures = Form.useWatch('procedures', form)

  const firstProcedureId = formProcedures?.[0]?.procedureSelectionId
  const firstProcedure = procedures.find((p) => p.id === firstProcedureId)
  const selectedServiceName = firstProcedure?.serviceName

  useEffect(() => {
    // This effect runs when the first procedure selection changes.
    // It resets any subsequent selections that are no longer valid.
    if (formProcedures && formProcedures.length > 1 && selectedServiceName) {
      let hasChanges = false
      // Create a new array by mapping, ensuring each object has the correct shape.
      const newProcedures: FormProcedure[] = formProcedures.map((procedure, index) => {
        if (index === 0 || !procedure || !procedure.procedureSelectionId) return procedure

        const currentProcedureId = procedure.procedureSelectionId
        if (currentProcedureId) {
          const currentService = procedures.find((s) => s.id === currentProcedureId)

          // If the service name doesn't match, reset this item's procedureId.
          if (currentService?.serviceName !== selectedServiceName) {
            hasChanges = true
            return { ...procedure, procedureId: undefined }
          }
        }
        return procedure
      })

      if (hasChanges) {
        form.setFieldsValue({ procedures: newProcedures })
      }
    }
  }, [firstProcedureId, form, formProcedures, selectedServiceName])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }} className="procedure-selector">
      <Title level={4}>{t('content.select_procedures')}</Title>
      <Paragraph type="secondary">{t('content.add_procedures_instruction')}</Paragraph>
      <Form.List name="procedures" initialValue={[{ procedureId: undefined, quantity: 1 }]}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%', maxHeight: '350px', overflow: 'auto' }}>
            {fields.map(({ key, name, ...restField }, index) => {
              return <ProcedureRow key={key} name={name} remove={remove} isFirst={index === 0} canRemove={fields.length > 1} procedures={procedures} isProcedureLoading={isProcedureLoading} />
            })}
            <Form.Item>
              <Button type="dashed" onClick={() => add({ procedureId: undefined, quantity: 1 })} block icon={<PlusOutlined />}>
                {t('content.add_another_procedure')}
              </Button>
            </Form.Item>
          </Space>
        )}
      </Form.List>
    </Space>
  )
}

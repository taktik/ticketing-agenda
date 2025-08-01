import { ExclamationCircleOutlined, InfoCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, FormInstance, Select, Space, Tooltip, Typography } from 'antd'
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
  selections: ProcedureSelection[]
  isProcedureLoading: boolean
}

const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

export const ProcedureRow = ({ name, remove, isFirst, canRemove, selections, isProcedureLoading }: ProcedureRowProps): React.ReactElement => {
  const { t, i18n } = useTranslation()
  const form = Form.useFormInstance<AppointmentForm>()
  const formProcedures = Form.useWatch('procedures', form) || []

  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR' // Fallback
  }, [i18n.language])

  // --- Watched values from the form (this part is fine) ---
  const procedureId = Form.useWatch(['procedures', name, 'procedureSelectionId'], form)
  const siteId = Form.useWatch(['procedures', name, 'site'], form)

  // 1. Memoize the selected main procedure.
  const selectedProcedure = useMemo(() => {
    return selections.find((s) => s.id === procedureId)
  }, [procedureId, selections])

  // 2. Memoize the selected site variant.
  const selectedSiteVariant = useMemo(() => {
    return selectedProcedure?.siteVariants.find((siteVariant) => siteVariant.site.id === siteId)
  }, [selectedProcedure, siteId])

  // 3. Memoize the details of the *first* procedure row.
  const { firstProcedureSelection, selectedSite, selectedServiceName } = useMemo(() => {
    const firstProcId = formProcedures[0]?.procedureSelectionId
    const firstSiteId = formProcedures[0]?.site
    const firstProc = selections.find((s) => s.id === firstProcId)
    const firstSite = firstProc?.siteVariants.find((p) => p.site.id === firstSiteId)

    return {
      firstProcedureSelection: firstProc,
      selectedSite: firstSite,
      selectedServiceName: firstProc?.serviceName,
    }
  }, [formProcedures, selections])

  // 4. Memoize the filtered lists.
  const availableProcedures = useMemo(() => {
    return !isFirst && selectedServiceName ? selections.filter((s) => s.serviceName === selectedServiceName) : selections
  }, [isFirst, selectedServiceName, selections])

  const filteredAvailableProcedures = useMemo(() => {
    const firstSiteId = formProcedures[0]?.site
    return firstSiteId ? availableProcedures.filter((proc) => proc.siteVariants.some((variant) => variant.site.id === firstSiteId)) : selections
  }, [formProcedures, availableProcedures, selections])

  const availableSites = useMemo(() => {
    const firstSiteId = formProcedures[0]?.site
    const selectedSite = firstProcedureSelection?.siteVariants.find((p) => p.site.id === firstSiteId)
    return !isFirst && selectedProcedure ? selectedProcedure.siteVariants.filter((s) => s.site.id === selectedSite?.site.id) : selectedProcedure?.siteVariants
  }, [isFirst, selectedProcedure, formProcedures, firstProcedureSelection])

  const onProcedureChange = (value: string, event: unknown) => {
    // When a procedure changes, reset the quantity to 1
    const newProcedures = [...formProcedures]
    if (newProcedures[name]) {
      newProcedures[name] = { ...newProcedures[name], procedureSelectionId: value, quantity: 1 }
      form.setFieldsValue({ procedures: newProcedures })
    }
  }

  // TODO :
  // 1) tooltip appear after we selected both the procedure and the site (below the selecotrs ?)
  // 2) Make sure user cannot select the same service - procedure from two different site (lock the site selector to user first procedure choice)
  // 3) If user adds a procedure, it must be of the same service but also same site. So only display procedures that have the same service and site

  useEffect(() => {
    // 1. Check if there is exactly one site available.
    if (availableSites && availableSites.length === 1) {
      const singleSiteId = availableSites[0].site.id

      // 2. Get the current value of this specific field to avoid unnecessary updates.
      const currentSiteValue = form.getFieldValue(['procedures', name, 'site'])

      // 3. Only update the form if the current value isn't already set.
      //    This prevents an infinite re-render loop.
      if (currentSiteValue !== singleSiteId) {
        // 4. Use form.setFieldValue to update ONLY the field we care about.
        form.setFieldValue(['procedures', name, 'site'], singleSiteId)
      }
    }
  }, [availableSites, form, name])

  return (
    <Card style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: 0, width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: 0 }}>
            <Form.Item
              name={[name, 'procedureSelectionId']}
              label={t('content.procedure')}
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
                {filteredAvailableProcedures.map((procedure) => (
                  <Option key={procedure.id} value={procedure.id} label={procedure.displayTextByLanguage[langCode]}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>{procedure.displayTextByLanguage[langCode]}</div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name={[name, 'site']} label={t('content.site')} rules={[{ required: true, message: t('content.please_select_site') }]} style={{ marginBottom: 0 }}>
              <Select
                placeholder="Site"
                style={{ minWidth: '80px' }}
                disabled={!procedureId}
                loading={isProcedureLoading}
                className="site-select "
                defaultActiveFirstOption={availableSites ? availableSites.length === 1 : false}
              >
                {(availableSites ?? []).map((variant) => (
                  <Option key={variant.site.id} value={variant.site.id}>
                    {variant.site.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="right">
            <Form.Item name={[name, 'quantity']} label={t('content.quantity')} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
              <Select placeholder="Qty" style={{ minWidth: '80px' }} disabled={!procedureId || !siteId} loading={isProcedureLoading}>
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
                style={{ fontSize: '18px', cursor: 'pointer', alignSelf: 'end' }}
              />
            </Tooltip>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: 0, marginTop: '16px', width: '100%' }}>
          {selectedSiteVariant?.procedureDetails && (
            <Alert message={selectedSiteVariant?.procedureDetails} type="warning" showIcon icon={<ExclamationCircleOutlined />} style={{ width: '100%', whiteSpace: 'pre-wrap' }} />
          )}
        </div>
      </div>
    </Card>
  )
}

export const StepProcedureSelector: FC<{ form: FormInstance<AppointmentForm>; selections: ProcedureSelection[]; isProcedureLoading: boolean }> = ({ form, selections, isProcedureLoading }) => {
  const { t } = useTranslation()
  const formProcedures = Form.useWatch('procedures', form)

  const firstProcedureId = formProcedures?.[0]?.procedureSelectionId
  const firstProcedure = selections.find((p) => p.id === firstProcedureId)
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
          const currentService = selections.find((s) => s.id === currentProcedureId)

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
              return <ProcedureRow key={key} name={name} remove={remove} isFirst={index === 0} canRemove={fields.length > 1} selections={selections} isProcedureLoading={isProcedureLoading} />
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

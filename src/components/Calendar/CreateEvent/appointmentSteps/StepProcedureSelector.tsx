import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, FormInstance, Select, Space, Tooltip, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import { AppointmentForm, FormProcedure } from '../CreateEvent'
import './index.css'
const { Title, Paragraph } = Typography

const languageMapping: { [key: string]: string } = {
  fr: 'FR',
  nl: 'NL',
  en: 'EN',
  de: 'DE',
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

interface StepProcedureSelectorProps {
  form: FormInstance<AppointmentForm>
  selections: ProcedureSelection[]
  isProcedureLoading: boolean
}

interface ProcedureRowProps {
  field: { key: number; name: number }
  remove: (index: number) => void
  isFirst: boolean
  canRemove: boolean
  procedureOptions: ProcedureSelection[]
  isProcedureLoading: boolean
  lockedSiteId: string | null
  lockedSiteName: string | null
}

export const StepProcedureSelector = ({ form, selections, isProcedureLoading }: StepProcedureSelectorProps) => {
  const { t } = useTranslation()

  const formProcedures = Form.useWatch('procedures', form) as FormProcedure[] | undefined

  const { lockedServiceName, lockedSiteId, lockedSiteName } = useMemo(() => {
    const firstProcedureSelectionId = formProcedures?.[0]?.procedureSelectionId
    const firstSiteId = formProcedures?.[0]?.site

    if (!firstProcedureSelectionId || !firstSiteId) {
      return { lockedServiceName: null, lockedSiteId: null, lockedSiteName: null }
    }

    const firstProcedure = selections.find((p) => p.id === firstProcedureSelectionId)
    const siteVariant = firstProcedure?.siteVariants.find((sv) => sv.siteId === firstSiteId)

    return {
      lockedServiceName: firstProcedure?.serviceName ?? null,
      lockedSiteId: firstSiteId,
      lockedSiteName: siteVariant?.siteName ?? null,
    }
  }, [formProcedures, selections])

  const filteredProceduresForSubsequentRows = useMemo(() => {
    if (!lockedServiceName || !lockedSiteId) {
      return selections
    }

    // Condition 3 ? On pourrait empêcher d'ajouter un rdv pour un calendaritemtype qu'on a déjà choisi auparavant.
    // Si on fait ça, pas oublier de disable le add procedureRow par ex = disabled={!filteredProceduresForSubsequentRows}
    const selectedProcedureIds = new Set((formProcedures || []).map((proc) => proc.procedureSelectionId).filter(Boolean))

    // On ne garde que les démarches qui ont le bon service ET le bon site
    return selections.filter((proc) => proc.serviceName === lockedServiceName && proc.siteVariants.some((variant) => variant.siteId === lockedSiteId))
  }, [selections, lockedServiceName, lockedSiteId, formProcedures])

  const previousLockedServiceName = usePrevious(lockedServiceName)
  const previousLockedSiteId = usePrevious(lockedSiteId)

  useEffect(() => {
    const serviceHasChanged = previousLockedServiceName && lockedServiceName !== previousLockedServiceName
    const siteHasChanged = previousLockedSiteId && lockedSiteId !== previousLockedSiteId

    if (serviceHasChanged || siteHasChanged) {
      if (formProcedures && formProcedures.length > 1) {
        console.log('Le service ou le site a changé, réinitialisation des démarches suivantes.')

        form.setFieldsValue({ procedures: [formProcedures[0]] })
      }
    }
  }, [lockedServiceName, previousLockedServiceName, lockedSiteId, previousLockedSiteId, form, formProcedures])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }} className="procedure-selector">
      <Title level={4}>{t('content.select_procedures')}</Title>
      <Paragraph type="secondary">{t('content.add_procedures_instruction')}</Paragraph>
      <Form.List name="procedures" initialValue={[{ procedureId: undefined, quantity: 1 }]}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%', maxHeight: '350px', overflow: 'auto' }}>
            {fields.map((field, index) => (
              <ProcedureRow
                key={field.key}
                field={field}
                remove={remove}
                isFirst={index === 0}
                canRemove={fields.length > 1}
                procedureOptions={index === 0 ? selections : filteredProceduresForSubsequentRows}
                isProcedureLoading={isProcedureLoading}
                lockedSiteId={lockedSiteId}
                lockedSiteName={lockedSiteName}
              />
            ))}
            <Form.Item>
              <Button type="dashed" disabled={!filteredProceduresForSubsequentRows.length} onClick={() => add({ procedureId: undefined, quantity: 1, site: lockedSiteId ?? undefined })} block icon={<PlusOutlined />}>
                {t('content.add_another_procedure')}
              </Button>
            </Form.Item>
          </Space>
        )}
      </Form.List>
    </Space>
  )
}

export const ProcedureRow = ({ field, remove, isFirst, canRemove, procedureOptions, isProcedureLoading, lockedSiteId, lockedSiteName }: ProcedureRowProps) => {
  const { t, i18n } = useTranslation()
  const form = Form.useFormInstance()
  const { name } = field

  const procedureId = Form.useWatch(['procedures', name, 'procedureSelectionId'], form)
  const siteId = Form.useWatch(['procedures', name, 'site'], form)

  const selectedProcedure = useMemo(() => {
    return procedureOptions.find((s) => s.id === procedureId)
  }, [procedureId, procedureOptions])

  const availableSites = useMemo(() => {
    if (isFirst) {
      return selectedProcedure?.siteVariants || []
    }

    if (lockedSiteId && lockedSiteName) {
      const realVariant = selectedProcedure?.siteVariants.find((sv) => sv.siteId === lockedSiteId)
      if (realVariant) {
        return [realVariant]
      }

      return [
        {
          id: `locked-${lockedSiteId}`,
          siteId: lockedSiteId,
          siteName: lockedSiteName,
          agendaId: undefined,
          procedureDetails: '',
          variants: [],
        },
      ]
    }

    return []
  }, [isFirst, selectedProcedure, lockedSiteId, lockedSiteName])

  useEffect(() => console.log('selectedProcedure', selectedProcedure), [selectedProcedure])
  useEffect(() => console.log('availableSites', availableSites), [availableSites])

  const selectedSiteVariant = useMemo(() => {
    return availableSites.find((sv) => sv.siteId === siteId)
  }, [availableSites, siteId])

  const onProcedureChange = useCallback(
    (newProcedureId: string) => {
      const currentProcedures = form.getFieldValue('procedures') as FormProcedure[]
      const currentRowData = currentProcedures[name]

      if (isFirst) {
        const proc = procedureOptions.find((p) => p.id === newProcedureId)
        const sites = proc?.siteVariants || []
        form.setFieldValue(['procedures', name], {
          procedureSelectionId: newProcedureId,
          site: sites.length === 1 ? sites[0].siteId : undefined,
          quantity: 1,
        })
      } else {
        form.setFieldValue(['procedures', name], {
          ...currentRowData,
          procedureSelectionId: newProcedureId,
          quantity: 1,
        })
      }
    },
    [form, name, isFirst, procedureOptions],
  )

  return (
    <Card style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Space align="end" style={{ gap: '2rem' }}>
          <Form.Item name={[name, 'procedureSelectionId']} label={t('content.procedure')} rules={[{ required: true, message: t('content.select_procedure_prompt') }]}>
            <Select
              placeholder={t('content.select_procedure_placeholder')}
              loading={isProcedureLoading}
              showSearch
              optionFilterProp="label"
              style={{ width: '300px' }}
              onChange={onProcedureChange}
              options={procedureOptions.map((p) => ({
                value: p.id,
                label: p.displayTextByLanguage[i18n.language.toUpperCase()] || p.displayText,
              }))}
            />
          </Form.Item>

          <Form.Item name={[name, 'site']} label={t('content.site')} rules={[{ required: true, message: t('content.please_select_site') }]}>
            <Select
              placeholder={t('content.site')}
              style={{ width: '200px' }}
              disabled={!procedureId}
              loading={isProcedureLoading}
              options={availableSites.map((sv) => ({
                value: sv.siteId,
                label: sv.siteName,
              }))}
            />
          </Form.Item>

          <Form.Item name={[name, 'quantity']} label={t('content.quantity')} rules={[{ required: true }]}>
            <Select
              placeholder="Qty"
              style={{ minWidth: '80px' }}
              disabled={!siteId || !procedureId}
              options={selectedSiteVariant?.variants.map((v) => ({
                value: v.attendees,
                label: v.attendees,
              }))}
            />
          </Form.Item>
        </Space>

        <Form.Item>
          <Tooltip title={t('content.remove_selection')}>
            <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} disabled={!canRemove} size="middle" style={{ border: 'none', fontSize: '18px', cursor: 'pointer' }} />
          </Tooltip>
        </Form.Item>
      </div>

      {selectedSiteVariant?.procedureDetails && <Alert message={selectedSiteVariant.procedureDetails} type="warning" showIcon style={{ marginTop: '16px' }} />}
    </Card>
  )
}

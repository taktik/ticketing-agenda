import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, FormInstance, Select, Space, Tooltip, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import { AppointmentForm, FormProcedure } from '../CreateEvent'
import './index.css'

const { Title, Paragraph } = Typography
const { Option } = Select

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
}

export const StepProcedureSelectorTest = ({ form, selections, isProcedureLoading }: StepProcedureSelectorProps) => {
  const { t } = useTranslation()

  const formProcedures = Form.useWatch('procedures', form) as FormProcedure[] | undefined

  // Étape A : Déterminer le service et le site "verrouillés" par la première rangée
  const { lockedServiceName, lockedSiteId } = useMemo(() => {
    const firstProcedureSelectionId = formProcedures?.[0]?.procedureSelectionId
    const firstSiteId = formProcedures?.[0]?.site

    if (!firstProcedureSelectionId || !firstSiteId) {
      return { lockedServiceName: null, lockedSiteId: null }
    }

    const firstProcedure = selections.find((p) => p.id === firstProcedureSelectionId)
    return {
      lockedServiceName: firstProcedure?.serviceName ?? null,
      lockedSiteId: firstSiteId,
    }
  }, [formProcedures, selections])

  // Étape B : Pré-filtrer la liste des démarches pour les rangées suivantes
  const filteredProceduresForSubsequentRows = useMemo(() => {
    if (!lockedServiceName || !lockedSiteId) {
      return selections // Si rien n'est verrouillé, on montre tout
    }
    // On ne garde que les démarches qui ont le bon service ET le bon site
    return selections.filter((proc) => proc.serviceName === lockedServiceName && proc.siteVariants.some((variant) => variant.siteId === lockedSiteId))
  }, [selections, lockedServiceName, lockedSiteId])

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
              />
            ))}
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

export const ProcedureRow = ({ field, remove, isFirst, canRemove, procedureOptions, isProcedureLoading }: ProcedureRowProps) => {
  const { t, i18n } = useTranslation()
  const form = Form.useFormInstance()
  const { name } = field

  // On observe uniquement les valeurs de CETTE rangée
  const procedureId = Form.useWatch(['procedures', name, 'procedureSelectionId'], form)
  const siteId = Form.useWatch(['procedures', name, 'site'], form)

  const selectedProcedure = useMemo(() => {
    return procedureOptions.find((s) => s.id === procedureId)
  }, [procedureId, procedureOptions])

  const availableSites = useMemo(() => selectedProcedure?.siteVariants || [], [selectedProcedure])

  useEffect(() => console.log('selectedProcedure', selectedProcedure), [selectedProcedure])
  useEffect(() => console.log('availableSites', availableSites), [availableSites])

  const selectedSiteVariant = useMemo(() => {
    return availableSites.find((sv) => sv.siteId === siteId)
  }, [availableSites, siteId])

  // L'onChange est maintenant responsable de la logique de "auto-sélection"
  const onProcedureChange = useCallback(
    (newProcedureId: string) => {
      const proc = procedureOptions.find((p) => p.id === newProcedureId)
      const sites = proc?.siteVariants || []

      // On met à jour la valeur de la démarche ET on auto-sélectionne le site si un seul est disponible.
      // C'est une seule mise à jour, ce qui est plus propre qu'un useEffect.
      form.setFieldValue(['procedures', name], {
        procedureSelectionId: newProcedureId,
        site: sites.length === 1 ? sites[0].siteId : undefined, // Auto-sélection
        quantity: 1, // Réinitialise la quantité
      })
    },
    [form, name, procedureOptions],
  )

  return (
    <Card style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
        {/* Section de gauche avec les sélecteurs */}
        <Space align="end">
          <Form.Item name={[name, 'procedureSelectionId']} label={t('content.procedure')} rules={[{ required: true, message: t('content.select_procedure_prompt') }]}>
            <Select
              placeholder={t('content.select_procedure_placeholder')}
              loading={isProcedureLoading}
              showSearch
              optionFilterProp="label"
              style={{ width: '300px' }} // Donner une largeur fixe est souvent une bonne idée
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
              disabled={!procedureId || availableSites.length <= 1}
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
              disabled={!siteId}
              options={selectedSiteVariant?.variants.map((v) => ({
                value: v.attendees,
                label: v.attendees,
              }))}
            />
          </Form.Item>
        </Space>

        {/* Section de droite avec le bouton de suppression */}
        <Form.Item>
          <Tooltip title={t('content.remove_selection')}>
            <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} disabled={!canRemove} style={{ border: 'none' }} />
          </Tooltip>
        </Form.Item>
      </div>

      {/* Affichage des détails de la procédure en bas */}
      {selectedSiteVariant?.procedureDetails && <Alert message={selectedSiteVariant.procedureDetails} type="warning" showIcon style={{ marginTop: '16px' }} />}
    </Card>
  )
}

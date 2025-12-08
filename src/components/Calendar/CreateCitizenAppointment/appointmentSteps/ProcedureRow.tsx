import { MinusCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Select, Space, Tooltip } from 'antd'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'
import { AppointmentDraft, ProcedureGroup } from '../CitizenReservationTypes'
interface ProcedureRowProps {
  draft: AppointmentDraft
  index: number
  canRemove: boolean
  availableProcedures: ProcedureGroup[]
  lockedAgendaId?: string
  isLoading: boolean
}

export const ProcedureRow = ({ draft, availableProcedures, lockedAgendaId, canRemove, isLoading }: ProcedureRowProps) => {
  const { t, i18n } = useTranslation()
  const { updateDraft, removeDraft } = useCitizenReservation()

  // 1. Resolve Hierarchy Nodes
  const selectedGroup = useMemo(() => availableProcedures.find((p) => p.id === draft.procedureGroupId), [availableProcedures, draft.procedureGroupId])

  // 2. Filter Sites based on Agenda Lock
  const availableSiteVariants = useMemo(() => {
    if (!selectedGroup) return []

    // If locked, strict filter by Agenda ID
    if (lockedAgendaId) {
      return selectedGroup.siteVariants.filter((sv) => sv.agenda.id === lockedAgendaId)
    }
    return selectedGroup.siteVariants
  }, [selectedGroup, lockedAgendaId])

  // 3. Resolve Selected Variant
  const selectedSiteVariant = useMemo(
    () =>
      // Check against filtered list to ensure validity
      availableSiteVariants.find((sv) => sv.id === draft.siteVariantId),
    [availableSiteVariants, draft.siteVariantId],
  )

  // 4. Quantities
  const availableQuantities = useMemo(() => {
    return selectedSiteVariant?.procedureVariants.map((v) => v.attendees) || []
  }, [selectedSiteVariant])

  // --- HANDLERS ---

  const handleProcedureChange = useCallback(
    (val: string) => {
      let autoSiteVariantId = undefined

      // Auto-Select Logic
      const group = availableProcedures.find((p) => p.id === val)
      if (group) {
        let validVariants = group.siteVariants

        // Filter by Lock if active
        if (lockedAgendaId) {
          validVariants = validVariants.filter((sv) => sv.agenda.id === lockedAgendaId)
        }

        // If only 1 valid option exists (common with Locks), auto-select it
        if (validVariants.length === 1) {
          autoSiteVariantId = validVariants[0].id
        }
      }

      updateDraft(draft.tempId, {
        procedureGroupId: val,
        siteVariantId: autoSiteVariantId,
        quantity: undefined, // Reset quantity
      })
    },
    [draft.tempId, lockedAgendaId, availableProcedures, updateDraft],
  )

  const handleSiteChange = useCallback(
    (val: string) => {
      updateDraft(draft.tempId, { siteVariantId: val, quantity: undefined })
    },
    [draft.tempId, updateDraft],
  )

  const handleQuantityChange = useCallback(
    (val: number) => {
      updateDraft(draft.tempId, { quantity: val })
    },
    [draft.tempId, updateDraft],
  )

  const currentLang = i18n.language.toUpperCase()

  return (
    <Card style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Space align="end" style={{ gap: '2rem' }}>
          {/* PROCEDURE */}
          <Form.Item label={t('content.procedure')} required style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '300px' }}
              loading={isLoading}
              showSearch
              optionFilterProp="label"
              value={draft.procedureGroupId}
              onChange={handleProcedureChange}
              options={availableProcedures.map((p) => ({
                value: p.id,
                label: p.displayTextByLanguage[currentLang] || p.displayTextByLanguage['FR'],
              }))}
            />
          </Form.Item>

          {/* SITE (Auto-filtered by Agenda Lock) */}
          <Form.Item label={t('content.site')} required style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '200px' }}
              // Disable if no procedure, OR if locked/auto-selected (User choice depends on UX preference)
              // Enabling it allows user to see "Oh, only 1 site available"
              disabled={!draft.procedureGroupId}
              value={draft.siteVariantId}
              onChange={handleSiteChange}
              options={availableSiteVariants.map((sv) => ({
                value: sv.id,
                label: sv.siteName || t('content.unknown_site'),
              }))}
            />
          </Form.Item>

          {/* QUANTITY */}
          <Form.Item label={t('content.quantity')} required style={{ marginBottom: 0 }}>
            <Select
              style={{ minWidth: '80px' }}
              disabled={!draft.siteVariantId}
              value={draft.quantity}
              onChange={handleQuantityChange}
              options={availableQuantities.map((q) => ({
                value: q,
                label: q,
              }))}
            />
          </Form.Item>
        </Space>

        <Tooltip title={t('content.remove_selection')}>
          <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeDraft(draft.tempId)} disabled={!canRemove} size="middle" style={{ border: 'none', fontSize: '18px', cursor: 'pointer' }} />
        </Tooltip>
      </div>

      {selectedSiteVariant?.procedureDetails && <Alert message={selectedSiteVariant.procedureDetails} type="warning" showIcon style={{ marginTop: '16px' }} />}
    </Card>
  )
}

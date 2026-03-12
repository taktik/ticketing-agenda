import { MinusCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Form, Row, Select, Tooltip } from 'antd'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LANGUAGE_FALLBACK } from '../../../../constants'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'
import { AppointmentDraft, ProcedureGroup } from '../../../../types/citizenReservationTypes'
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
  const currentLang = i18n.language.toUpperCase()

  const selectedGroup = useMemo(() => availableProcedures.find((p) => p.id === draft.procedureGroupId), [availableProcedures, draft.procedureGroupId])

  const availableSiteVariants = useMemo(() => {
    if (!selectedGroup) return []

    const filteredVariants = lockedAgendaId ? selectedGroup.siteVariants.filter((sv) => sv.agenda.id === lockedAgendaId) : selectedGroup.siteVariants

    return [...filteredVariants].sort((a, b) => {
      const nameA = a.site.name || ''
      const nameB = b.site.name || ''
      return nameA.localeCompare(nameB)
    })
  }, [selectedGroup, lockedAgendaId])

  const selectedSiteVariant = useMemo(() => availableSiteVariants.find((sv) => sv.id === draft.siteVariantId), [availableSiteVariants, draft.siteVariantId])

  const availableQuantities = useMemo(() => {
    return selectedSiteVariant?.procedureVariants.map((v) => v.attendees) || []
  }, [selectedSiteVariant])

  const sortedProcedures = useMemo(() => {
    return [...availableProcedures].sort((a, b) => {
      const labelA = a.displayTextByLanguage[currentLang] || a.displayTextByLanguage[DEFAULT_LANGUAGE_FALLBACK] || ''
      const labelB = b.displayTextByLanguage[currentLang] || b.displayTextByLanguage[DEFAULT_LANGUAGE_FALLBACK] || ''

      return labelA.localeCompare(labelB)
    })
  }, [availableProcedures, currentLang])

  const handleProcedureChange = useCallback(
    (val: string) => {
      let autoSiteVariantId = undefined

      const group = availableProcedures.find((p) => p.id === val)
      if (group) {
        let validVariants = group.siteVariants

        // Filter by Lock if active
        if (lockedAgendaId) {
          validVariants = validVariants.filter((sv) => sv.agenda.id === lockedAgendaId)
        }

        // If only 1 valid option exists auto-select it
        if (validVariants.length === 1) {
          autoSiteVariantId = validVariants[0].id
        }
      }

      updateDraft(draft.tempId, {
        procedureGroupId: val,
        siteVariantId: autoSiteVariantId,
        quantity: 1,
      })
    },
    [draft.tempId, lockedAgendaId, availableProcedures, updateDraft],
  )

  const handleSiteChange = useCallback(
    (val: string) => {
      updateDraft(draft.tempId, { siteVariantId: val, quantity: 1 })
    },
    [draft.tempId, updateDraft],
  )

  const handleQuantityChange = useCallback(
    (val: number) => {
      updateDraft(draft.tempId, { quantity: val })
    },
    [draft.tempId, updateDraft],
  )

  return (
    <Card style={{ width: '100%' }}>
      <Row gutter={[16, 12]} align="bottom">
        <Col xs={24} sm={24} md={10}>
          <Form.Item label={t('content.procedure')} required style={{ marginBottom: 0 }}>
            <Select
              placeholder={t('content.select_procedure_placeholder')}
              style={{ width: '100%' }}
              loading={isLoading}
              showSearch
              optionFilterProp="label"
              value={draft.procedureGroupId}
              onChange={handleProcedureChange}
              options={sortedProcedures.map((p) => ({
                value: p.id,
                label: p.displayTextByLanguage[currentLang] || p.displayTextByLanguage[DEFAULT_LANGUAGE_FALLBACK],
              }))}
            />
          </Form.Item>
        </Col>

        <Col xs={14} sm={14} md={7}>
          <Form.Item label={t('content.site')} required style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('content.site')}
              disabled={!draft.procedureGroupId}
              value={draft.siteVariantId}
              onChange={handleSiteChange}
              options={availableSiteVariants.map((sv) => ({
                value: sv.id,
                label: sv.siteName || t('content.unknown_site'),
              }))}
            />
          </Form.Item>
        </Col>

        <Col xs={8} sm={8} md={5}>
          <Form.Item label={t('content.quantity')} required style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('content.quantity')}
              disabled={!draft.siteVariantId}
              value={draft.quantity}
              onChange={handleQuantityChange}
              options={availableQuantities.map((q) => ({
                value: q,
                label: q,
              }))}
            />
          </Form.Item>
        </Col>

        <Col xs={2} sm={2} md={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4 }}>
          <Tooltip title={t('content.remove_selection')}>
            <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeDraft(draft.tempId)} disabled={!canRemove} size="middle" style={{ border: 'none', fontSize: '18px', cursor: 'pointer' }} />
          </Tooltip>
        </Col>
      </Row>

      {selectedSiteVariant?.procedureDetails && <Alert message={selectedSiteVariant.procedureDetails} type="warning" showIcon style={{ marginTop: '16px' }} />}
    </Card>
  )
}

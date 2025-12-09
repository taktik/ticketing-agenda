import { PlusOutlined } from '@ant-design/icons'
import { Button, Space, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'
import { ProcedureRow } from './ProcedureRow'

const { Title, Paragraph } = Typography

export const StepProcedureSelector = () => {
  const { t } = useTranslation()
  const { drafts, availableProcedures, addDraft, isLoadingData } = useCitizenReservation()

  const primaryDraft = drafts[0]
  const lockedAgendaId = primaryDraft?.agenda?.id

  const selectedProcedureIds = useMemo(() => {
    return new Set(drafts.map((d) => d.procedureGroupId).filter(Boolean))
  }, [drafts])

  const filteredProcedures = useMemo(() => {
    if (!lockedAgendaId) return availableProcedures

    return availableProcedures.filter((p) => p.siteVariants.some((sv) => sv.agenda.id === lockedAgendaId))
  }, [availableProcedures, lockedAgendaId])

  const remainingOptions = useMemo(() => {
    if (!lockedAgendaId) return []
    return filteredProcedures.filter((p) => !selectedProcedureIds.has(p.id))
  }, [filteredProcedures, selectedProcedureIds, lockedAgendaId])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }} className="procedure-selector">
      <Title level={4}>{t('content.select_procedures')}</Title>
      <Paragraph type="secondary">{t('content.add_procedures_instruction')}</Paragraph>

      <Space direction="vertical" style={{ width: '100%', maxHeight: '350px', overflow: 'auto' }}>
        {drafts.map((draft, index) => {
          const rowOptions =
            index === 0
              ? availableProcedures
              : filteredProcedures.filter((p) => {
                  return !selectedProcedureIds.has(p.id) || p.id === draft.procedureGroupId
                })

          return (
            <ProcedureRow
              key={draft.tempId}
              draft={draft}
              index={index}
              canRemove={drafts.length > 1}
              availableProcedures={rowOptions}
              lockedAgendaId={index === 0 ? undefined : lockedAgendaId}
              isLoading={isLoadingData}
            />
          )
        })}

        <div style={{ marginTop: 8 }}>
          <Button type="dashed" onClick={addDraft} block icon={<PlusOutlined />} disabled={!lockedAgendaId || isLoadingData || remainingOptions.length === 0}>
            {t('content.add_another_procedure')}
          </Button>
        </div>
      </Space>
    </Space>
  )
}

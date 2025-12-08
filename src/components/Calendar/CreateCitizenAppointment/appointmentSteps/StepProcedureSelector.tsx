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

  // 1. Locking Logic
  // The first valid draft dictates the Service (Agenda) for everyone else.
  // Since an Agenda belongs to one Site, this implicitly locks the Site too.
  const primaryDraft = drafts[0]
  const lockedAgendaId = primaryDraft?.agenda?.id

  // 2. Filter available options for subsequent rows
  // Only show procedures available in the locked Service.
  const filteredProcedures = useMemo(() => {
    if (!lockedAgendaId) return availableProcedures

    return availableProcedures.filter((p) => p.siteVariants.some((sv) => sv.agenda.id === lockedAgendaId))
  }, [availableProcedures, lockedAgendaId])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }} className="procedure-selector">
      <Title level={4}>{t('content.select_procedures')}</Title>
      <Paragraph type="secondary">{t('content.add_procedures_instruction')}</Paragraph>

      <Space direction="vertical" style={{ width: '100%', maxHeight: '350px', overflow: 'auto' }}>
        {drafts.map((draft, index) => {
          // Row 0 gets full list. Row 1+ gets filtered list.
          const rowOptions = index === 0 ? availableProcedures : filteredProcedures

          return (
            <ProcedureRow
              key={draft.tempId}
              draft={draft}
              index={index}
              canRemove={drafts.length > 1}
              availableProcedures={rowOptions}
              // Pass ONLY the Agenda Lock
              lockedAgendaId={index === 0 ? undefined : lockedAgendaId}
              isLoading={isLoadingData}
            />
          )
        })}

        <div style={{ marginTop: 8 }}>
          <Button
            type="dashed"
            onClick={addDraft}
            block
            icon={<PlusOutlined />}
            // Disable until a Service is selected
            disabled={!lockedAgendaId || isLoadingData}
          >
            {t('content.add_another_procedure')}
          </Button>
        </div>
      </Space>
    </Space>
  )
}

import { CalendarItemType } from '@icure/cardinal-sdk'
import { Button, Divider, Spin, Typography } from 'antd'
import React, { ReactElement, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'
import { ButtonStyleType, StyledButton } from '../common/StyledButton'

interface ProcedureSelectorProps {
  procedures: CalendarItemType[]
  isProceduresLoading: boolean
  selectedProcedure: CalendarItemType | undefined
  setSelectedProcedure: React.Dispatch<React.SetStateAction<CalendarItemType | undefined>>
}

export const ProcedureSelector = ({ procedures, isProceduresLoading, selectedProcedure, setSelectedProcedure }: ProcedureSelectorProps): ReactElement => {
  const { t } = useTranslation()

  const handleSelectProcedureClick = useCallback(
    (procedure: CalendarItemType) => {
      const toSelect = procedure.id === selectedProcedure?.id ? undefined : procedure
      setSelectedProcedure(toSelect)
    },
    [selectedProcedure],
  )

  return (
    <div className="DemarcheSelector">
      <div className="DemarcheSelectorHeader">
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('content.procedures')}
        </Typography.Title>
      </div>

      <Divider style={{ margin: 0 }} />

      {isProceduresLoading ? (
        <div className="selector-spin">
          <Spin />
        </div>
      ) : (
        <div className="DemarchesContent">
          {procedures.map((procedure) => {
            const isSelected = selectedProcedure?.id === procedure.id
            return (
              <StyledButton
                key={procedure.id}
                onClick={() => {
                  handleSelectProcedureClick(procedure)
                }}
                stylingType={isSelected ? ButtonStyleType.BlackThemeActive : ButtonStyleType.BlackTheme}
              >
                {procedure.name}
              </StyledButton>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { CalendarItemType } from '@icure/cardinal-sdk'
import { Button, Divider, Typography } from 'antd'
import React, { ReactElement, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'

interface ProcedureSelectorProps {
  procedures: CalendarItemType[]
  selectedProcedure: CalendarItemType | undefined
  setSelectedProcedure: React.Dispatch<React.SetStateAction<CalendarItemType | undefined>>
}

export const ProcedureSelector = ({ procedures, selectedProcedure, setSelectedProcedure }: ProcedureSelectorProps): ReactElement => {
  const { t } = useTranslation()

  const handleSelectDemarcheClick = useCallback(
    (demarche: CalendarItemType) => {
      const toSelect = demarche.id === selectedProcedure?.id ? undefined : demarche
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

      <div className="DemarchesContent">
        {procedures.map((procedure) => {
          const isSelected = selectedProcedure?.id === procedure.id
          return (
            <Button
              key={procedure.id}
              type={isSelected ? 'primary' : 'default'}
              onClick={() => {
                handleSelectDemarcheClick(procedure)
              }}
              style={{
                whiteSpace: 'nowrap',
                minWidth: '80px',
                ...(isSelected && {
                  backgroundColor: '#1890ff',
                  color: 'white',
                  borderColor: '#1890ff',
                }),
              }}
            >
              {procedure.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

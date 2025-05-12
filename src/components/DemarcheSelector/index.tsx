import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Agenda, CalendarItemType, TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Divider, Typography, notification, message, Tooltip } from 'antd'
import React, { ReactElement, useCallback, useEffect } from 'react'
import './index.css'
import { useDeleteTimeTableMutation } from '../../core/api/timeTableApi'
import { useTranslation } from 'react-i18next'

interface DemarcheSelectorProps {
  demarches: CalendarItemType[]
  selectedDemarche: CalendarItemType | undefined
  setSelectedDemarche: React.Dispatch<React.SetStateAction<CalendarItemType | undefined>>
}

export const DemarcheSelector = ({ demarches, selectedDemarche, setSelectedDemarche }: DemarcheSelectorProps): ReactElement => {
  const { t } = useTranslation()

  const handleSelectDemarcheClick = useCallback(
    (demarche: CalendarItemType) => {
      const toSelect = demarche.id === selectedDemarche?.id ? undefined : demarche
      setSelectedDemarche(toSelect)
    },
    [selectedDemarche],
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
        {demarches.map((demarche) => {
          const isSelected = selectedDemarche?.id === demarche.id
          return (
            <Button
              key={demarche.id}
              type={isSelected ? 'primary' : 'default'}
              onClick={() => {
                handleSelectDemarcheClick(demarche)
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
              {demarche.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

/*

 <Tooltip title="Delete the demarche">
            <Button
              type="primary"
              icon={<DeleteOutlined />}
              danger
              disabled={!selectedDemarche}
              onClick={() => {
                if (selectedDemarche) {
                  deleteDemarche(selectedDemarche)
                  setSelectedDemarche(undefined)
                }
              }}
            />
          </Tooltip>

          */

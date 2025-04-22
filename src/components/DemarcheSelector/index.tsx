import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Agenda, TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Divider, Typography, notification, message } from 'antd'
import React, { ReactElement, useCallback, useEffect } from 'react'
import './index.css'
import { useDeleteTimeTableMutation } from '../../core/api/timeTableApi'

interface DemarcheSelectorProps {
  demarches: TimeTable[]
  selectedDemarche: TimeTable | undefined
  setSelectedDemarche: React.Dispatch<React.SetStateAction<TimeTable | undefined>>
  setAddDemarcheModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const DemarcheSelector = ({ demarches, selectedDemarche, setSelectedDemarche, setAddDemarcheModalOpen }: DemarcheSelectorProps): ReactElement => {
  const addDemarche = useCallback(() => {
    setAddDemarcheModalOpen(true)
  }, [setAddDemarcheModalOpen])

  const [deleteDemarche, { isError, isSuccess, isLoading }] = useDeleteTimeTableMutation()

  useEffect(() => {
    if (isLoading) showMessageFeedback('loading', 'The demarche is deleting...')
    if (isSuccess) showMessageFeedback('success', 'The demarche was deleted!')
    if (isError) openNotification('error', 'We could not delete the demarche!', `An error occurred while deleting the demarche.`)
  }, [isLoading, isSuccess, isError])

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  const handleSelectDemarcheClick = useCallback(
    (demarche: TimeTable) => {
      const toSelect = demarche.id === selectedDemarche?.id ? undefined : demarche
      setSelectedDemarche(toSelect)
    },
    [selectedDemarche],
  )

  return (
    <div className="DemarcheSelector">
      <div className="DemarcheSelectorHeader">
        <Typography.Title level={5} style={{ margin: 0 }}>
          Demarches
        </Typography.Title>
        <div className="ServiceSelectorButtons">
          <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={addDemarche} style={{ padding: 0 }} />
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
        </div>
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

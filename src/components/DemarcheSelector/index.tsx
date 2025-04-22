import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button } from 'antd'
import React, { ReactElement } from 'react'
import './index.css'

interface DemarcheSelectorProps {
  demarches: TimeTable[]
  selectedDemarche: TimeTable | undefined
  setSelectedDemarche: React.Dispatch<React.SetStateAction<TimeTable | undefined>>
}

export const DemarcheSelector = ({ demarches, selectedDemarche, setSelectedDemarche }: DemarcheSelectorProps): ReactElement => {
  const options = demarches.map((demarche) => ({
    label: demarche.name,
    value: demarche.id,
  }))

  return (
    <div className="selectorRoot">
      <AntSelect
        allowClear
        showSearch
        style={{ width: '100%' }}
        placeholder="Select a demarche"
        optionFilterProp="label"
        labelInValue
        filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
        options={options}
        value={selectedDemarche ? { label: selectedDemarche.name, value: selectedDemarche.id } : undefined}
        onChange={(option) => {
          if (option && option.value) {
            const selected = demarches.find((demarche) => demarche.id === option.value)
            setSelectedDemarche(selected)
          } else {
            setSelectedDemarche(undefined)
          }
        }}
      />
      <Button type="primary" shape="circle" icon={<PlusOutlined />} />
      <Button type="primary" shape="circle" icon={<DeleteOutlined />} danger disabled={!selectedDemarche} />
    </div>
  )
}

/*

import { HealthcareParty } from '@icure/cardinal-sdk'
import { Divider, Typography, message, notification } from 'antd'
import { useCallback, useEffect } from 'react'
import { useDeleteHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'
import './index.css'

interface DemarcheSelectorProps {
  demarches: TimeTable[]
  selectedDemarche: TimeTable | undefined
  setSelectedDemarche: React.Dispatch<React.SetStateAction<TimeTable | undefined>>
  setDemarcheModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const DemarcheSelector = ({ demarches, selectedDemarche, setSelectedDemarche, setDemarcheModalOpen }: DemarcheSelectorProps): ReactElement => {
  const addDemarche = useCallback(() => {
    setDemarcheModalOpen(true)
  }, [setDemarcheModalOpen])

  const [deleteService, { isError, isSuccess, isLoading }] = useDeleteHealthcarePartyMutation()

  useEffect(() => {
    if (isLoading) showMessageFeedback('loading', 'The site is deleting...')
    if (isSuccess) showMessageFeedback('success', 'The site was deleted!')
    if (isError) openNotification('error', 'We could not delete the site!', `An error occurred while deleting the site.`)
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

  return (
    <div style={{ width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '16px' }}>
      <div className="ServiceSelectorHeader">
        <Typography.Title level={5} style={{ margin: 0 }}>
          Services
        </Typography.Title>
        <div className="ServiceSelectorButtons">
          <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={addService} style={{ padding: 0 }} />
          <Button
            type="primary"
            icon={<DeleteOutlined />}
            danger
            disabled={!selectedService}
            onClick={() => {
              if (selectedService) {
                deleteService(selectedService)
                setSelectedService(undefined)
              }
            }}
          />
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id
          return (
            <Button
              key={service.id}
              type={isSelected ? 'primary' : 'default'}
              onClick={() => setSelectedService(service)}
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
              {service.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
*/

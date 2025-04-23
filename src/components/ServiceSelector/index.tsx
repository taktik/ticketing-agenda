import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Agenda, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Divider, Typography, notification, message, Tooltip } from 'antd'
import React, { useCallback, useEffect } from 'react'
import './index.css'
import { useDeleteHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'

interface ServiceSelectorProps {
  services: HealthcareParty[]
  selectedService: HealthcareParty | undefined
  setSelectedService: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
  setServiceModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const ServiceSelector = ({ services, selectedService, setSelectedService, setServiceModalOpen }: ServiceSelectorProps): React.ReactElement => {
  const addService = useCallback(() => {
    setServiceModalOpen(true)
  }, [setServiceModalOpen])

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

  const handleSelectServiceClick = useCallback(
    (service: HealthcareParty) => {
      const toSelect = service.id === selectedService?.id ? undefined : service
      setSelectedService(toSelect)
    },
    [selectedService],
  )

  return (
    <div className="ServiceSelector">
      <div className="ServiceSelectorHeader">
        <Typography.Title level={5} style={{ margin: 0 }}>
          Services
        </Typography.Title>
        <div className="ServiceSelectorButtons">
          <Tooltip title="Add a new service">
            <Button icon={<PlusOutlined />} onClick={addService} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
          </Tooltip>
          <Tooltip title="Delete the service">
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
          </Tooltip>
        </div>
      </div>

      <Divider style={{ margin: 0 }} />

      <div className="ServicesContent">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id
          return (
            <Button
              key={service.id}
              type={isSelected ? 'primary' : 'default'}
              onClick={() => {
                handleSelectServiceClick(service)
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
              {service.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

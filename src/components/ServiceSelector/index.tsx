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
}

export const ServiceSelector = ({ services, selectedService, setSelectedService }: ServiceSelectorProps): React.ReactElement => {
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

import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Divider, Spin, Typography } from 'antd'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'
import { SpinLoader } from '../common/SpinLoader'

interface ServiceSelectorProps {
  services: HealthcareParty[]
  isServicesLoading: boolean
  selectedService: HealthcareParty | undefined
  setSelectedService: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
}

export const ServiceSelector = ({ services, isServicesLoading, selectedService, setSelectedService }: ServiceSelectorProps): React.ReactElement => {
  const { t } = useTranslation()

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
          {t('content.services')}
        </Typography.Title>
      </div>

      <Divider style={{ margin: 0 }} />

      {isServicesLoading ? (
        <div className="selector-spin">
          <Spin />
        </div>
      ) : (
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
      )}
    </div>
  )
}

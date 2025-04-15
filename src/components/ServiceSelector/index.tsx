import { PlusOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Col, Divider, Row, Typography } from 'antd'
import React, { useCallback } from 'react'
import './index.css'

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

  return (
    <div className="service-selector" style={{ width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '16px' }}>
      <div className="service-selector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Services
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} size={'middle'} onClick={addService} style={{ padding: 0 }} />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <Row gutter={[8, 8]} wrap={true}>
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id
          return (
            <Col key={service.id} span={24}>
              <Button
                block
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
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

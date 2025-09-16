import { CalendarOutlined, StopOutlined } from '@ant-design/icons'
import { Card, Col, Row, Typography } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomModal } from '../../common/CustomModal'
import './index.css'
const { Title, Text } = Typography

interface AppointmentSelectorProps {
  isVisible: boolean
  onClose: () => void
  setCreateApptModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setTimeOffModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const AppointmentSelector = ({ isVisible, onClose, setCreateApptModalOpen, setTimeOffModalOpen }: AppointmentSelectorProps) => {
  const { t } = useTranslation()

  const handleStandardChoice = useCallback(() => {
    setCreateApptModalOpen(true)
    onClose()
  }, [setCreateApptModalOpen])

  const handletimeOffChoice = useCallback(() => {
    setTimeOffModalOpen(true)
    onClose()
  }, [setCreateApptModalOpen])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.appointment_booking_title')} blockAntModalBodyVerticalScroll noFooter width={800}>
      <div className="appointment-selector-root">
        <Text type="secondary" style={{ marginBottom: '24px', display: 'block' }}>
          {t('content.booking_type_prompt')}
        </Text>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card hoverable onClick={handleStandardChoice} style={{ textAlign: 'center', height: '100%' }}>
              <CalendarOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <Title level={5} style={{ marginTop: '12px' }}>
                {t('content.schedule_citizen_appointment_title')}
              </Title>
              <Text type="secondary"> {t('content.schedule_citizen_appointment_desc')}</Text>
            </Card>
          </Col>

          <Col xs={24} sm={12}>
            <Card hoverable onClick={handletimeOffChoice} style={{ textAlign: 'center', height: '100%' }}>
              <StopOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
              <Title level={5} style={{ marginTop: '12px' }}>
                {t('content.manage_staff_leave_title')}
              </Title>
              <Text type="secondary"> {t('content.manage_staff_leave_desc')}</Text>
            </Card>
          </Col>
        </Row>
      </div>
    </CustomModal>
  )
}

import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Calendar, CalendarProps, Col, Form, FormInstance, Row, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { AppointmentForm } from '../CreateEvent'
import './index.css'
import { CardinalAnonymousSdk } from '@icure/cardinal-sdk'
import { DB_ID } from '../../../../constants'
import { useGetAvailabilitiesQuery } from '../../../../core/api/anonymousApi'

const { Title, Paragraph } = Typography

const availableTimeSlots: string[] = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '16:00']

export const StepTimeSlotSelector: FC<{ form: FormInstance<AppointmentForm> }> = ({ form }) => {
  const { t } = useTranslation()
  const disabledDate = (current: Dayjs) => current && current < dayjs().startOf('day')
  const dateValue = Form.useWatch(['timeslot', 'date'], form)
  const timeValue = Form.useWatch(['timeslot', 'time'], form)

  const { data: availabilities, isLoading: availabilitiesLoading } = useGetAvailabilitiesQuery({})

  const onDateSelect = (date: Dayjs) => {
    form.setFieldsValue({ timeslot: { time: undefined, date: date } })
  }

  const renderCalendarHeader: CalendarProps<Dayjs>['headerRender'] = ({ value, onChange }) => {
    return (
      <div style={{ padding: '8px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              {value.format('MMMM YYYY')}
            </Title>
          </Col>
          <Col>
            <Space>
              <Button onClick={() => onChange(value.clone().subtract(1, 'month'))}>
                {<LeftOutlined />} {t('content.previous')}
              </Button>
              <Button onClick={() => onChange(value.clone().add(1, 'month'))}>
                {t('content.next')} {<RightOutlined />}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <Row gutter={[32, 32]}>
      <Col xs={24} lg={14}>
        <Title level={4}>{t('content.select_a_date')}</Title>
        <Form.Item name={['timeslot', 'date']} rules={[{ required: true }]}>
          <Calendar fullscreen={false} disabledDate={disabledDate} onSelect={onDateSelect} headerRender={renderCalendarHeader} />
        </Form.Item>
      </Col>
      <Col xs={24} lg={10}>
        <Title level={4}>{t('content.select_a_time')}</Title>
        <Paragraph type="secondary">
          {t('content.available_on')} {dateValue ? dateValue.format('MMMM D, YYYY') : '...'}
        </Paragraph>
        <Form.Item name={['timeslot', 'time']} rules={[{ required: true, message: t('content.select_time_prompt') }]}>
          <Space wrap size={[8, 16]}>
            {availableTimeSlots.map((time) => (
              <Button key={time} type={timeValue === time ? 'primary' : 'default'} onClick={() => form.setFieldsValue({ timeslot: { time: time } })} disabled={!dateValue} style={{ width: '90px' }}>
                {time}
              </Button>
            ))}
          </Space>
        </Form.Item>
      </Col>
    </Row>
  )
}

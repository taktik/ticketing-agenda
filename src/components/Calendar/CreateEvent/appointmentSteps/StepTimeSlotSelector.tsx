import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Calendar, CalendarProps, Col, Form, FormInstance, Row, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppointmentForm, findProcedureData } from '../CreateEvent'
import './index.css'
import { CardinalAnonymousSdk } from '@icure/cardinal-sdk'
import { DB_ID } from '../../../../constants'
import { useGetAvailabilitiesQuery, useLazyGetAvailabilitiesQuery } from '../../../../core/api/anonymousApi'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import FullCalendar from '@fullcalendar/react'
import { formatDayjsToYYYYMMDDHHmmssNumber } from '../../../common/helpers'

const { Title, Paragraph } = Typography

const availableTimeSlots: string[] = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '16:00']

interface StepTimeSlotSelectorProps {
  form: FormInstance<AppointmentForm>
  formValues: AppointmentForm
  selections: ProcedureSelection[]
}
export const StepTimeSlotSelector = ({ form, formValues, selections }: StepTimeSlotSelectorProps) => {
  const { t } = useTranslation()
  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const timeValue = Form.useWatch(['timeslot', 'time'], form)
  const { procedures } = formValues

  const disabledDate = (current: Dayjs) => {
    const today = dayjs().startOf('day')
    const endOfNextMonth = dayjs().add(1, 'month').endOf('month')
    return current < today || current > endOfNextMonth
  }
  const minDate = dayjs().startOf('day')
  const maxDate = dayjs().add(1, 'month').endOf('month')

  const [getAvailabilities, { isLoading: availabilitiesLoading }] = useLazyGetAvailabilitiesQuery()

  const availabilitiesPromises = procedures.map((item) => {
    const { masterProcedure, siteVariant, procedureVariant } = findProcedureData(selections, {
      procedureSelectionId: item.procedureSelectionId,
      site: item.site,
      quantity: item.quantity,
    })
    if (!masterProcedure || !siteVariant || !procedureVariant || !siteVariant.agendaId) throw Error('Unexpected error.')

    const resultAvailabilities = getAvailabilities({
      agendaId: siteVariant.agendaId,
      calendarItemTypeId: procedureVariant.procedureId,
      startDate: formatDayjsToYYYYMMDDHHmmssNumber(minDate),
      endDate: formatDayjsToYYYYMMDDHHmmssNumber(maxDate),
    })
    return resultAvailabilities
  })

  useEffect(() => console.log('availabilitiesPromises', availabilitiesPromises), [availabilitiesPromises])

  const renderCalendarHeader: CalendarProps<Dayjs>['headerRender'] = ({ value, onChange }) => {
    const today = dayjs()
    const endOfNextMonth = dayjs().add(1, 'month')
    const isPrevDisabled = useMemo(() => (value ? value.isSame(today, 'month') : true), [value, today])
    const isNextDisabled = useMemo(() => (value ? value.isSame(endOfNextMonth, 'month') : true), [value, endOfNextMonth])

    const handleMonthChange = (proposedDate: Dayjs) => {
      if (proposedDate.isBefore(minDate)) {
        onChange(minDate)
      } else if (proposedDate.isAfter(maxDate)) {
        onChange(maxDate)
      } else {
        onChange(proposedDate)
      }
    }

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
              <Button onClick={() => handleMonthChange(value.clone().subtract(1, 'month'))} disabled={isPrevDisabled}>
                {<LeftOutlined />} {t('content.previous')}
              </Button>
              <Button onClick={() => handleMonthChange(value.clone().add(1, 'month'))} disabled={isNextDisabled}>
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
          <Calendar fullscreen={false} disabledDate={disabledDate} headerRender={renderCalendarHeader} />
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

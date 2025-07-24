import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Calendar, CalendarProps, Col, Form, FormInstance, Row, Space, Typography, notification } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLazyGetAvailabilitiesQuery } from '../../../../core/api/anonymousApi'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import { formatDayjsToYYYYMMDDHHmmssNumber } from '../../../common/helpers'
import { AppointmentForm, findProcedureData, FormProcedure } from '../CreateEvent'
import './index.css'

const { Title, Paragraph } = Typography

const availableTimeSlots: string[] = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '16:00']

interface StepTimeSlotSelectorProps {
  form: FormInstance<AppointmentForm>
  selections: ProcedureSelection[]
  procedures: FormProcedure[]
}
export const StepTimeSlotSelector = ({ form, selections, procedures }: StepTimeSlotSelectorProps) => {
  const { t } = useTranslation()
  const [availabilitiesData, setAvailabilitiesData] = useState<number[]>([])
  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const timeValue = Form.useWatch(['timeslot', 'time'], form)

  const minDate = useMemo(() => dayjs().startOf('day'), [])
  const maxDate = useMemo(() => dayjs().add(1, 'month').endOf('month'), [])
  const disabledDate = (current: Dayjs) => {
    return current < minDate || current > maxDate
  }

  const [getAvailabilities, { isLoading: availabilitiesLoading }] = useLazyGetAvailabilitiesQuery()

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

  useEffect(() => {
    console.log('test start')
    if (!procedures || procedures.length === 0) {
      console.log('procedures', procedures)
      return
    }
    console.log('test middle')

    const fetchAllAvailabilities = async () => {
      console.log('fetch avail start')
      try {
        const promises = procedures.map((item) => {
          const { masterProcedure, siteVariant, procedureVariant } = findProcedureData(selections, {
            procedureSelectionId: item.procedureSelectionId,
            site: item.site,
            quantity: item.quantity,
          })

          if (!masterProcedure || !siteVariant || !procedureVariant || !siteVariant.agendaId) {
            throw Error('Missing data for selected procedures.')
          }

          return getAvailabilities({
            agendaId: siteVariant.agendaId,
            calendarItemTypeId: procedureVariant.procedureId,
            startDate: formatDayjsToYYYYMMDDHHmmssNumber(minDate),
            endDate: formatDayjsToYYYYMMDDHHmmssNumber(maxDate),
          }).unwrap()
        })

        console.log('promises', promises)

        const results = await Promise.all(promises)
        console.log('fetch avail results', results)

        const allAvailabilities = results.flatMap((result) => {
          return result || []
        })

        setAvailabilitiesData(allAvailabilities)
        console.log('fetch avail end')
      } catch (error: unknown) {
        openNotification('error', t('validation.unexpected_error'), '')
      }
    }
    console.log('test end')
    fetchAllAvailabilities()
  }, [procedures, selections, minDate, maxDate, getAvailabilities])

  useEffect(() => console.log('availabilitiesData', availabilitiesData), [availabilitiesData])

  const cellRender = (current: Dayjs, info: { originNode: React.ReactElement }) => {
    const formattedDate = current.format('YYYY-MM-DD')
    const highlightedDates = ['2025-07-28', '2025-07-30', '2025-08-05']
    const defaultCellProps = info.originNode.props

    if (highlightedDates.includes(formattedDate)) {
      return (
        <div
          className={defaultCellProps.className}
          style={{
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {defaultCellProps.children}
        </div>
      )
    } else {
      return info.originNode
    }
  }

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
      {notificationContextHolder}
      <Col xs={24} lg={14}>
        <Title level={4}>{t('content.select_a_date')}</Title>
        <Form.Item name={['timeslot', 'date']} rules={[{ required: true }]}>
          <Calendar fullscreen={false} disabledDate={disabledDate} headerRender={renderCalendarHeader} fullCellRender={cellRender} />
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

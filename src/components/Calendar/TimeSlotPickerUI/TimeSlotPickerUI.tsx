import { Button, Calendar, CalendarProps, Col, Divider, Empty, Row, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomCellRender } from '../CreateEvent/CustomCellRender'
import { CustomCalendarHeader } from '../CreateEvent/CustomCalendarHeader'
import { SpinLoader } from '../../common/SpinLoader'

const { Title, Paragraph } = Typography

interface TimeSlotPickerUIProps {
  availabilities: dayjs.Dayjs[]
  isLoading: boolean
  currentMonth: dayjs.Dayjs
  selectedDate?: dayjs.Dayjs
  selectedTime?: dayjs.Dayjs
  onMonthChange: (newMonth: dayjs.Dayjs) => void
  onDateSelect: (date: dayjs.Dayjs) => void
  onTimeSelect: (time: dayjs.Dayjs) => void
}

export const TimeSlotPickerUI = (props: TimeSlotPickerUIProps) => {
  const { availabilities, isLoading, currentMonth, selectedDate, selectedTime, onMonthChange, onDateSelect, onTimeSelect } = props

  const { t } = useTranslation()
  const [selectedHour, setSelectedHour] = useState<dayjs.Dayjs | undefined>(undefined)
  const minDate = useMemo(() => dayjs(), [])

  const availableDatesSet = useMemo(() => {
    const dates = new Set<string>()
    availabilities.forEach((slot) => {
      dates.add(slot.format('YYYY-MM-DD'))
    })
    return dates
  }, [availabilities])

  const disabledDate = useCallback(
    (current: Dayjs) => {
      return current < minDate || !availableDatesSet.has(current.format('YYYY-MM-DD'))
    },
    [minDate, availableDatesSet],
  )

  const slotsForSelectedDay = useMemo(() => {
    return availabilities.filter((slot) => slot.isSame(selectedDate, 'day'))
  }, [selectedDate, availabilities])

  const slotsByHour = useMemo(() => {
    return slotsForSelectedDay.reduce(
      (acc, slot) => {
        const hour = slot.format('HH')
        if (!acc[hour]) {
          acc[hour] = []
        }
        acc[hour].push(slot)
        return acc
      },
      {} as Record<string, dayjs.Dayjs[]>,
    )
  }, [slotsForSelectedDay])

  const availableHours = useMemo(() => {
    return Object.keys(slotsByHour)
      .sort()
      .map((hour) => {
        return slotsByHour[hour][0].minute(0).second(0)
      })
  }, [slotsByHour])

  // Reset internal hour state when date changes
  useEffect(() => {
    setSelectedHour(undefined)
  }, [selectedDate])

  const handleHourSelect = useCallback(
    (hour: dayjs.Dayjs) => {
      setSelectedHour(hour)
    },
    [setSelectedHour],
  )

  const cellRender = useCallback(
    (current: Dayjs, info: { originNode: React.ReactElement }) => {
      return <CustomCellRender current={current} info={info} availabilities={availabilities} />
    },
    [availabilities],
  )

  const renderCalendarHeader: CalendarProps<Dayjs>['headerRender'] = useCallback(
    ({ value, onChange }: { value: dayjs.Dayjs; onChange: (date: Dayjs) => void }) => {
      return <CustomCalendarHeader value={value} onChange={onChange} currentMonth={currentMonth} minDate={minDate} setCurrentMonth={onMonthChange} />
    },
    [currentMonth, minDate, onMonthChange],
  )

  return (
    <Row gutter={[32, 32]}>
      <Col xs={24} lg={12}>
        <Title level={4}>{t('content.select_a_date')}</Title>
        <Calendar fullscreen={false} disabledDate={disabledDate} headerRender={renderCalendarHeader} fullCellRender={cellRender} value={selectedDate} onSelect={onDateSelect} />
      </Col>
      <Col xs={24} lg={12}>
        <Title level={4}>{t('content.select_a_time')}</Title>
        <Paragraph type="secondary">
          {t('content.available_on')} {selectedDate ? selectedDate.format('MMMM D, YYYY') : '...'}
        </Paragraph>

        <Divider />
        <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', padding: '0 16px 0 4px' }}>
          {isLoading ? (
            <SpinLoader />
          ) : availableHours.length > 0 ? (
            <>
              <div>
                <Title level={5} style={{ marginBottom: 12 }}>
                  {t('content.choose_time')}
                </Title>
                <Space size={[8, 12]} wrap>
                  {availableHours.map((hour) => (
                    <Button key={hour.format('HH')} type={selectedHour?.isSame(hour, 'hour') ? 'primary' : 'default'} onClick={() => handleHourSelect(hour)}>
                      {hour.format('HH')}:00
                    </Button>
                  ))}
                </Space>
              </div>

              {selectedHour && (
                <div style={{ marginTop: 24 }}>
                  <Title level={5} style={{ marginBottom: 12 }}>
                    {t('content.choose_slot')}
                  </Title>
                  <Space size={[8, 12]} wrap>
                    {slotsByHour[selectedHour.format('HH')].map((time) => (
                      <Button key={time.format('HH:mm')} type={selectedTime?.isSame(time) ? 'primary' : 'default'} onClick={() => onTimeSelect(time)}>
                        {time.format('HH:mm')}
                      </Button>
                    ))}
                  </Space>
                </div>
              )}
            </>
          ) : (
            <>
              <Empty description={t('content.no_slots_available')} />
            </>
          )}
        </div>
      </Col>
    </Row>
  )
}

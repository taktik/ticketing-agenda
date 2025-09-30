import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Calendar, CalendarProps, Col, Divider, Empty, Form, FormInstance, notification, Row, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLazyGetAvailabilitiesQuery } from '../../../../core/api/anonymousApi'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import { dayjsToYYYYMMDDHHmmss } from '../../../common/helpers'
import { SpinLoader } from '../../../common/SpinLoader'
import { AppointmentForm, findProcedureData, FormProcedure } from '../CreateEvent'
import './index.css'

const { Title, Paragraph } = Typography

interface ProcessedAvailabilities {
  availabilityList: dayjs.Dayjs[]
  procedureDuration: number
}

interface StepTimeSlotSelectorProps {
  form: FormInstance<AppointmentForm>
  selections: ProcedureSelection[]
  formProcedure: FormProcedure[]
}

export const StepTimeSlotSelector = ({ form, selections, formProcedure }: StepTimeSlotSelectorProps) => {
  const { t } = useTranslation()
  const [availabilities, setAvailabilities] = useState<dayjs.Dayjs[]>([])
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectedHour, setSelectedHour] = useState<dayjs.Dayjs | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<dayjs.Dayjs | undefined>(undefined)
  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const minDate = useMemo(() => dayjs(), [])

  const availableDatesSet = useMemo(() => {
    const dates = new Set()
    availabilities.forEach((slot) => {
      dates.add(slot.format('YYYY-MM-DD'))
    })
    return dates
  }, [availabilities])

  const disabledDate = (current: Dayjs) => {
    return current < minDate || !availableDatesSet.has(current.format('YYYY-MM-DD'))
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

  const findConsecutiveSlots = (processedAvailabilities: ProcessedAvailabilities[]): dayjs.Dayjs[] => {
    // Si aucune disponibilité n'est fournie, on retourne un tableau vide.
    if (!processedAvailabilities || processedAvailabilities.length === 0) {
      return []
    }

    // --- Étape 1 : Pour chaque procédure, "décomposer" ses disponibilités en blocs de 5 minutes ---
    const allProcedureIntervals = processedAvailabilities.map((proc) => {
      const duration = proc.procedureDuration
      const slotsNeeded = duration / 5 // En supposant que chaque créneau dure 5 minutes
      const intervals = new Set<number>()

      proc.availabilityList.forEach((startSlot) => {
        for (let i = 0; i < slotsNeeded; i++) {
          intervals.add(startSlot.add(i * 5, 'minutes').valueOf())
        }
      })
      return intervals
    })

    // --- Étape 2 : Trouver l'intersection de tous les blocs de 5 minutes disponibles ---
    if (allProcedureIntervals.length === 0) return []

    let commonIntervals = new Set(allProcedureIntervals[0])
    for (let i = 1; i < allProcedureIntervals.length; i++) {
      commonIntervals = new Set(Array.from(commonIntervals).filter((timestamp) => allProcedureIntervals[i].has(timestamp)))
    }

    // --- Étape 3 : Calculer la durée totale et le nombre de créneaux nécessaires ---
    const totalDuration = processedAvailabilities.reduce((sum, proc) => sum + proc.procedureDuration, 0)
    const requiredConsecutiveSlots = totalDuration / 5

    if (requiredConsecutiveSlots <= 0) return []

    // --- Étape 4 : Chercher des séquences continues dans les créneaux communs ---
    const validStartSlots: dayjs.Dayjs[] = []
    const sortedCommonIntervals = Array.from(commonIntervals).sort()

    for (const timestamp of sortedCommonIntervals) {
      let isSequenceValid = true
      for (let i = 1; i < requiredConsecutiveSlots; i++) {
        const nextTimestamp = dayjs(timestamp)
          .add(i * 5, 'minutes')
          .valueOf()
        if (!commonIntervals.has(nextTimestamp)) {
          isSequenceValid = false
          break
        }
      }
      if (isSequenceValid) {
        validStartSlots.push(dayjs(timestamp))
      }
    }

    return validStartSlots
  }

  useEffect(() => {
    if (!formProcedure || formProcedure.length === 0) {
      return
    }

    const fetchAllAvailabilities = async () => {
      try {
        const promises = formProcedure.map(async (item) => {
          const { masterProcedure, siteVariant, procedureVariant } = findProcedureData(selections, {
            procedureSelectionId: item.procedureSelectionId,
            site: item.site,
            quantity: item.quantity,
          })

          if (!masterProcedure || !siteVariant || !procedureVariant || !siteVariant.agendaId) {
            throw Error()
          }

          const startDate = currentMonth.startOf('month')
          const endDate = currentMonth.endOf('month')

          const availabilities = await getAvailabilities(
            {
              agendaId: siteVariant.agendaId,
              calendarItemTypeId: procedureVariant.procedureId,
              startDate: dayjsToYYYYMMDDHHmmss(startDate),
              endDate: dayjsToYYYYMMDDHHmmss(endDate),
            },
            true,
          ).unwrap()

          return {
            procedureDuration: procedureVariant.duration,
            availabilityList: availabilities,
          } as ProcessedAvailabilities
        })

        const results = await Promise.all(promises)

        const finalList = results.length === 1 ? results[0].availabilityList : findConsecutiveSlots(results)

        setAvailabilities(finalList)
      } catch (error: unknown) {
        openNotification('error', t('validation.unexpected_error'), '')
      }
    }
    fetchAllAvailabilities()
  }, [formProcedure, selections, getAvailabilities, currentMonth])

  useEffect(() => {
    const firstAvailable = availabilities.find((d) => !disabledDate(d))
    if (firstAvailable) {
      form.setFieldsValue({
        timeslot: { date: firstAvailable },
      })
    }
  }, [availabilities, form])

  const slotsForSelectedDay = useMemo(() => {
    return availabilities.filter((slot) => slot.isSame(dateValue, 'day'))
  }, [dateValue, availabilities])

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

  useEffect(() => {
    setSelectedHour(undefined)
    setSelectedTime(undefined)
    form.resetFields([['timeslot', 'time']])
  }, [dateValue])

  const handleHourSelect = (hour: dayjs.Dayjs) => {
    setSelectedHour(hour)
    setSelectedTime(undefined)
    form.resetFields([['timeslot', 'time']])
  }

  const cellRender = (current: Dayjs, info: { originNode: React.ReactElement }) => {
    const formattedDate = current.format('YYYY-MM-DD')
    const highlightedDates = useMemo(() => availabilities.map((d) => d.format('YYYY-MM-DD')), [availabilities])
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
    const isPrevDisabled = useMemo(() => currentMonth.isSame(dayjs(), 'month'), [currentMonth])

    const handleMonthChange = useCallback(
      (proposedDate: Dayjs) => {
        if (proposedDate.isBefore(minDate)) {
          onChange(minDate)
          setCurrentMonth(minDate)
        } else {
          onChange(proposedDate)
          setCurrentMonth(proposedDate)
        }
      },
      [minDate, onChange, setCurrentMonth],
    )

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
              <Button onClick={() => handleMonthChange(value.clone().add(1, 'month'))}>
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
      <Col xs={24} lg={12}>
        <Title level={4}>{t('content.select_a_date')}</Title>
        <Form.Item name={['timeslot', 'date']} rules={[{ required: true }]}>
          <Calendar fullscreen={false} disabledDate={disabledDate} headerRender={renderCalendarHeader} fullCellRender={cellRender} />
        </Form.Item>
      </Col>
      <Col xs={24} lg={12}>
        <Title level={4}>{t('content.select_a_time')}</Title>
        <Paragraph type="secondary">
          {t('content.available_on')} {dateValue ? dateValue.format('MMMM D, YYYY') : '...'}
        </Paragraph>

        <Divider />
        <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', padding: '0 16px 0 4px' }}>
          {availabilitiesLoading ? (
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

              <Form.Item name={['timeslot', 'time']} rules={[{ required: true, message: t('content.select_time_prompt') }]} noStyle>
                {selectedHour && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      {t('content.choose_slot')}
                    </Title>
                    <Space size={[8, 12]} wrap>
                      {slotsByHour[selectedHour.format('HH')].map((time) => (
                        <Button
                          key={time.format('HH:mm')}
                          type={selectedTime?.isSame(time) ? 'primary' : 'default'}
                          onClick={() => {
                            setSelectedTime(time)
                            form.setFieldsValue({ timeslot: { time: time } })
                          }}
                        >
                          {time.format('HH:mm')}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}
              </Form.Item>
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

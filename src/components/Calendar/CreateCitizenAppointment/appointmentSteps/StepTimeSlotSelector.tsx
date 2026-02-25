import { Form } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'
import { useNotificationHelper } from '../../../../core/hooks/useNotificationHelper'
import { TimeSlotPickerUI } from '../../TimeSlotPickerUI/TimeSlotPickerUI'

export const StepTimeSlotSelector = () => {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const [currentMonth, setCurrentMonth] = useState(dayjs())

  const { availabilities, isAvailabilitiesLoading, fetchAvailabilitiesForMonth, setTimeSlot } = useCitizenReservation()

  const { openNotification, notificationContextHolder } = useNotificationHelper()

  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const timeValue: Dayjs = Form.useWatch(['timeslot', 'time'], form)

  useEffect(() => {
    fetchAvailabilitiesForMonth(currentMonth).catch(() => {
      openNotification('error', t('validation.unexpected_error'))
    })
  }, [currentMonth, fetchAvailabilitiesForMonth, openNotification, t])

  useEffect(() => {
    if (availabilities.length > 0 && !dateValue) {
      const firstAvailable = availabilities.find((d) => d >= dayjs().startOf('day'))
      if (firstAvailable) {
        form.setFieldsValue({
          timeslot: { date: firstAvailable },
        })
      }
    }
  }, [availabilities, form, dateValue])

  const handleDateSelect = useCallback(
    (date: Dayjs) => {
      form.setFieldsValue({ timeslot: { date: date, time: undefined } })
      form.validateFields([['timeslot', 'time']])
      setTimeSlot(undefined)
    },
    [form, setTimeSlot],
  )

  const handleTimeSelect = useCallback(
    (time: Dayjs | undefined) => {
      const date = form.getFieldValue(['timeslot', 'date'])
      form.setFieldsValue({ timeslot: { time: time } })

      if (time) {
        form.validateFields([['timeslot', 'time']])
      }

      if (time && date) {
        const combined = time.year(date.year()).month(date.month()).date(date.date())
        setTimeSlot({ date, time: combined })
      } else {
        setTimeSlot(undefined)
      }
    },
    [form, setTimeSlot],
  )

  return (
    <>
      {notificationContextHolder}

      <Form.Item name={['timeslot', 'date']} rules={[{ required: true }]} noStyle />
      <Form.Item name={['timeslot', 'time']} rules={[{ required: true, message: t('content.select_time_prompt') }]} noStyle />

      <TimeSlotPickerUI
        availabilities={availabilities}
        isLoading={isAvailabilitiesLoading}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        selectedDate={dateValue}
        selectedTime={timeValue}
        onDateSelect={handleDateSelect}
        onTimeSelect={handleTimeSelect}
      />
    </>
  )
}

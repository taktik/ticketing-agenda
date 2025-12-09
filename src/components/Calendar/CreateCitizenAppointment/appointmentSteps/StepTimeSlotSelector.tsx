import { Form, notification } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCitizenReservation } from '../../../../core/contexts/CitizenReservationContext'
import { TimeSlotPickerUI } from '../../TimeSlotPickerUI/TimeSlotPickerUI'

export const StepTimeSlotSelector = () => {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const [currentMonth, setCurrentMonth] = useState(dayjs())

  const {
    availabilities,
    isAvailabilitiesLoading,
    fetchAvailabilitiesForMonth,
    setTimeSlot,
    // We intentionally DO NOT use 'timeSlot' here to avoid circular logic
  } = useCitizenReservation()

  const [api, notificationContextHolder] = notification.useNotification()

  // Watch Form State
  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const timeValue: Dayjs = Form.useWatch(['timeslot', 'time'], form)

  // 1. Fetch Data when Month changes
  useEffect(() => {
    fetchAvailabilitiesForMonth(currentMonth).catch(() => {
      api.error({ message: t('validation.unexpected_error') })
    })
  }, [currentMonth, fetchAvailabilitiesForMonth, api, t])

  // 2. Auto-select first available date ONLY if form is empty
  // FIX: Removed 'timeSlot' dependency. We rely on 'dateValue' (Form State) instead.
  useEffect(() => {
    // Only auto-select if we have data AND the user hasn't picked a date yet
    if (availabilities.length > 0 && !dateValue) {
      const firstAvailable = availabilities.find((d) => d >= dayjs().startOf('day'))

      // Only set if we found a valid future date
      if (firstAvailable) {
        form.setFieldsValue({
          timeslot: { date: firstAvailable },
        })
      }
    }
  }, [availabilities, form, dateValue])

  // 3. Handlers
  const handleDateSelect = useCallback(
    (date: Dayjs) => {
      // Update Form
      form.setFieldsValue({ timeslot: { date: date, time: undefined } })
      form.validateFields([['timeslot', 'time']])

      // Clear Context (This used to trigger the bug, now it's safe)
      setTimeSlot(undefined)
    },
    [form, setTimeSlot],
  )

  const handleTimeSelect = useCallback(
    (time: Dayjs | undefined) => {
      const date = form.getFieldValue(['timeslot', 'date'])

      form.setFieldsValue({ timeslot: { time: time } })

      // Only validate if a time is actually selected
      if (time) {
        form.validateFields([['timeslot', 'time']])
      }

      if (time && date) {
        // Create a combined object to ensure specific time precision
        // (Though usually 'time' from availability list already has the correct date)
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

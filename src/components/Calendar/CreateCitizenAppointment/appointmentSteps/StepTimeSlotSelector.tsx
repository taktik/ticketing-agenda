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

  const { availabilities, isAvailabilitiesLoading, fetchAvailabilitiesForMonth, setTimeSlot, timeSlot } = useCitizenReservation()

  const [api, notificationContextHolder] = notification.useNotification()

  // 1. Fetch Data when Month changes
  useEffect(() => {
    fetchAvailabilitiesForMonth(currentMonth).catch(() => {
      api.error({ message: t('validation.unexpected_error') })
    })
  }, [currentMonth, fetchAvailabilitiesForMonth, api, t])

  // 2. Auto-select first available date if nothing selected
  useEffect(() => {
    if (availabilities.length > 0 && !timeSlot?.date) {
      const firstAvailable = availabilities.find((d) => d >= dayjs().startOf('day'))
      if (firstAvailable) {
        form.setFieldsValue({
          timeslot: { date: firstAvailable },
        })
      }
    }
  }, [availabilities, form, timeSlot])

  // 3. Sync Form <-> UI
  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const timeValue: Dayjs = Form.useWatch(['timeslot', 'time'], form)

  const handleDateSelect = useCallback(
    (date: Dayjs) => {
      // Update Form (for validation)
      form.setFieldsValue({ timeslot: { date: date, time: undefined } })
      form.validateFields([['timeslot', 'time']])

      // Update Context (Optional here, but cleaner if done on Next,
      // though setting date in context might be useful if other steps depend on it)
    },
    [form],
  )

  const handleTimeSelect = useCallback(
    (time: Dayjs) => {
      const date = form.getFieldValue(['timeslot', 'date'])

      // Update Form
      form.setFieldsValue({ timeslot: { time: time } })
      form.validateFields([['timeslot', 'time']])

      // Update Context immediately so "Next" button enables
      setTimeSlot({ date, time })
    },
    [form, setTimeSlot],
  )

  return (
    <>
      {notificationContextHolder}

      {/* Hidden Form Items for AntD Validation */}
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

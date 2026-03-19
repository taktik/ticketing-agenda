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

  // form.getFieldValue is synchronous and always returns stored values on mount.
  // Form.useWatch may return undefined on the first render of a remounted component.
  const storedDate = form.getFieldValue(['timeslot', 'date']) as Dayjs | undefined
  const storedTime = form.getFieldValue(['timeslot', 'time']) as Dayjs | undefined

  const dateValue = Form.useWatch(['timeslot', 'date'], form) as Dayjs | undefined
  const timeValue = Form.useWatch(['timeslot', 'time'], form) as Dayjs | undefined

  const effectiveDate = dateValue ?? storedDate
  const effectiveTime = timeValue ?? storedTime

  const [currentMonth, setCurrentMonth] = useState(effectiveDate ? dayjs(effectiveDate) : dayjs())

  const { availabilities, isAvailabilitiesLoading, fetchAvailabilitiesForMonth, setTimeSlot } = useCitizenReservation()

  const { openNotification, notificationContextHolder } = useNotificationHelper()

  useEffect(() => {
    fetchAvailabilitiesForMonth(currentMonth).catch(() => {
      openNotification('error', t('validation.unexpected_error'))
    })
  }, [currentMonth, fetchAvailabilitiesForMonth, openNotification, t])

  useEffect(() => {
    if (availabilities.length > 0 && !effectiveDate) {
      const firstAvailable = availabilities.find((d) => d >= dayjs().startOf('day'))
      if (firstAvailable) {
        form.setFieldsValue({
          timeslot: { date: firstAvailable },
        })
      }
    }
  }, [availabilities, form, effectiveDate])

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
        selectedDate={effectiveDate}
        selectedTime={effectiveTime}
        onDateSelect={handleDateSelect}
        onTimeSelect={handleTimeSelect}
      />
    </>
  )
}

import { Form, FormInstance, notification } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TimeSlotPickerUI } from '../../TimeSlotPickerUI/TimeSlotPickerUI'
import { useLazyGetAvailabilitiesQuery } from '../../../../core/api/anonymousApi'
import { AppointmentForm, findProcedureData, FormProcedure } from '../CreateCitizenAppointment'
import { dayjsToYYYYMMDDHHmmss } from '../../../common/helpers'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'

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

  const [getAvailabilities, { isLoading: availabilitiesLoading }] = useLazyGetAvailabilitiesQuery()
  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = useCallback(
    (type: 'error', message: string, description: string) => {
      api.open({
        type,
        message,
        description,
        duration: 0,
      })
      setTimeout(api.destroy, 2500)
    },
    [api],
  )

  const findConsecutiveSlots = useCallback((processedAvailabilities: ProcessedAvailabilities[]): dayjs.Dayjs[] => {
    if (!processedAvailabilities || processedAvailabilities.length === 0) {
      return []
    }

    // --- Étape 1 : Pour chaque procédure, "décomposer" ses disponibilités en blocs de 5 minutes ---
    const allProcedureIntervals = processedAvailabilities.map((proc) => {
      const duration = proc.procedureDuration
      const slotsNeeded = duration / 5 // blocs de 5 minutes
      const intervals = new Set<number>()

      proc.availabilityList.forEach((startSlot) => {
        for (let i = 0; i < slotsNeeded; i++) {
          intervals.add(startSlot.add(i * 5, 'minutes').valueOf())
        }
      })
      return intervals
    })

    // --- Étape 2 : Trouver l'intersection de tous les blocs disponibles ---
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
  }, [])

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
  }, [formProcedure, selections, getAvailabilities, currentMonth, openNotification, t, findConsecutiveSlots])

  const dateValue: Dayjs = Form.useWatch(['timeslot', 'date'], form)
  const timeValue: Dayjs = Form.useWatch(['timeslot', 'time'], form)

  useEffect(() => {
    if (!dateValue) {
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
    },
    [form],
  )

  const handleTimeSelect = useCallback(
    (time: Dayjs) => {
      form.setFieldsValue({ timeslot: { time: time } })
      form.validateFields([['timeslot', 'time']])
    },
    [form],
  )

  return (
    <>
      {notificationContextHolder}
      {/* Hidden Form.Items to register fields with the form */}
      <Form.Item name={['timeslot', 'date']} rules={[{ required: true }]} noStyle />
      <Form.Item name={['timeslot', 'time']} rules={[{ required: true, message: t('content.select_time_prompt') }]} noStyle />

      <TimeSlotPickerUI
        availabilities={availabilities}
        isLoading={availabilitiesLoading}
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

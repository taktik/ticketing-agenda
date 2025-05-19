import { Agenda, TimeTable, TimeTableHour, TimeTableItem } from '@icure/cardinal-sdk'
import React, { ReactElement, useEffect, useMemo, useState } from 'react'
import { CustomModal } from '../../common/CustomModal'
import './index.css'
import { Button, DatePicker, Form, Input, Table, Space, Empty, notification, message, Select, Radio, Tag, InputNumber, TimePicker, Checkbox, Typography } from 'antd'
import { CloseOutlined, ExclamationCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addDays, addMonths, format, Locale, setDay, setMonth, startOfDay } from 'date-fns'
import { enUS, fr, de, nl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateTimeTableMutation, useGetTimeTableQuery } from '../../../core/api/timeTableApi'
import { v4 } from 'uuid'
import { useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'
import { dayjsToMinutes, formatMinutesToHHMM, minutesToDayjs } from '../../common/helpers'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { createPortal } from 'react-dom'
import { Frequency, Options, RRule, RRuleSet, rrulestr, Weekday } from 'rrule'
import { Language } from 'rrule/dist/esm/nlp/i18n'
import { TOKENS } from '../../../constants'

const localeMap: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  nl: nl,
}

interface UIRrulePartsForForm {
  _freq: Frequency // RRule.WEEKLY, RRule.DAILY etc. are numbers (0-4)
  _interval: number
  _byday: string[] // The days (Monday, ...)
}

type TableHours = {
  startHour: dayjs.Dayjs | null
  endHour: dayjs.Dayjs | null
}

interface FormValues {
  name: string
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  calendarItemTypeId: string
  unavailable: boolean
  numberOfSlots: number
  hours: TableHours[]
  rruleStartDate: dayjs.Dayjs
  rrule: string
  _freq: Frequency
  _interval: number
  _byday: string[]
}

interface ModalRulesProps {
  isVisible: boolean
  onClose: () => void
  timeTableId: string | undefined
  agenda: Agenda | undefined
}

export const ModalRules = ({ isVisible, onClose, timeTableId, agenda }: ModalRulesProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])
  const [showDeleteTimeTableItemModal, setShowDeleteTimeTableItemModal] = useState<boolean>(false)
  const [timeTableItemToBeDeleted, setTimeTableItemToBeDeleted] = useState<TimeTableItem | undefined>(undefined)
  const [slotsData, setSlotsData] = useState<{ [placeId: string]: number }>({})
  const [timeTableItems, setTimeTableItems] = useState<TimeTableItem[]>([])
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: TimeTableItem) => record.placeId === editingKey, [editingKey])
  const filteredDataSource = useMemo(() => {
    const seen = new Set<string>()

    return timeTableItems.filter((item) => {
      const key = item.calendarItemTypeId

      if (key == null) return true

      const keyStr = String(key)
      if (seen.has(keyStr)) return false

      seen.add(keyStr)
      return true
    })
  }, [timeTableItems])

  const RRuleWeekdays = [
    { label: t('rrule.monday_upper'), short: 'Mon', value: 'MO', rruleConst: RRule.MO },
    { label: t('rrule.tuesday_upper'), short: 'Tue', value: 'TU', rruleConst: RRule.TU },
    { label: t('rrule.wednesday_upper'), short: 'Wed', value: 'WE', rruleConst: RRule.WE },
    { label: t('rrule.thursday_upper'), short: 'Thu', value: 'TH', rruleConst: RRule.TH },
    { label: t('rrule.friday_upper'), short: 'Fri', value: 'FR', rruleConst: RRule.FR },
    { label: t('rrule.saturday_upper'), short: 'Sat', value: 'SA', rruleConst: RRule.SA },
    { label: t('rrule.sunday_upper'), short: 'Sun', value: 'SU', rruleConst: RRule.SU },
  ]

  const { data: timeTable } = useGetTimeTableQuery(timeTableId ?? '')

  const { data: procedures } = useGetCalendarItemTypesQuery({ skip: !timeTable || !agenda, agendaId: agenda?.id ?? '' })

  const [createUpdateTimeTable, { isError: isCreateUpdateTimeTableError, isSuccess: isCreateUpdateTimeTableSuccess, isLoading: isCreateUpdateTimeTableLoading }] = useCreateUpdateTimeTableMutation()

  const [form] = Form.useForm<FormValues>()
  const nameValue = Form.useWatch('name', form)
  const initialName = useMemo(() => timeTable?.name || '', [timeTable])

  useEffect(() => {
    if (timeTable) {
      form.setFieldsValue({
        name: timeTable.name,
        start: timeTable.startTime ? dayjs(timeTable.startTime) : undefined,
        end: timeTable.endTime ? dayjs(timeTable.endTime) : undefined,
      })
      setTimeTableItems(timeTable.items)
    } else {
      setEditingKey('')
      form.resetFields()
    }
  }, [timeTable, form])

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

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  const handleNameCancel = () => {
    form.resetFields(['unavailable', 'numberOfSlots', 'hours', 'rruleStartDate', 'rrule', '_byday', '_freq', '_interval', 'calendarItemTypeId'])
    form.setFieldsValue({ name: initialName })
  }

  const addRule = () => {
    try {
      if (!timeTable) throw new Error('No schedule selected')
      const newRule = new TimeTableItem({
        rruleStartDate: timeTable.startTime,
        placeId: v4(),
        unavailable: true,
        hours: [new TimeTableHour({ startHour: undefined, endHour: undefined })],
      })
      setTimeTableItems((prev) => [...prev, newRule])
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const watchedFreq = Form.useWatch('_freq', form)
  const watchedInterval = Form.useWatch('_interval', form)
  const watchedByDay = Form.useWatch('_byday', form)

  useEffect(() => {
    // This check ensures we only try to build an RRULE if a frequency is actually selected.
    // It also prevents running when the form is first initializing and these values might be transient.
    if (watchedFreq !== undefined && form.isFieldsTouched(['_freq', '_interval', '_byday'])) {
      const rruleOptions: Partial<Options> = {
        freq: watchedFreq as Frequency, // Cast because Select value is number
        interval: watchedInterval || 1,
        // dtstart is often important for rrule.js, especially for BYDAY in MONTHLY.
        // For simple WEEKLY rules, its exact date might be less critical.
        // Use a consistent or relevant dtstart. For now, using today.
        // You might need to pass a real start date from your event/schedule if relevant.
        dtstart: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today, or a relevant date
      }

      if (watchedFreq === RRule.WEEKLY && watchedByDay && watchedByDay.length > 0) {
        rruleOptions.byweekday = watchedByDay.map((dayValue: string) => RRuleWeekdays.find((d) => d.value === dayValue)?.rruleConst).filter(Boolean) as Weekday[] // Filter out undefined and cast
      }
      // Handle other FREQ options and their specific BY... rules if you add them

      try {
        if (rruleOptions.freq === undefined) {
          // Don't generate if freq is not set
          form.setFieldsValue({ rrule: undefined })
          return
        }
        const rule = new RRule(rruleOptions)
        form.setFieldsValue({ rrule: rule.toString() })
      } catch (e) {
        console.error('Error generating RRULE string:', e)
        form.setFieldsValue({ rrule: undefined }) // Set to undefined or handle error state
      }
    }
  }, [watchedFreq, watchedInterval, watchedByDay, form])

  const getCurrentRruleLanguageOptions = (): Language => {
    const rruleWeekdaysOrdered = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU]
    const dayNames = rruleWeekdaysOrdered.map((rruleWd) => {
      const dayIndexForDateFns = (rruleWd.weekday + 1) % 7
      return format(setDay(new Date(), dayIndexForDateFns), 'EEEE', { locale: dateFnsLocale }) // EEEE for full day name
    })
    const monthNames = [...Array(12)].map((_, i) => format(setMonth(new Date(), i), 'LLLL', { locale: dateFnsLocale }))

    return {
      dayNames,
      monthNames,
      tokens: TOKENS,
    }
  }

  const rruleGettextAdapter = (id: string | number | Weekday): string => {
    let translationKeySeed: string
    let fallbackText: string

    if (typeof id === 'string') {
      // Handles keywords like "every", "on", "until", "and", "week", "weeks", "day", "days",
      // and potentially "st", "nd", "rd", "th" for ordinals if rrule.js passes them as strings.
      translationKeySeed = id
      fallbackText = id
      if (dateFnsLocale === fr) {
        if (watchedFreq === Frequency.DAILY) {
          translationKeySeed = id === 'day' ? 'days' : id
        } else if (watchedFreq === Frequency.WEEKLY) {
          if (id === 'every') {
            translationKeySeed = 'weekly_plural_every'
          } else if (id === 'week') {
            translationKeySeed = 'weeks'
          }
        }
      }
    } else if (typeof id === 'number') {
      // rrule.js might pass numbers in a few contexts:
      // 1. For ordinals (e.g., it might pass 1, 2, 3, 21, 22, 23, 31) expecting
      //    the gettext function to return the appropriate ordinal suffix (st, nd, rd, th)
      //    or the full ordinal ("1st", "2nd"). This depends on the rrule.js version and how it forms sentences.
      // 2. For counts if it doesn't use a string like "times".
      // A simple approach is to try and translate it as a numeric key, or just return the number as a string.
      // We need to observe what numbers are passed to translate them effectively.
      // We'll treat it as a generic number that might be part of a phrase.
      translationKeySeed = `num_${id}` // e.g., rrule:num_1, rrule:num_2
      fallbackText = String(id)
    } else if (id instanceof Weekday) {
      const englishDayName = RRuleWeekdays.find((d) => d.rruleConst.weekday === id.weekday)?.label // e.g., "Monday"
      translationKeySeed = englishDayName || `weekday_${id.weekday}`
      fallbackText = englishDayName || `Day ${id.weekday + 1}` // Fallback if not in RRuleWeekdays
    } else {
      // Should not happen with the defined union type, but as a fallback:
      console.warn('rruleGettextAdapter received unexpected id type:', id)
      translationKeySeed = 'unknown'
      fallbackText = 'unknown'
    }

    // Construct the final i18n key, e.g., "rrule:every", "rrule:Monday", "rrule:num_1"
    const i18nKey = `rrule.${translationKeySeed}`
    //console.log(`Attempting to translate: key='${i18nKey}', fallback='${fallbackText}' (original id from rrule: ${JSON.stringify(id)})`)
    return t(i18nKey, fallbackText) // Use your app's t() function
  }

  const tableHandleEdit = (timeTableItem: TimeTableItem) => {
    try {
      if (!timeTableItem.placeId) throw new Error('No rule selected')

      let initialRruleString = timeTableItem.rrule
      let uiRruleParts: UIRrulePartsForForm = {
        _freq: RRule.WEEKLY,
        _interval: 1,
        _byday: [],
      }

      if (initialRruleString) {
        try {
          const rruleObj = RRule.fromString(initialRruleString)
          const options = rruleObj.options
          uiRruleParts._freq = options.freq // This will be a number (RRule.Frequency)
          uiRruleParts._interval = options.interval || 1

          if (options.byweekday !== null && options.byweekday !== undefined) {
            // Normalize options.byweekday to always be an array for mapping
            const weekdaysArraySource: (number | Weekday)[] = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday]

            // Explicitly type 'day' in the map callback
            const mappedDays = weekdaysArraySource.map((day: number | Weekday) => {
              let dayNum: number
              if (typeof day === 'number') {
                dayNum = day // 'day' is a number (e.g., 0 for MO)
              } else {
                // 'day' is a Weekday object (e.g., RRule.MO)
                // The Weekday class instance from rrule.js has a 'weekday' property
                dayNum = day.weekday
              }
              return RRuleWeekdays.find((d) => d.rruleConst.weekday === dayNum)?.value
            })
            uiRruleParts._byday = mappedDays.filter((dayValue): dayValue is string => !!dayValue)
          } else {
            uiRruleParts._byday = []
          }
        } catch (error) {
          openNotification('error', 'Update failed', error instanceof Error ? error.message : 'Error while updating the days column.')
          console.error('Error parsing existing RRULE string:', error, initialRruleString)
          initialRruleString = undefined // Clear if invalid to avoid issues
          // Reset to defaults if parsing failed
          uiRruleParts = { _freq: RRule.WEEKLY, _interval: 1, _byday: [] }
        }
      }

      const hoursForForm = (timeTableItem.hours || []).map((h) => ({
        startHour: minutesToDayjs(h.startHour),
        endHour: minutesToDayjs(h.endHour),
      }))

      const rruleStartDateForForm = dayjs(timeTableItem.rruleStartDate)

      const countNumberOfSlots = timeTableItems.reduce((acc, item) => {
        return item.calendarItemTypeId === timeTableItem.calendarItemTypeId ? acc + 1 : acc
      }, 0)

      form.setFieldsValue({
        calendarItemTypeId: timeTableItem.calendarItemTypeId,
        unavailable: timeTableItem.unavailable,
        numberOfSlots: countNumberOfSlots,
        hours: hoursForForm,
        rruleStartDate: rruleStartDateForForm,
        rrule: initialRruleString,
        _freq: uiRruleParts._freq,
        _interval: uiRruleParts._interval,
        _byday: uiRruleParts._byday,
      })
      setEditingKey(timeTableItem.placeId)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableHandleDelete = () => {
    try {
      if (!timeTableItemToBeDeleted) throw new Error('No rule selected')
      setTimeTableItems((prev) => prev.filter((item) => item.placeId !== timeTableItemToBeDeleted.placeId))
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setShowDeleteTimeTableItemModal(false)
      setTimeTableItemToBeDeleted(undefined)
    }
  }

  const tableHandleCancel = (timeTableItem: TimeTableItem) => {
    setEditingKey('')
  }

  const tableHandleUpdate = async (timeTableItem: TimeTableItem) => {
    try {
      const rowValues = await form.validateFields()

      const hoursToSave = (rowValues.hours || []).map((h) => ({
        startHour: dayjsToMinutes(h.startHour),
        endHour: dayjsToMinutes(h.endHour),
      }))

      const updatedTimeTableItem = new TimeTableItem({
        ...timeTableItem,
        calendarItemTypeId: rowValues.calendarItemTypeId,
        unavailable: rowValues.unavailable,
        hours: hoursToSave,
        rrule: rowValues.rrule,
        rruleStartDate: rowValues.rruleStartDate.valueOf(),
      })

      const numCopies = rowValues.numberOfSlots && typeof rowValues.numberOfSlots === 'number' && rowValues.numberOfSlots > 0 ? Math.floor(rowValues.numberOfSlots) : 1

      const newCopies = Array.from({ length: numCopies }, (_, index) => ({
        ...updatedTimeTableItem,
        placeId: v4(),
      }))

      setTimeTableItems((prevTimeTableItems) => {
        const itemsWithoutOriginal = prevTimeTableItems.filter((item) => item.placeId !== timeTableItem.placeId)
        return [...itemsWithoutOriginal, ...newCopies]
      })
      setEditingKey('')
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error && Array.isArray(error.errorFields) && error.errorFields.length > 0) {
        openNotification('error', t('validation.validation_failed'), t('validation.check_highlighted_fields_correct_errors'))
      } else if (error instanceof Error) {
        openNotification('error', 'Update Failed', error.message)
      } else {
        openNotification('error', 'Update Failed', 'An unexpected error occurred.')
      }
    }
  }

  // Helper function to update the specific time field within the 'hours' array in the form
  const handleTimeValueUpdate = (itemIndexInFormList: number, fieldName: 'startHour' | 'endHour', timeValue: dayjs.Dayjs | null) => {
    const currentHoursArray = form.getFieldValue('hours') || []
    const newHoursArray = [...currentHoursArray] // Create a mutable copy

    // Ensure the item object exists at the index
    if (!newHoursArray[itemIndexInFormList]) {
      newHoursArray[itemIndexInFormList] = { startHour: null, endHour: null }
    }

    // Update the specific field (startHour or endHour)
    newHoursArray[itemIndexInFormList] = {
      ...newHoursArray[itemIndexInFormList],
      [fieldName]: timeValue,
    }

    // Update the form's 'hours' array
    form.setFieldsValue({ hours: newHoursArray })
  }

  const handleSubmit = () => {
    try {
      if (!timeTable) throw new Error('No schedule selected')
      const { name, start, end } = form.getFieldsValue()
      createUpdateTimeTable({ ...timeTable, name: name, startTime: start.valueOf(), endTime: end.valueOf(), items: timeTableItems })
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  useEffect(() => {
    if (isCreateUpdateTimeTableSuccess) showMessageFeedback('success', t('notification.schedule_saved'))
    if (isCreateUpdateTimeTableError) openNotification('error', t('notification.schedule_save_failed'), t('notification.schedule_save_error'))
  }, [isCreateUpdateTimeTableSuccess, isCreateUpdateTimeTableError])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.edit_schedule')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <div className="modalRule">
        {notificationContextHolder}
        {messageContextHolder}
        <Form layout="vertical" colon={false} form={form} onFinish={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', gap: '1rem' }}>
          <div className="formElements">
            <div className="selectors">
              <div className="antSelect">
                {t('content.name')}
                <Form.Item name="name" rules={[{ required: true, message: 'Name of the schedule' }]}>
                  <Input suffix={<CloseOutlined disabled={nameValue === timeTable?.name} onClick={handleNameCancel} />} />
                </Form.Item>
              </div>
              <div className="antSelect">
                {t('content.start')}
                <Form.Item name="start" rules={[{ required: true, message: 'Start of the schedule' }]}>
                  <DatePicker format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div className="antSelect">
                {t('content.end')}
                <Form.Item name="end" rules={[{ required: true, message: 'End of the schedule' }]}>
                  <DatePicker format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </div>
            <div className="antTable">
              <Table<TimeTableItem>
                className="custom-table"
                pagination={{
                  pageSize: 4,
                  simple: true,
                }}
                scroll={{ y: 400, x: 'max-content' }}
                dataSource={filteredDataSource}
                rowKey="placeId"
                locale={{ emptyText: <Empty description={t('content.no_rule_yet')} /> }}
              >
                <ColumnGroup
                  title={
                    <Button style={{ width: '100%' }} onClick={addRule}>
                      {t('content.add_rule')}
                    </Button>
                  }
                >
                  <Column
                    title={t('content.procedure')}
                    dataIndex="calendarItemTypeId"
                    key="calendarItemTypeId"
                    width={'18%'}
                    render={(currentValue: string | undefined, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        // Edit mode
                        return (
                          <Form.Item name="calendarItemTypeId" style={{ margin: 0 }} rules={[{ required: true, message: t('content.select_procedure_required') }]}>
                            <Select placeholder={t('content.select_procedure_placeholder')} style={{ width: '100%' }} loading={!procedures}>
                              {(procedures || []).map((type) => (
                                <Select.Option key={type.id} value={type.id}>
                                  {type.name}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        )
                      } else {
                        // Display mode
                        const typeObject = (procedures || []).find((type) => type.id === currentValue)
                        return typeObject ? (
                          <div>{typeObject.name}</div>
                        ) : (
                          <Tag icon={<ExclamationCircleOutlined />} color="warning">
                            {t('content.not_set')}
                          </Tag>
                        )
                      }
                    }}
                  />

                  <Column
                    title={t('content.days')}
                    dataIndex="rrule"
                    key="rrule"
                    width={'auto'}
                    render={(rruleString: string | undefined, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Form.Item name="rrule" noStyle rules={[{ required: true, message: t('content.recurrence_required') }]}>
                              <Input type="hidden" />
                            </Form.Item>

                            <Space.Compact block className="rrule-repeat">
                              <Typography.Text style={{ marginRight: 8, whiteSpace: 'nowrap' }}>{t('rrule.repeat_every')}:</Typography.Text>
                              <Form.Item name="_interval" initialValue={1} rules={[{ required: true, message: t('validation.valueMissing', 'Value') }]} noStyle>
                                <InputNumber min={1} style={{ width: '35%' }} defaultValue={1} />
                              </Form.Item>
                              <Form.Item name="_freq" initialValue={RRule.WEEKLY} rules={[{ required: true, message: t('validation.unitMissing', 'Unit') }]} noStyle>
                                <Select style={{ width: '65%' }}>
                                  <Select.Option value={RRule.DAILY}>{watchedInterval === 1 ? t('rrule.day') : t('rrule.days')}</Select.Option>
                                  <Select.Option value={RRule.WEEKLY}>{watchedInterval === 1 ? t('rrule.week') : t('rrule.weeks')}</Select.Option>
                                </Select>
                              </Form.Item>
                            </Space.Compact>

                            {watchedFreq === RRule.WEEKLY && (
                              <div className="rrule-start">
                                <Typography.Text style={{ marginRight: 8, whiteSpace: 'nowrap' }}>{t('rrule.on_days')}:</Typography.Text>
                                <Form.Item name="_byday" rules={[{ required: true, message: t('content.select_at_least_one_day') }]} style={{ marginBottom: '12px', width: '100%', flexGrow: 1 }}>
                                  <Select mode="multiple" allowClear placeholder={t('content.select_days_placeholder')}>
                                    {RRuleWeekdays.map((day) => (
                                      <Select.Option key={day.value} value={day.value} label={day.label}>
                                        {day.label}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </div>
                            )}

                            <div className="rrule-start">
                              <Typography.Text style={{ marginRight: 8, whiteSpace: 'nowrap' }}>{t('rrule.from_date', 'A partir du')}:</Typography.Text>
                              <Form.Item
                                name="rruleStartDate"
                                rules={[{ required: true, message: t('validation.select_date_required') }]}
                                style={{
                                  marginBottom: '8px',
                                  flexGrow: 1,
                                }}
                              >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                              </Form.Item>
                            </div>
                          </Space>
                        )
                      } else {
                        if (!rruleString) {
                          return (
                            <Tag icon={<ExclamationCircleOutlined />} color="warning">
                              {t('content.not_set')}
                            </Tag>
                          )
                        }
                        try {
                          const langOpts = getCurrentRruleLanguageOptions()

                          const parsedRuleComponents = RRule.parseString(rruleString)
                          if (parsedRuleComponents.freq === undefined) {
                            throw new Error('Frequency cannot be parsed')
                          }
                          let rruleDtStart: Date
                          if (record.rruleStartDate && typeof record.rruleStartDate === 'number') {
                            rruleDtStart = new Date(record.rruleStartDate)
                          } else {
                            rruleDtStart = new Date(new Date().setHours(0, 0, 0, 0)) // Default to today
                          }

                          // 2. Create the options object for new RRule() ensuring all required types are met
                          const optionsForToText: Partial<Options> = {
                            dtstart: rruleDtStart,
                            freq: parsedRuleComponents.freq as Frequency,
                            ...(parsedRuleComponents.interval !== undefined && { interval: parsedRuleComponents.interval }),
                            ...(parsedRuleComponents.byweekday && { byweekday: parsedRuleComponents.byweekday }),
                          }

                          const ruleForText = new RRule(optionsForToText)
                          let displayText = ruleForText.toText(rruleGettextAdapter, langOpts)

                          if (record.rruleStartDate && typeof record.rruleStartDate === 'number') {
                            const startDate = new Date(record.rruleStartDate)

                            if (!isNaN(startDate.getTime())) {
                              const formattedStartDate = format(startDate, 'P', { locale: dateFnsLocale })

                              const fromDatePrefix = t('rrule.from_date').toLowerCase()

                              displayText = `${displayText} ${fromDatePrefix} ${formattedStartDate}`
                            }
                          }

                          return <span title={rruleString}>{displayText}</span>
                        } catch (e) {
                          console.error('Error processing RRULE for display:', e, rruleString)
                          return (
                            <Tag color="red" title={rruleString}>
                              {t('content.invalid_rule')}
                            </Tag>
                          )
                        }
                      }
                    }}
                  />
                  <Column
                    title={t('content.hours')}
                    dataIndex="hours"
                    key="hours"
                    width={'15%'}
                    render={(hoursArray: TimeTableHour[] | undefined, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Form.List name="hours">
                            {(fields, { add, remove }, { errors }) => (
                              <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '10px' }}>
                                {fields.map(({ key, name, ...restField }) => {
                                  return (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                      <Form.Item
                                        {...restField}
                                        name={[name, 'startHour']} // Form value will be a dayjs object
                                        rules={[{ required: true, message: t('validation.startTimeRequired', 'Start!') }]}
                                        noStyle
                                      >
                                        <TimePicker
                                          showNow={false}
                                          format="HH:mm"
                                          minuteStep={5}
                                          placeholder={t('content.start_hour')}
                                          style={{ width: '100px' }}
                                          changeOnScroll // allows changing time with mouse scroll
                                          onPickerValueChange={(timeValue) => handleTimeValueUpdate(name, 'startHour', timeValue)}
                                        />
                                      </Form.Item>
                                      <span>-</span>
                                      <Form.Item
                                        {...restField}
                                        name={[name, 'endHour']}
                                        noStyle
                                        rules={[
                                          { required: true, message: t('validation.endTimeRequired', 'End!') },
                                          ({ getFieldValue }) => ({
                                            validator(_, value) {
                                              // 'value' is the current endHour (a dayjs object or null)
                                              const startHourValue = getFieldValue(['hours', name, 'startHour'])

                                              // Only validate if both start and end times are selected
                                              // The 'required' rule will handle cases where one is missing.
                                              if (value && startHourValue && dayjs.isDayjs(value) && dayjs.isDayjs(startHourValue)) {
                                                if (!value.isAfter(startHourValue)) {
                                                  // Check if endHour is NOT after startHour
                                                  return Promise.reject(new Error(t('content.end_time_after_start_time')))
                                                }
                                              }
                                              return Promise.resolve()
                                            },
                                          }),
                                        ]}
                                      >
                                        <TimePicker
                                          showNow={false}
                                          format="HH:mm"
                                          minuteStep={5}
                                          placeholder={t('content.end_hour')}
                                          style={{ width: '100px' }}
                                          changeOnScroll
                                          onPickerValueChange={(timeValue) => handleTimeValueUpdate(name, 'endHour', timeValue)}
                                        />
                                      </Form.Item>
                                      <Button
                                        type="text"
                                        danger
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => {
                                          remove(name)
                                        }}
                                        disabled={fields.length === 1}
                                        size="small"
                                      />
                                    </Space>
                                  )
                                })}
                                <Button
                                  type="dashed"
                                  onClick={() => add({ startHour: null, endHour: null })} // Add with null for TimePicker placeholder
                                  block
                                  icon={<PlusOutlined />}
                                >
                                  {t('content.add_hours')}
                                </Button>
                                <Form.ErrorList errors={errors} />
                              </div>
                            )}
                          </Form.List>
                        )
                      } else {
                        if (!hoursArray || hoursArray.length === 0) {
                          return <Tag>{t('status.noHoursSet', 'No hours set')}</Tag>
                        }
                        return (
                          <div>
                            {hoursArray.map((h, index) => {
                              const startDisplay = formatMinutesToHHMM(h.startHour)
                              const endDisplay = formatMinutesToHHMM(h.endHour)

                              // Check if both start and end are "N/A" (our placeholder for undefined/null)
                              if (startDisplay === 'N/A' && endDisplay === 'N/A') {
                                return (
                                  <Tag icon={<ExclamationCircleOutlined />} color="warning" key={`hour-range-${index}`}>
                                    {t('content.not_set')}
                                  </Tag>
                                )
                              } else {
                                // If at least one is defined, show the range (e.g., "08:00 - N/A" or "N/A - 17:00" or "08:00 - 17:00")
                                return (
                                  <div key={`hour-range-${index}`}>
                                    <Tag>{`${startDisplay} - ${endDisplay}`}</Tag>
                                  </div>
                                )
                              }
                            })}
                          </div>
                        )
                      }
                    }}
                  />
                  <Column
                    title={t('content.availability')}
                    dataIndex="unavailable"
                    key="unavailable"
                    width={'13%'}
                    render={(isUnavailable: boolean | undefined, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Form.Item name="unavailable" style={{ margin: 0 }} rules={[{ required: true, message: 'Please select availability!' }]}>
                            <Radio.Group>
                              <Radio value={false}>{t('content.activate')}</Radio>
                              <Radio value={true}>{t('content.deactivate')}</Radio>
                            </Radio.Group>
                          </Form.Item>
                        )
                      } else {
                        if (isUnavailable === true) {
                          return <Tag color="red">{t('content.deactivated')}</Tag>
                        } else if (isUnavailable === false) {
                          return <Tag color="green">{t('content.activated')}</Tag>
                        }
                        return <Tag color="orange">{t('content.unknown')}</Tag>
                      }
                    }}
                  />
                  <Column
                    title={t('content.number_of_slots')}
                    key="numberOfSlots"
                    width={'auto'}
                    render={(_: unknown, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Form.Item
                            name="numberOfSlots"
                            style={{ margin: 0 }}
                            rules={[
                              { required: true, message: t('content.slots_required') },
                              { type: 'number', min: 1, message: t('content.slot_required_at_least_one') },
                            ]}
                          >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder={t('content.enter_slots')} />
                          </Form.Item>
                        )
                      } else {
                        const countNumberOfSlots =
                          record.calendarItemTypeId === undefined
                            ? 1
                            : timeTableItems.reduce((acc, item) => {
                                return item.calendarItemTypeId === record.calendarItemTypeId ? acc + 1 : acc
                              }, 0)
                        if (typeof countNumberOfSlots === 'number' && !isNaN(countNumberOfSlots)) {
                          return (
                            <Tag color={countNumberOfSlots > 0 ? 'geekblue' : 'default'}>
                              {countNumberOfSlots} {countNumberOfSlots < 2 ? t('content.slot') : t('content.slots')}
                            </Tag>
                          )
                        } else {
                          return (
                            <Tag icon={<ExclamationCircleOutlined />} color="warning">
                              {t('content.not_set')}
                            </Tag>
                          )
                        }
                      }
                    }}
                  />

                  <Column
                    title={t('content.actions')}
                    key="action"
                    fixed="right"
                    width={'13%'}
                    render={(_: unknown, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Space size="middle" className="actionButtons">
                            <Button onClick={() => tableHandleUpdate(record)}>{t('content.update')}</Button>
                            <Button onClick={() => tableHandleCancel(record)}>{t('content.cancel')}</Button>
                          </Space>
                        )
                      } else {
                        return (
                          <Space size="middle" className="actionButtons">
                            <Button onClick={() => tableHandleEdit(record)}>{t('content.edit')}</Button>
                            <Button
                              onClick={() => {
                                setTimeTableItemToBeDeleted(record)
                                setShowDeleteTimeTableItemModal(true)
                              }}
                            >
                              {t('content.delete')}
                            </Button>
                          </Space>
                        )
                      }
                    }}
                  />
                </ColumnGroup>
              </Table>
            </div>
          </div>
          <div className="submitButton">
            <Button htmlType="submit">{t('content.save_schedule')}</Button>
          </div>
        </Form>
        {showDeleteTimeTableItemModal &&
          createPortal(
            <ModalConfirmAction
              title={t('delete_modal.confirm_delete_rule_prompt')}
              description=""
              content={
                <>
                  <p>{t('delete_modal.delete_rule_warning_details')}</p>
                  <p>{t('delete_modal.delete_permanent_warning')}</p>
                </>
              }
              yesBtnTitle={t('content.delete')}
              noBtnTitle={t('content.close')}
              onYesClick={tableHandleDelete}
              onNoClick={() => {
                setTimeTableItemToBeDeleted(undefined)
                setShowDeleteTimeTableItemModal(false)
              }}
              isVisible={showDeleteTimeTableItemModal}
              mode="danger"
            />,
            document.body,
          )}
      </div>
    </CustomModal>
  )
}

import { Agenda, TimeTable, TimeTableHour, TimeTableItem } from '@icure/cardinal-sdk'
import React, { ReactElement, useEffect, useMemo, useState } from 'react'
import { CustomModal } from '../../common/CustomModal'
import './index.css'
import { Button, DatePicker, Form, Input, Table, Space, Empty, notification, message, Select, Radio, Tag, InputNumber, TimePicker } from 'antd'
import { CloseOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addDays, addMonths, format, Locale, startOfDay } from 'date-fns'
import { enUS, fr, de, nl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateTimeTableMutation, useGetTimeTableQuery } from '../../../core/api/timeTableApi'
import { v4 } from 'uuid'
import { useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'
import { dayjsToMinutes, formatMinutesToHHMM, minutesToDayjs } from '../../common/helpers'

const localeMap: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  nl: nl,
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
  const [slotsData, setSlotsData] = useState<{ [placeId: string]: number }>({})
  const [timeTableItems, setTimeTableItems] = useState<TimeTableItem[]>([])
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: TimeTableItem) => record.placeId === editingKey, [editingKey])

  const { data: timeTable } = useGetTimeTableQuery(timeTableId ?? '')

  const { data: procedures } = useGetCalendarItemTypesQuery({ skip: !timeTable || !agenda, agendaId: agenda?.id ?? '' })

  const [createUpdateTimeTable, { isError: isCreateUpdateTimeTableError, isSuccess: isCreateUpdateTimeTableSuccess, isLoading: isCreateUpdateTimeTableLoading }] =
    useCreateUpdateTimeTableMutation()

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
    form.setFieldsValue({ name: initialName })
  }

  const addRule = () => {
    try {
      if (!timeTable) throw new Error('No schedule selected')
      const newRule = new TimeTableItem({ rruleStartDate: timeTable.startTime, placeId: v4(), unavailable: true })
      setTimeTableItems((prev) => [...prev, newRule])
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableHandleEdit = (timeTableItem: TimeTableItem) => {
    try {
      if (!timeTableItem.placeId) throw new Error('No schedule id selected')

      const hoursForForm = (timeTableItem.hours || []).map((h) => ({
        startHour: minutesToDayjs(h.startHour),
        endHour: minutesToDayjs(h.endHour),
      }))

      form.setFieldsValue({
        calendarItemTypeId: timeTableItem.calendarItemTypeId,
        unavailable: timeTableItem.unavailable,
        numberOfSlots: 1,
        hours: hoursForForm,
      })
      setEditingKey(timeTableItem.placeId)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableHandleDelete = (timeTableItem: TimeTableItem) => {}

  const tableHandleCancel = (timeTableItem: TimeTableItem) => {
    setEditingKey('')
  }

  const tableHandleUpdate = async (timeTableItem: TimeTableItem) => {
    try {
      const { calendarItemTypeId, unavailable, hours } = await form.validateFields(['calendarItemTypeId', 'unavailable', 'hours'])
      console.log('hours', hours)
      const hoursToSave = (hours || []).map((h) => ({
        startHour: dayjsToMinutes(h.startHour),
        endHour: dayjsToMinutes(h.endHour),
      }))
      console.log('hoursToSave', hoursToSave)
      setTimeTableItems((prev) =>
        prev.map((item) => (item.placeId === timeTableItem.placeId ? { ...item, calendarItemTypeId: calendarItemTypeId, unavailable: unavailable, hours: hoursToSave } : item)),
      )
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setEditingKey('')
    }
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
        <Form
          layout="vertical"
          colon={false}
          form={form}
          onFinish={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', gap: '1rem' }}
        >
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
                  <DatePicker />
                </Form.Item>
              </div>
              <div className="antSelect">
                {t('content.end')}
                <Form.Item name="end" rules={[{ required: true, message: 'End of the schedule' }]}>
                  <DatePicker />
                </Form.Item>
              </div>
            </div>
            <div className="antTable">
              <Table<TimeTableItem> dataSource={timeTableItems} rowKey="placeId" locale={{ emptyText: <Empty description={t('content.no_rule_yet')} /> }}>
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
                    width={'17%'}
                    render={(currentValue: string | undefined, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Form.Item name="calendarItemTypeId" style={{ margin: 0 }} rules={[{ required: true, message: 'Please select a procedure!' }]}>
                            <Select placeholder="Select a type" style={{ width: '100%' }} loading={!procedures}>
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
                        return <div>{typeObject ? typeObject.name : currentValue || 'N/A'}</div>
                      }
                    }}
                  />

                  <Column
                    title={t('content.days')}
                    dataIndex="rrule"
                    key="rrule"
                    width={'17%'}
                    render={(currentValue: string | undefined, record: TimeTableItem) => {
                      return <div>days</div>
                    }}
                  />
                  <Column
                    title={t('content.hours')}
                    dataIndex="hours"
                    key="hours"
                    width={'17%'}
                    render={(hoursArray: TimeTableHour[] | undefined, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Form.List name="hours">
                            {(fields, { add, remove }, { errors }) => (
                              <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '10px' }}>
                                {fields.map(({ key, name, ...restField }) => (
                                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'startHour']} // Form value will be a dayjs object
                                      rules={[{ required: true, message: t('validation.startTimeRequired', 'Start!') }]}
                                      noStyle
                                    >
                                      <TimePicker
                                        format="HH:mm" // European 24-hour format
                                        minuteStep={15} // Or 5, 10, 30, or 1 for per-minute
                                        placeholder={t('placeholders.startTime', 'Start')}
                                        style={{ width: '100px' }} // Adjust width
                                        changeOnScroll // Optional: allows changing time with mouse scroll
                                        // value and onChange are handled by Form.Item
                                      />
                                    </Form.Item>
                                    <span>-</span>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'endHour']} // Form value will be a dayjs object
                                      rules={[{ required: true, message: t('validation.endTimeRequired', 'End!') }]}
                                      noStyle
                                    >
                                      <TimePicker format="HH:mm" minuteStep={15} placeholder={t('placeholders.endTime', 'End')} style={{ width: '100px' }} changeOnScroll />
                                    </Form.Item>
                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                  </Space>
                                ))}
                                <Button
                                  type="dashed"
                                  onClick={() => add({ startHour: null, endHour: null })} // Add with null for TimePicker placeholder
                                  block
                                  icon={<PlusOutlined />}
                                >
                                  {t('actions.addHours', 'Add hours')}
                                </Button>
                                <Form.ErrorList errors={errors} />
                              </div>
                            )}
                          </Form.List>
                        )
                      } else {
                        // DISPLAY MODE
                        if (!hoursArray || hoursArray.length === 0) {
                          return <Tag>{t('status.noHoursSet', 'No hours set')}</Tag>
                        }
                        return (
                          <div>
                            {hoursArray.map((h, index) => (
                              <div key={`hour-range-${index}`}>
                                {' '}
                                {}
                                <Tag>
                                  {formatMinutesToHHMM(h.startHour)} - {formatMinutesToHHMM(h.endHour)}
                                </Tag>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    }}
                  />
                  <Column
                    title={t('content.availability')}
                    dataIndex="unavailable"
                    key="unavailable"
                    width={'17%'}
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
                    width={'17%'}
                    render={(_textFromTable, record: TimeTableItem) => {
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
                        const slotsValue = record.placeId ? slotsData[record.placeId] : undefined

                        if (typeof slotsValue === 'number' && !isNaN(slotsValue)) {
                          return (
                            <Tag color={slotsValue > 0 ? 'geekblue' : 'default'}>
                              {slotsValue} {slotsValue === 1 ? t('content.slot') : t('content.slots')}
                            </Tag>
                          )
                        } else {
                          return <Tag>{t('content.not_set', 'N/A')}</Tag>
                        }
                      }
                    }}
                  />

                  <Column
                    title={t('content.actions')}
                    key="action"
                    width={'15%'}
                    render={(_: unknown, record: TimeTableItem) => {
                      const editable = isEditing(record)

                      if (editable) {
                        return (
                          <Space size="middle">
                            <Button onClick={() => tableHandleUpdate(record)}>{t('content.update')}</Button>
                            <Button onClick={() => tableHandleCancel(record)}>{t('content.cancel')}</Button>
                          </Space>
                        )
                      } else {
                        return (
                          <Space size="middle">
                            <Button onClick={() => tableHandleEdit(record)}>{t('content.edit')}</Button>
                            <Button onClick={() => tableHandleDelete(record)}>{t('content.delete')}</Button>
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
      </div>
    </CustomModal>
  )
}

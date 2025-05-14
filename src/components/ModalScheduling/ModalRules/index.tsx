import { Agenda, TimeTable, TimeTableItem } from '@icure/cardinal-sdk'
import React, { ReactElement, useEffect, useMemo, useState } from 'react'
import { CustomModal } from '../../common/CustomModal'
import './index.css'
import { Button, DatePicker, Form, Input, Table, Space, Empty, notification, message, Select } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addDays, addMonths, format, Locale, startOfDay } from 'date-fns'
import { enUS, fr, de, nl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateTimeTableMutation, useGetTimeTableQuery } from '../../../core/api/timeTableApi'
import { v4 } from 'uuid'
import { useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'

const localeMap: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  nl: nl,
}

interface FormValues {
  name: string
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  calendarItemTypeId: string
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
      const newRule = new TimeTableItem({ rruleStartDate: timeTable.startTime, placeId: v4() })
      setTimeTableItems((prev) => [...prev, newRule])
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableHandleEdit = (timeTableItem: TimeTableItem) => {
    try {
      if (!timeTableItem.placeId) throw new Error('No schedule id selected')
      form.setFieldsValue({
        calendarItemTypeId: timeTableItem.calendarItemTypeId,
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
      const { calendarItemTypeId } = await form.validateFields(['calendarItemTypeId'])
      setTimeTableItems((prev) => prev.map((item) => (item.placeId === timeTableItem.placeId ? { ...item, calendarItemTypeId: calendarItemTypeId } : item)))
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
                    render={(currentValue: string | undefined, record: TimeTableItem) => {
                      return <div>hours</div>
                    }}
                  />
                  <Column
                    title={t('content.availability')}
                    dataIndex="unavailable"
                    key="unavailable"
                    width={'17%'}
                    render={(currentValue: string | undefined, record: TimeTableItem) => {
                      return <div>availability</div>
                    }}
                  />
                  <Column
                    title={t('content.number_of_slots')}
                    key="slots"
                    width={'17%'}
                    render={(currentValue: string | undefined, record: TimeTableItem) => {
                      return <div>number of slots</div>
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

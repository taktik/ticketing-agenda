import { TimeTable, TimeTableItem } from '@icure/cardinal-sdk'
import React, { ReactElement, useEffect, useMemo } from 'react'
import { CustomModal } from '../../common/CustomModal'
import './index.css'
import { Button, DatePicker, Form, Input, Table, Space, Empty, notification, message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addDays, addMonths, format, Locale, startOfDay } from 'date-fns'
import { enUS, fr, de, nl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateTimeTableMutation, useGetTimeTableQuery } from '../../../core/api/timeTableApi'

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
}

interface ModalRulesProps {
  isVisible: boolean
  onClose: () => void
  timeTableId: string | undefined
}

export const ModalRules = ({ isVisible, onClose, timeTableId }: ModalRulesProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])
  const [form] = Form.useForm<FormValues>()

  const { data: timeTable } = useGetTimeTableQuery(timeTableId ?? '')

  useEffect(() => console.log('timeTable', timeTable), [timeTable])

  const [createUpdateTimeTable, { isError: isCreateUpdateTimeTableError, isSuccess: isCreateUpdateTimeTableSuccess, isLoading: isCreateUpdateTimeTableLoading }] =
    useCreateUpdateTimeTableMutation()

  useEffect(() => {
    if (timeTable) {
      form.setFieldsValue({
        name: timeTable.name,
        start: timeTable.startTime ? dayjs(timeTable.startTime) : undefined,
        end: timeTable.endTime ? dayjs(timeTable.endTime) : undefined,
      })
    } else {
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

  const nameValue = Form.useWatch('name', form)
  const initialName = useMemo(() => timeTable?.name || '', [timeTable])

  const handleNameCancel = () => {
    form.setFieldsValue({ name: initialName })
  }

  const addRule = () => {}

  const tableHandleEdit = (timeTableItem: TimeTableItem) => {}
  const tableHandleDelete = (timeTableItem: TimeTableItem) => {}

  const handleSubmit = () => {
    try {
      if (!timeTable) throw new Error('No schedule selected')
      const { name, start, end } = form.getFieldsValue()
      createUpdateTimeTable({ ...timeTable, name: name, startTime: start.valueOf(), endTime: end.valueOf() })
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  useEffect(() => {
    if (isCreateUpdateTimeTableSuccess) showMessageFeedback('success', 'The schedule was saved!')
    if (isCreateUpdateTimeTableError) openNotification('error', 'We could not save the schedule!', `An error occurred while saving the schedule.`)
  }, [isCreateUpdateTimeTableSuccess, isCreateUpdateTimeTableError])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Edition d'un horaire" blockAntModalBodyVerticalScroll noFooter width={1300}>
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
                Nom
                <Form.Item name="name" rules={[{ required: true, message: 'Name of the schedule' }]}>
                  <Input suffix={<CloseOutlined disabled={nameValue === timeTable?.name} onClick={handleNameCancel} />} />
                </Form.Item>
              </div>
              <div className="antSelect">
                Début
                <Form.Item name="start" rules={[{ required: true, message: 'Start of the schedule' }]}>
                  <DatePicker />
                </Form.Item>
              </div>
              <div className="antSelect">
                Fin
                <Form.Item name="end" rules={[{ required: true, message: 'End of the schedule' }]}>
                  <DatePicker />
                </Form.Item>
              </div>
            </div>
            <div className="antTable">
              <Table<TimeTableItem> dataSource={[]} rowKey="id" locale={{ emptyText: <Empty description="No rule yet" /> }}>
                <ColumnGroup
                  title={
                    <Button style={{ width: '100%' }} onClick={addRule}>
                      Ajouter une règle
                    </Button>
                  }
                >
                  <Column title="Démarche" dataIndex="endTime" key="endTime" width={'17%'} />

                  <Column title="Jours" dataIndex="name" key="name" width={'17%'} />
                  <Column
                    title="Heure(s)"
                    dataIndex="startTime"
                    key="startTime"
                    width={'17%'}
                    render={(value: number) => format(new Date(value), 'P', { locale: dateFnsLocale })}
                  />
                  <Column title="Disponibilité" dataIndex="name" key="name" width={'17%'} />
                  <Column title="Nombre de slots" dataIndex="name" key="name" width={'17%'} />

                  <Column
                    title="Action"
                    key="action"
                    width={'15%'}
                    render={(_: unknown, record: TimeTableItem) => (
                      <Space size="middle">
                        <Button onClick={() => tableHandleEdit(record)}>Editer</Button>
                        <Button onClick={() => tableHandleDelete(record)}>Supprimer</Button>
                      </Space>
                    )}
                  />
                </ColumnGroup>
              </Table>
            </div>
          </div>
          <div className="submitButton">
            <Button htmlType="submit">Enregistrer</Button>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

import { CalendarItemType, HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, DatePicker, Descriptions, Empty, Form, message, Modal, notification, Popconfirm, Select, Space, Table, Tooltip, Input, Typography } from 'antd'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addMonths, format, Locale, startOfDay } from 'date-fns'
import { de, enUS, fr, nl } from 'date-fns/locale'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { CustomModal } from '../../common/CustomModal'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { EventApi } from 'fullcalendar'
import dayjs from 'dayjs'
import './index.css'

const { TextArea } = Input
const { Text } = Typography

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  event: EventApi | undefined
  procedures: CalendarItemType[] | undefined
}

export const ModalEvent = ({ isVisible, onClose, event, procedures }: ModalSchedulingProps) => {
  const { t } = useTranslation()

  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (event) {
      form.setFieldsValue({
        start: dayjs(event.start),
        end: dayjs(event.end),
        details: event.extendedProps.details,
        calendarItemTypeId: event.extendedProps.calendarItemTypeId,
      })
    }
    setIsEditing(false)
  }, [event, isVisible, form])

  if (!event) {
    return null
  }

  const handleModify = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const updatedData = {
        ...values,
        title: event.title,
      }
      console.log('save')
      onClose()
    } catch (error) {
      message.error('Validation failed. Please check the fields.')
    }
  }

  const handleDelete = () => {
    console.log('delete')
    onClose()
  }

  // --- Render Logic ---

  const renderDisplayMode = () => (
    <Descriptions bordered column={1} style={{ width: '100%' }}>
      <Descriptions.Item label="Starts">{dayjs(event.start).format('MMMM D, YYYY h:mm A')}</Descriptions.Item>
      <Descriptions.Item label="Ends">{dayjs(event.end).format('MMMM D, YYYY h:mm A')}</Descriptions.Item>
      <Descriptions.Item label="Type">{(procedures ?? []).find((t) => t.id === event.extendedProps.calendarItemTypeId)?.name || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label="Details">
        <Text style={{ whiteSpace: 'pre-wrap' }}>{event.extendedProps.details || 'No details provided.'}</Text>
      </Descriptions.Item>
    </Descriptions>
  )

  const renderEditMode = () => (
    <Form form={form} layout="vertical" style={{ width: '100%', padding: '1rem' }}>
      <Form.Item name="start" label="Start Time" rules={[{ required: true }]}>
        <DatePicker showTime format="MMM D, YYYY h:mm A" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="end" label="End Time" rules={[{ required: true }]}>
        <DatePicker showTime format="MMM D, YYYY h:mm A" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="calendarItemTypeId" label="Appointment Type" rules={[{ required: true }]}>
        <Select>
          {(procedures ?? []).map((type) => (
            <Select.Option key={type.id} value={type.id}>
              {type.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="details" label="Details">
        <TextArea rows={4} />
      </Form.Item>
    </Form>
  )

  const modalFooter = isEditing
    ? [
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save Changes
        </Button>,
      ]
    : [
        <Popconfirm key="delete" title="Delete this event?" description="Are you sure you want to delete this event? This action cannot be undone." onConfirm={handleDelete} okText="Yes, delete it" cancelText="No">
          <Button danger>Delete</Button>
        </Popconfirm>,
        <Button key="modify" type="primary" onClick={handleModify}>
          Modify
        </Button>,
      ]

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={isEditing ? `Editing: ${event.title}` : event.title} blockAntModalBodyVerticalScroll customFooter={modalFooter} width={800}>
      <div className="modal-event">{isEditing ? renderEditMode() : renderDisplayMode()}</div>
    </CustomModal>
  )
}

/*
   <Modal title={isEditing ? `Editing: ${event.title}` : event.title} open={isVisible} onCancel={onClose} footer={modalFooter} width={600}>
      {isEditing ? renderEditMode() : renderDisplayMode()}
    </Modal>
    */

/*
      primaryBtnTitle={isEditing ? 'Cancel' : 'Delete'}
      handleClickPrimaryBtn={isEditing ? handleCancel : handleSave}
      secondaryBtnTitle={isEditing ? 'Save Changes' : 'Modify'}
      handleClickSecondaryBtn={isEditing ? handleDelete : handleModify}
      */

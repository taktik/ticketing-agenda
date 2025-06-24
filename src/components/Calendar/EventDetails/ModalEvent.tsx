import { CalendarItemType } from '@icure/cardinal-sdk'
import { Button, DatePicker, Descriptions, Form, Input, message, Select, Typography } from 'antd'
import dayjs from 'dayjs'
import { EventApi } from 'fullcalendar'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CustomModal } from '../../common/CustomModal'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import './index.css'

const { TextArea } = Input
const { Text } = Typography

interface EventDetailsProps {
  isVisible: boolean
  onClose: () => void
  event: EventApi | undefined
  procedures: CalendarItemType[] | undefined
}

export const EventDetails = ({ isVisible, onClose, event, procedures }: EventDetailsProps) => {
  const [showDeleteAppointmentModal, setShowDeleteAppointmentModal] = useState<boolean>(false)
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
      <Descriptions.Item label={t('content.start_hour')}>{dayjs(event.start).format('MMM D, YYYY HH:mm')}</Descriptions.Item>
      <Descriptions.Item label={t('content.end_hour')}>{dayjs(event.end).format('MMM D, YYYY HH:mm')}</Descriptions.Item>
      <Descriptions.Item label={t('content.procedure')}>{(procedures ?? []).find((t) => t.id === event.extendedProps.calendarItemTypeId)?.name || 'N/A'}</Descriptions.Item>
      <Descriptions.Item label={t('content.details')}>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{event.extendedProps.details || 'No details provided.'}</Text>
      </Descriptions.Item>
    </Descriptions>
  )

  const renderEditMode = () => (
    <Form form={form} layout="vertical" style={{ width: '100%', padding: '1rem' }}>
      <Form.Item name="start" label={t('content.start_hour')} rules={[{ required: true }]}>
        <DatePicker showTime format="MMM D, YYYY HH:mm" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="end" label={t('content.end_hour')} rules={[{ required: true }]}>
        <DatePicker showTime format="MMM D, YYYY HH:mm" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="calendarItemTypeId" label={t('content.procedure')} rules={[{ required: true }]}>
        <Select>
          {(procedures ?? []).map((type) => (
            <Select.Option key={type.id} value={type.id}>
              {type.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="details" label={t('content.details')}>
        <TextArea rows={4} />
      </Form.Item>
    </Form>
  )

  const modalFooter = isEditing
    ? [
        <Button key="cancel" onClick={handleCancel}>
          {t('content.cancel')}
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          {t('content.save')}
        </Button>,
      ]
    : [
        <Button key="delete" danger onClick={() => setShowDeleteAppointmentModal(true)}>
          {t('content.delete')}
        </Button>,
        <Button key="modify" type="primary" onClick={handleModify}>
          {t('content.modify')}
        </Button>,
      ]

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={isEditing ? `${t('content.editing')}: ${event.title}` : event.title} blockAntModalBodyVerticalScroll customFooter={modalFooter} width={800}>
      <div className="modal-event">
        {isEditing ? renderEditMode() : renderDisplayMode()}
        {showDeleteAppointmentModal &&
          createPortal(
            <ModalConfirmAction
              title={t('delete_modal.confirm_delete_appointment_prompt')}
              description=""
              content={
                <>
                  <p>{t('delete_modal.delete_appointment_warning_details')}</p>
                  <p>{t('delete_modal.delete_permanent_warning')}</p>
                </>
              }
              yesBtnTitle={t('content.delete')}
              noBtnTitle={t('content.close')}
              onYesClick={() => {
                handleDelete()
                setShowDeleteAppointmentModal(false)
              }}
              onNoClick={() => setShowDeleteAppointmentModal(false)}
              isVisible={showDeleteAppointmentModal}
              mode="danger"
            />,
            document.body,
          )}
      </div>
    </CustomModal>
  )
}

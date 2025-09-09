import { CalendarItemType } from '@icure/cardinal-sdk'
import { Button, Card, DatePicker, Descriptions, Form, Input, message, Select, Typography } from 'antd'
import { enUS } from 'date-fns/locale'
import dayjs from 'dayjs'
import { EventApi } from 'fullcalendar'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useGetPatientByIdQuery } from '../../../core/api/patientApi'
import { CustomModal } from '../../common/CustomModal'
import { formatEventDate, localeMap } from '../../common/helpers'
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
  const { t, i18n } = useTranslation()
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])

  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()

  const { data: patient } = useGetPatientByIdQuery(event?.extendedProps.patientId ?? '')

  const patientName = useMemo(() => (patient ? patient.firstName + ' ' + patient.lastName : undefined), [patient])
  const patientEmail = useMemo(() => (patient && patient.codes ? patient.codes.find((stub) => stub.type === 'email')?.code : undefined), [patient])
  const patientPhoneNumber = useMemo(() => (patient && patient.codes ? patient.codes.find((stub) => stub.type === 'phone')?.code : undefined), [patient])

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
    <div className="modal-event-display">
      <Card
        title={t('content.appointment_details')}
        bordered={false}
        headStyle={{ paddingLeft: 0, borderBottom: 0, minHeight: 'auto' }}
        bodyStyle={{ padding: 0 }}
        style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <Descriptions bordered column={1} labelStyle={{ width: '250px' }}>
          <Descriptions.Item label={t('content.date_and_time')}>{formatEventDate(event, dateFnsLocale)}</Descriptions.Item>
          <Descriptions.Item label={t('content.procedure')}>{event.title}</Descriptions.Item>
          <Descriptions.Item label={t('content.details')}>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{event.extendedProps.details || t('content.no_details_provided')}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={t('content.citizen_details')}
        bordered={false}
        headStyle={{ paddingLeft: 0, borderBottom: 0, minHeight: 'auto' }}
        bodyStyle={{ padding: 0 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <Descriptions bordered column={1} labelStyle={{ width: '250px' }}>
          <Descriptions.Item label={t('content.full_name')}>{patientName}</Descriptions.Item>
          <Descriptions.Item label={t('content.email')}>{patientEmail}</Descriptions.Item>
          <Descriptions.Item label={t('content.phone_number')}>{patientPhoneNumber}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
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
    <CustomModal
      isVisible={isVisible}
      handleClose={onClose}
      title={isEditing ? t('content.edit_appointment') : t('content.appointment_information')}
      blockAntModalBodyVerticalScroll
      customFooter={modalFooter}
      width={800}
    >
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

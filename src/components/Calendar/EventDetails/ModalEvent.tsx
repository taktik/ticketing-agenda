import { CalendarItemType } from '@icure/cardinal-sdk'
import { Button, Card, DatePicker, Descriptions, Divider, Form, Input, Select, Typography } from 'antd'
import { format, parse } from 'date-fns'
import { enUS } from 'date-fns/locale'
import dayjs from 'dayjs'
import { EventApi } from 'fullcalendar'
import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useGetPatientByIdQuery } from '../../../core/api/patientApi'
import { CustomModal } from '../../common/CustomModal'
import { formatEventDate, localeMap } from '../../common/helpers'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import './index.css'

const { TextArea } = Input
const { Text } = Typography

export interface CalendarEventUpdateForm {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  calendarItemTypeId?: string
  details: string
}

interface EventDetailsProps {
  isVisible: boolean
  onClose: () => void
  event: EventApi | undefined
  procedures: CalendarItemType[] | undefined
  deleteEvent: (event: EventApi | undefined) => Promise<void>
  updateEvent: (event: EventApi | undefined, updatedValues: CalendarEventUpdateForm) => Promise<void>
}

export const EventDetails = ({ isVisible, onClose, event, procedures, deleteEvent, updateEvent }: EventDetailsProps) => {
  const [showDeleteAppointmentModal, setShowDeleteAppointmentModal] = useState<boolean>(false)
  const { t, i18n } = useTranslation()
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])

  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm<CalendarEventUpdateForm>()

  const { data: patient } = useGetPatientByIdQuery(event?.extendedProps.patientId ?? '', { skip: !event || !event.extendedProps.patientId })

  const isTimeOff = useMemo(() => !!event?.extendedProps.isTimeOff, [event])

  const patientName = useMemo(() => (patient ? patient.firstName + ' ' + patient.lastName : undefined), [patient])
  const patientEmail = useMemo(() => (patient && patient.codes ? patient.codes.find((stub) => stub.type === 'email')?.code : undefined), [patient])
  const patientPhoneNumber = useMemo(() => (patient && patient.codes ? patient.codes.find((stub) => stub.type === 'phone')?.code : undefined), [patient])
  const patientBirthDate = useMemo(() => (patient && patient.dateOfBirth ? format(parse(String(patient.dateOfBirth), 'yyyyMMdd', new Date()), 'dd MMMM yyyy', { locale: dateFnsLocale }) : undefined), [patient])

  const handleModify = useCallback(() => {
    setIsEditing(true)
  }, [setIsEditing])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
  }, [setIsEditing])

  const handleUpdate = useCallback(async () => {
    const values = await form.validateFields()
    await updateEvent(event, values)
    onClose()
  }, [form, event, updateEvent])

  const handleDelete = useCallback(async () => {
    await deleteEvent(event)
    setShowDeleteAppointmentModal(false)
    onClose()
  }, [event, deleteEvent, setShowDeleteAppointmentModal])

  // --- Render Logic ---

  const renderDisplayMode = () => (
    <div className="modal-event-display">
      <Card
        title={t('content.appointment_details')}
        variant="borderless"
        styles={{
          header: { paddingLeft: 0, borderBottom: 0, minHeight: 'auto' },
          body: { padding: 0 },
        }}
        style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <Descriptions
          bordered
          column={1}
          styles={{
            label: { width: '250px' },
          }}
        >
          <Descriptions.Item label={t('content.date_and_time')}>{event ? formatEventDate(event, dateFnsLocale) : ''}</Descriptions.Item>
          <Descriptions.Item label={t('content.procedure')}>{event?.title}</Descriptions.Item>
          <Descriptions.Item label={t('content.details')}>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{event?.extendedProps.details || t('content.no_details_provided')}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {!isTimeOff && (
        <Card
          title={t('content.citizen_details')}
          variant="borderless"
          styles={{
            header: { paddingLeft: 0, borderBottom: 0, minHeight: 'auto' },
            body: { padding: 0 },
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Descriptions
            bordered
            column={1}
            styles={{
              label: { width: '250px' },
            }}
          >
            <Descriptions.Item label={t('content.full_name')}>{patientName}</Descriptions.Item>
            <Descriptions.Item label={t('content.email')}>{patientEmail}</Descriptions.Item>
            <Descriptions.Item label={t('content.phone_number')}>{patientPhoneNumber}</Descriptions.Item>
            <Descriptions.Item label={t('content.birth_date')}>{patientBirthDate}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  )

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={isEditing ? t('content.edit_appointment') : t('content.appointment_information')} blockAntModalBodyVerticalScroll noFooter width={800}>
      <div className="modal-event">
        <Form
          form={form}
          onFinish={handleUpdate}
          initialValues={{ start: dayjs(event?.start), end: dayjs(event?.end), details: event?.extendedProps.details ?? '', calendarItemTypeId: event?.extendedProps.calendarItemTypeId ?? '' }}
          layout="vertical"
          style={{ width: '100%', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}
        >
          {isEditing ? (
            <>
              <Form.Item name="start" label={t('content.start_hour')} rules={[{ required: true }]}>
                <DatePicker showTime format="MMM D, YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="end" label={t('content.end_hour')} rules={[{ required: true }]}>
                <DatePicker showTime format="MMM D, YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="calendarItemTypeId" label={t('content.procedure')}>
                <Select disabled={isTimeOff}>
                  {(procedures ?? [])
                    .filter((proc) => proc.defaultCalendarItemType)
                    .map((type) => (
                      <Select.Option key={type.id} value={type.id}>
                        {type.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
              <Form.Item name="details" label={t('content.details')}>
                <TextArea rows={4} />
              </Form.Item>
            </>
          ) : (
            renderDisplayMode()
          )}
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {isEditing ? (
              <>
                <Button key="cancel" onClick={handleCancel}>
                  {t('content.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" key="save">
                  {t('content.save')}
                </Button>
              </>
            ) : (
              <>
                <Button key="delete" danger onClick={() => setShowDeleteAppointmentModal(true)}>
                  {t('content.delete')}
                </Button>
                <Button key="modify" type="primary" onClick={handleModify}>
                  {t('content.modify')}
                </Button>
              </>
            )}
          </div>
        </Form>
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
              onYesClick={handleDelete}
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

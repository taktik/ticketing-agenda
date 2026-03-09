import { InfoCircleOutlined } from '@ant-design/icons'
import { CodeStub, DecryptedCalendarItem, HealthcareParty } from '@icure/cardinal-sdk'
import { Alert, Button, DatePicker, Form, Select, Space } from 'antd'
import { Dayjs } from 'dayjs'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { useHierarchyContext } from '../../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../../core/contexts/PermissionContext'
import { CustomModal } from '../../common/CustomModal'
import { dayjsToYYYYMMDDHHmmss } from '../../common/helpers'
import { CalendarItemTag } from '../../../core/api/fetchType'
import './index.css'

const { RangePicker } = DatePicker

export const splitDateRangeIntoWeeks = (start: Dayjs, end: Dayjs): { start: Dayjs; end: Dayjs }[] => {
  const currentChunkStart = start.startOf('day')
  if (currentChunkStart.isSameOrAfter(end)) return []

  const startOfNextWeek = currentChunkStart.endOf('week').add(1, 'day').startOf('day')
  const firstChunkEnd = startOfNextWeek.isAfter(end) ? end : startOfNextWeek
  const firstChunk = { start: currentChunkStart, end: firstChunkEnd }
  const remainingChunks = splitDateRangeIntoWeeks(firstChunkEnd, end)
  return [firstChunk, ...remainingChunks]
}

interface AbsenceFormData {
  site: string
  service: string
  period: [Dayjs, Dayjs]
  reason: string
}

interface CreateTimeOffProps {
  isVisible: boolean
  onClose: () => void
  sites: HealthcareParty[] | undefined
  showMessageFeedback: (type: 'loading' | 'success' | 'error', content: string) => void
  openNotification: (type: 'error', message: string, description: string) => void
}

export const CreateTimeOff = ({ isVisible, onClose, sites, showMessageFeedback, openNotification }: CreateTimeOffProps) => {
  const { t } = useTranslation()
  const [form] = Form.useForm<AbsenceFormData>()

  const watchedSite = Form.useWatch('site', form)
  const watchedService = Form.useWatch('service', form)

  const { attachedServices } = usePermissionContext()
  const { adminRoot, agendasBySiteId } = useHierarchyContext()

  const availableServices = useMemo(() => {
    if (!watchedSite) return []

    const siteAgendas = agendasBySiteId.get(watchedSite) || []

    if (attachedServices?.length) {
      return siteAgendas.filter((a) => attachedServices.includes(a.id))
    }
    return siteAgendas
  }, [watchedSite, agendasBySiteId, attachedServices])

  const [createUpdateEvent, { isLoading: isCreateUpdateEventLoading }] = useCreateUpdateCalendarItemMutation()

  const handleSubmit = useCallback(
    async (values: AbsenceFormData) => {
      try {
        if (!adminRoot?.id) {
          throw new Error('Required root information missing. Cannot proceed.')
        }
        const startTime = values.period[0]
        const endTime = values.period[1]

        const weeklyChunks = splitDateRangeIntoWeeks(startTime, endTime)

        const timeOffTag = new CodeStub({
          id: CalendarItemTag.TIMEOFF,
          code: CalendarItemTag.TIMEOFF,
          type: CalendarItemTag.TIMEOFF,
          version: '1',
        })

        const eventsCreationPromises = weeklyChunks.map(async (chunk) => {
          const newEvent = new DecryptedCalendarItem({
            id: v4(),
            title: values.reason,
            startTime: dayjsToYYYYMMDDHHmmss(chunk.start),
            endTime: dayjsToYYYYMMDDHHmmss(chunk.end),
            duration: chunk.end.diff(chunk.start, 'minute'),
            agendaId: values.service,
            tags: [timeOffTag],
          })

          return createUpdateEvent({
            calendarItem: newEvent,
            patient: undefined,
            delegates: {
              adminRootId: adminRoot.id,
              siteRootId: values.site,
            },
          }).unwrap()
        })

        await Promise.all(eventsCreationPromises)

        showMessageFeedback('success', t('notification.appointment_saved'))
        onClose()
        form.resetFields()
      } catch (error) {
        openNotification('error', t('notification.appointment_save_failed'), t('notification.appointment_save_error'))
      }
    },
    [createUpdateEvent, showMessageFeedback, openNotification, adminRoot, onClose, form, t],
  )

  const handleCancel = useCallback(() => {
    form.resetFields()
    onClose()
  }, [form, onClose])

  return (
    <CustomModal
      isVisible={isVisible}
      handleClose={onClose}
      title={t('content.absence_management')}
      blockAntModalBodyVerticalScroll
      customFooter={[
        <Button key="back" onClick={handleCancel} loading={isCreateUpdateEventLoading} disabled={isCreateUpdateEventLoading}>
          {t('content.cancel')}
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()} loading={isCreateUpdateEventLoading} disabled={isCreateUpdateEventLoading}>
          {t('content.save')}
        </Button>,
      ]}
      width={1100}
    >
      <Space direction="vertical" style={{ width: '100%', padding: '1.5rem' }}>
        <Alert message={t('content.absence_warning_details')} type="info" showIcon icon={<InfoCircleOutlined />} />

        <Form form={form} layout="vertical" onFinish={handleSubmit} name="absence_form" className="createOffTime-form">
          <Form.Item name="site" label={t('content.site')} rules={[{ required: true }]}>
            <Select
              showSearch
              allowClear
              placeholder={t('content.select_site')}
              options={(sites ?? []).map((site) => ({
                value: site.id,
                label: site.name,
              }))}
            />
          </Form.Item>

          <Form.Item name="service" label={t('content.service')} rules={[{ required: true }]} tooltip={watchedSite ? null : t('content.select_site_for_service')}>
            <Select
              showSearch
              placeholder={t('content.select_service')}
              optionFilterProp="label"
              allowClear
              disabled={!watchedSite}
              options={availableServices.map((agenda) => ({
                label: agenda.name,
                value: agenda.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="period" label={t('content.absence_period')} rules={[{ required: true }]} tooltip={watchedService ? null : t('content.select_service_for_period')}>
            <RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder={[t('content.start'), t('content.end')]} disabled={!watchedService} allowEmpty />
          </Form.Item>

          <Form.Item name="reason" label={t('content.reason')} rules={[{ required: true }]} tooltip={watchedService ? null : t('content.select_service_for_reason')}>
            <Select
              placeholder={t('content.select_reason')}
              allowClear
              disabled={!watchedService}
              options={[
                { value: 'Congé', label: t('content.reason_leave') },
                { value: 'Maladie', label: t('content.reason_sickness') },
                { value: 'Formation', label: t('content.reason_training') },
                { value: 'Autre', label: t('content.reason_other') },
              ]}
            />
          </Form.Item>
        </Form>
      </Space>
    </CustomModal>
  )
}

import { InfoCircleOutlined } from '@ant-design/icons'
import { CodeStub, DecryptedCalendarItem, HealthcareParty } from '@icure/cardinal-sdk'
import { Alert, Button, DatePicker, Form, Select, Space } from 'antd'
import { Dayjs } from 'dayjs'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useGetAgendasByAuthorId } from '../../../core/api/agendaApi'
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { usePermissions } from '../../../core/hooks/usePermissions'
import { useRoot } from '../../../core/hooks/useRoot'
import { CustomModal } from '../../common/CustomModal'
import { dayjsToYYYYMMDDHHmmss } from '../../common/helpers'
import './index.css'
const { RangePicker } = DatePicker

/**
 * Splits a date range into smaller chunks, with each chunk ending at the end of a week.
 * @param start The start of the entire date range.
 * @param end The end of the entire date range.
 * @returns An array of objects, each with a `start` and `end` Dayjs object.
 */
export const splitDateRangeIntoWeeks = (start: Dayjs, end: Dayjs): { start: Dayjs; end: Dayjs }[] => {
  const currentChunkStart = start.startOf('day')

  if (currentChunkStart.isSameOrAfter(end)) {
    return []
  }

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

  const { attachedService } = usePermissions()
  const { adminRoot } = useRoot()

  const { data: services, isLoading: isAgendasLoading } = useGetAgendasByAuthorId({ skip: !watchedSite, authorId: watchedSite ?? '' })

  const sortedServices = useMemo(() => {
    const baseServices = services ?? []

    const filteredServices = attachedService ? baseServices.filter((service) => service.id === attachedService) : baseServices

    return [...filteredServices].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services, attachedService])

  const [createUpdateEvent, { isLoading: isCreateUpdateEventLoading }] = useCreateUpdateCalendarItemMutation()

  const handleSubmit = useCallback(
    async (values: AbsenceFormData) => {
      try {
        if (!adminRoot?.id) {
          throw new Error('Required root information missing. Cannot proceed.')
        }
        const startTime = values.period[0]
        const endTime = values.period[1]

        // 1. Split the total period into weekly chunks
        // We do that because we can't fetc properly events spanning several weeks.
        const weeklyChunks = splitDateRangeIntoWeeks(startTime, endTime)

        const timeOffTag = new CodeStub({
          id: `TIMEOFF|1`,
          code: 'TIMEOFF',
          type: 'TIMEOFF',
          version: '1',
        })

        // 2. Create an array of creation promises, one for each chunk
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
            delegates: [adminRoot.id, values.site],
          }).unwrap()
        })

        await Promise.all(eventsCreationPromises)

        showMessageFeedback('success', t('notification.appointment_saved'))
      } catch (error) {
        openNotification('error', t('notification.appointment_save_failed'), t('notification.appointment_save_error'))
      } finally {
        onClose()
      }
    },
    [createUpdateEvent, showMessageFeedback, openNotification, adminRoot, onClose],
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
              loading={isAgendasLoading}
              filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
              disabled={!watchedSite}
              options={(sortedServices ?? []).map((agenda) => ({
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

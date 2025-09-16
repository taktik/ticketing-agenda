import { InfoCircleOutlined } from '@ant-design/icons'
import { CodeStub, DecryptedCalendarItem, HealthcareParty } from '@icure/cardinal-sdk'
import { Alert, Button, DatePicker, Form, Select, Space, Tooltip, Typography } from 'antd'
import { Dayjs } from 'dayjs'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useGetAgendaByAuthorId } from '../../../core/api/agendaApi'
import { useCreateUpdateCalendarItemMutation } from '../../../core/api/calendarItemApi'
import { RootHcpType } from '../../../core/api/fetchType'
import { useGetRootHealthcareParty } from '../../../core/api/healthcarePartyApi'
import { CustomModal } from '../../common/CustomModal'
import { dayjsToYYYYMMDDHHmmss } from '../../common/helpers'
import './index.css'
const { Title, Text } = Typography
const { RangePicker } = DatePicker

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

  const { data: allAgendas, isLoading: isAgendasLoading } = useGetAgendaByAuthorId({ skip: !watchedSite, authorId: watchedSite ?? '' })
  const { data: adminRoot, isLoading: isAdminRootLoading } = useGetRootHealthcareParty({ skip: false, rootType: RootHcpType.ADMIN_ROOT })

  const [createUpdateEvent, { isLoading: isCreateUpdateEventLoading }] = useCreateUpdateCalendarItemMutation()

  const handleSubmit = useCallback(
    async (values: AbsenceFormData) => {
      try {
        if (!adminRoot?.id) {
          throw new Error('Required root information missing. Cannot proceed.')
        }
        const startTime = values.period[0]
        const endTime = values.period[1]

        const tagType = 'TIMEOFF'
        const tagVersion = '1'

        const timeOffTag = new CodeStub({
          id: `${tagType}|${tagVersion}`,
          code: tagType,
          type: tagType,
          version: tagVersion,
        })

        const newEvent = new DecryptedCalendarItem({
          id: v4(),
          title: values.reason,
          duration: endTime.diff(startTime, 'minute'),
          agendaId: values.service,
          startTime: dayjsToYYYYMMDDHHmmss(startTime),
          endTime: dayjsToYYYYMMDDHHmmss(endTime),
          tags: [timeOffTag],
        })

        await createUpdateEvent({ calendarItem: newEvent, patient: undefined, delegates: [adminRoot.id, values.site] }).unwrap()
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
              placeholder={t('content.select_site')}
              options={(sites ?? []).map((site) => ({
                value: site.id,
                label: site.name,
              }))}
            />
          </Form.Item>
          <Tooltip title={watchedSite ? null : t('content.select_site_for_service')}>
            <Form.Item name="service" label={t('content.service')} rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder={t('content.select_service')}
                optionFilterProp="label"
                loading={isAgendasLoading}
                filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
                disabled={!watchedSite}
                options={(allAgendas ?? []).map((agenda) => ({
                  label: agenda.name,
                  value: agenda.id,
                }))}
              />
            </Form.Item>
          </Tooltip>
          <Tooltip title={watchedService ? null : t('content.select_service_for_period')}>
            <Form.Item name="period" label={t('content.absence_period')} rules={[{ required: true }]}>
              <RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder={[t('content.start'), t('content.end')]} disabled={!watchedService} />
            </Form.Item>
          </Tooltip>

          <Tooltip title={watchedService ? null : t('content.select_service_for_reason')}>
            <Form.Item name="reason" label={t('content.reason')} rules={[{ required: true }]}>
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
          </Tooltip>
        </Form>
      </Space>
    </CustomModal>
  )
}

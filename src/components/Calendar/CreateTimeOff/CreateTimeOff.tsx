import { InfoCircleOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Alert, Button, DatePicker, Form, Select, Space, Typography } from 'antd'
import { Dayjs } from 'dayjs'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAgendaByAuthorId } from '../../../core/api/agendaApi'
import { CustomModal } from '../../common/CustomModal'
import './index.css'
const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface AbsenceFormData {
  site: string
  services: string
  period: [Dayjs, Dayjs]
  reason: string
}

interface CreateTimeOffProps {
  isVisible: boolean
  onClose: () => void
  sites: HealthcareParty[] | undefined
}

export const CreateTimeOff = ({ isVisible, onClose, sites }: CreateTimeOffProps) => {
  const { t } = useTranslation()
  const [form] = Form.useForm<AbsenceFormData>()

  const watchedSite = Form.useWatch('site', form)

  const { data: allAgendas, isLoading: isAgendasLoading } = useGetAgendaByAuthorId({ skip: !watchedSite, authorId: watchedSite ?? '' })

  const agendaOptions = useMemo(
    () =>
      allAgendas.map((agenda) => ({
        label: agenda.name,
        value: agenda.id,
      })),
    [allAgendas],
  )

  const handleSubmit = useCallback(async (values: AbsenceFormData) => {}, [])

  const handleCancel = useCallback(() => {
    form.resetFields()
    onClose()
  }, [form, onClose])

  return (
    <CustomModal
      isVisible={isVisible}
      handleClose={onClose}
      title={'Gestion des absences'}
      blockAntModalBodyVerticalScroll
      customFooter={[
        <Button key="back" onClick={handleCancel}>
          Annuler
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          Confirmer et bloquer
        </Button>,
      ]}
      width={1100}
    >
      <Space direction="vertical" style={{ width: '100%', padding: '1.5rem' }}>
        <Alert message="Cette action bloquera la prise de rendez-vous pour le service et la période sélectionnés." type="info" showIcon icon={<InfoCircleOutlined />} />

        <Form form={form} layout="vertical" onFinish={handleSubmit} name="absence_form" className="createOffTime-form">
          <Form.Item name="site" label={t('content.site')} rules={[{ required: true, message: t('content.please_select_site') }]}>
            <Select
              showSearch
              placeholder={t('content.select_site')}
              options={(sites ?? []).map((site) => ({
                value: site.id,
                label: site.name,
              }))}
            />
          </Form.Item>

          <Form.Item name="service" label={t('content.service')} rules={[{ required: true, message: 'Veuillez sélectionner au moins un service.' }]}>
            <Select
              allowClear
              showSearch
              placeholder={t('content.select_service')}
              optionFilterProp="label"
              labelInValue
              loading={isAgendasLoading}
              filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
              options={agendaOptions}
              disabled={!watchedSite}
            />
          </Form.Item>

          <Form.Item name="period" label="Période d'absence" rules={[{ required: true, message: 'Veuillez sélectionner une période.' }]}>
            <RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder={['Début', 'Fin']} />
          </Form.Item>

          <Form.Item name="reason" label="Motif">
            <Select
              placeholder="Sélectionnez un motif"
              allowClear
              options={[
                { value: 'leave', label: 'Congé' },
                { value: 'sickness', label: 'Maladie' },
                { value: 'training', label: 'Formation' },
                { value: 'other', label: 'Autre' },
              ]}
            />
          </Form.Item>
        </Form>
      </Space>
    </CustomModal>
  )
}

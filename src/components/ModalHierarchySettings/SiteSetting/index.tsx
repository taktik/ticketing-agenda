import { DeleteOutlined, EditOutlined, EllipsisOutlined, PlusOutlined } from '@ant-design/icons'
import { AddressType, Agenda, AgendaSlottingAlgorithm, CalendarItemType, DecryptedAddress, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, ConfigProvider, Dropdown, Form, Input, MenuProps, message, Modal, Space, Typography } from 'antd'
import { ReactElement, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { agendaApiRtk, useCreateUpdateAgendaMutation } from '../../../core/api/agendaApi'
import { useCreateUpdateHealthcarePartyMutation } from '../../../core/api/healthcarePartyApi'
import { useHierarchyContext } from '../../../core/contexts/HierarchyContext'
import { EditableSiteInfo, SiteInfoFormValues } from '../../common/EditableSiteInfo'
import { createStringProperty, translationPropertyId } from '../../common/helpers'
import { EntityType, PropertyId } from '../../../core/api/fetchType'
import { useAppDispatch } from '../../../core/hooks'
import { useNotificationHelper } from '../../../core/hooks/useNotificationHelper'
import './index.css'

interface SiteSettingProps {
  site: HealthcareParty
  services: Agenda[]
  isSitesLoading: boolean
  onSelectService: (serviceId: string) => void
  onDeleteSite: (site: HealthcareParty) => Promise<void>
}

type ServiceWithProceduresTuple = [Agenda, CalendarItemType[]]

export const SiteSetting = ({ site, services, isSitesLoading, onSelectService, onDeleteSite }: SiteSettingProps): ReactElement => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { calendarItemTypesByAgendaId } = useHierarchyContext()

  const [showEditableSite, setShowEditableSite] = useState<boolean>(false)
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showCreateServiceModal, setShowCreateServiceModal] = useState(false)
  const [createServiceForm] = Form.useForm<{ name: string }>()

  const serviceAndProcedures: ServiceWithProceduresTuple[] = useMemo(() => {
    return services.map((service): ServiceWithProceduresTuple => {
      const allProcedures = calendarItemTypesByAgendaId.get(service.id) || []
      const defaultProcedures = allProcedures.filter((p) => p.defaultCalendarItemType === true)
      return [service, defaultProcedures]
    })
  }, [services, calendarItemTypesByAgendaId])

  const [createUpdateAgendaMutation, { isLoading: isCreateUpdateAgendaLoading }] = useCreateUpdateAgendaMutation()
  const [createUpdateSite, { isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()

  const mutationIsLoading = isCreateUpdateAgendaLoading || isCreateUpdateSiteLoading

  const { openNotification, notificationContextHolder } = useNotificationHelper()
  const [messageApi, messageContextHolder] = message.useMessage()

  const onSiteInfoSave = useCallback(
    async (formValues: SiteInfoFormValues) => {
      try {
        const updatedPublicProperties = [
          ...(site.publicProperties || []).filter((p) => p.id !== PropertyId.SITE_LOCATION && p.id !== PropertyId.SITE_QBETTER_LOCATION_ID),
          createStringProperty(PropertyId.SITE_LOCATION, formValues.location),
          createStringProperty(PropertyId.SITE_QBETTER_LOCATION_ID, formValues.qBetterLocationId),
        ]

        await createUpdateSite(
          new HealthcareParty({
            ...site,
            name: formValues.name,
            firstName: formValues.name,
            lastName: formValues.name,
            publicProperties: updatedPublicProperties,
            addresses: [new DecryptedAddress({ street: formValues.location, addressType: AddressType.Hq })],
          }),
        ).unwrap()

        messageApi.success(t('notification.site_saved'))
      } catch (error) {
        openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
      } finally {
        setShowEditableSite(false)
      }
    },
    [site, createUpdateSite, messageApi, openNotification, t],
  )

  const handleCreateNewService = useCallback(async () => {
    try {
      const values = await createServiceForm.validateFields()

      const properties = [
        createStringProperty(PropertyId.SERVICE_PARENTID, site.id),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'FR'), values.name),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'NL'), ''),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'EN'), ''),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'DE'), ''),
      ]

      const createdAgenda = await createUpdateAgendaMutation(
        new Agenda({
          author: site.id,
          zoneId: 'Europe/Brussels',
          slottingAlgorithm: new AgendaSlottingAlgorithm.FixedIntervals({ intervalMinutes: 5 }),
          name: values.name,
          properties,
        }),
      ).unwrap()

      if (!createdAgenda) throw new Error('Service creation failed')

      dispatch(
        agendaApiRtk.util.updateQueryData('getAgendas', undefined, (draft) => {
          if (draft) draft.push(createdAgenda)
        }),
      )

      messageApi.success(t('notification.service_saved'))
      setShowCreateServiceModal(false)
      createServiceForm.resetFields()
      onSelectService(createdAgenda.id)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
    }
  }, [site, createServiceForm, createUpdateAgendaMutation, dispatch, onSelectService, messageApi, openNotification, t])

  const siteActionItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: t('content.edit'),
      icon: <EditOutlined />,
      onClick: () => setShowEditableSite(true),
    },
    {
      key: 'delete',
      label: t('content.delete_site'),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => setShowDeleteSiteModal(true),
    },
  ]

  return (
    <div className="site-root">
      {notificationContextHolder}
      {messageContextHolder}

      <div className="site-header">
        <div className="site-title">
          {showEditableSite ? (
            <EditableSiteInfo hcp={site} setShowEditableSite={setShowEditableSite} onSave={onSiteInfoSave} />
          ) : (
            <Space align="center">
              <Typography.Title level={2}>{site.name}</Typography.Title>
              <Dropdown menu={{ items: siteActionItems }} trigger={['click']}>
                <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px' }} />} shape="circle" size="large" />
              </Dropdown>
            </Space>
          )}
          <Typography.Text type="secondary">{t('content.select_service_to_configure_procedures')}</Typography.Text>
        </div>

        <Button type="dashed" icon={<PlusOutlined />} onClick={() => setShowCreateServiceModal(true)} disabled={isSitesLoading || mutationIsLoading}>
          {t('content.add_service')}
        </Button>
      </div>

      <div className="site-grid">
        {serviceAndProcedures.map(([service, procedures]) => (
          <Card key={service.id} hoverable onClick={() => onSelectService(service.id)} className="site-card">
            <Card.Meta title={service.name} description={procedures.length !== 1 ? `${procedures.length} ${t('content.procedures')}` : `${procedures.length} ${t('content.procedure')}`} />
          </Card>
        ))}
      </div>

      <ConfigProvider modal={{ styles: {} }}>
        <Modal
          open={showCreateServiceModal}
          title={t('content.add_service')}
          onCancel={() => {
            setShowCreateServiceModal(false)
            createServiceForm.resetFields()
          }}
          onOk={handleCreateNewService}
          okText={t('content.confirm')}
          cancelText={t('content.cancel')}
          confirmLoading={isCreateUpdateAgendaLoading}
        >
          <Form form={createServiceForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="name" label={t('content.service_name')} rules={[{ required: true, message: t('validation.name_required') }]}>
              <Input autoFocus />
            </Form.Item>
          </Form>
        </Modal>
      </ConfigProvider>

      {showDeleteSiteModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_site_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_site_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
            onYesClick={async () => {
              await onDeleteSite(site)
              setShowDeleteSiteModal(false)
            }}
            onNoClick={() => setShowDeleteSiteModal(false)}
            isVisible={showDeleteSiteModal}
            mode="danger"
          />,
          document.body,
        )}
    </div>
  )
}

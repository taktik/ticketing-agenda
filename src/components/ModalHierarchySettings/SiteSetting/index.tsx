import { DeleteOutlined, EditOutlined, EllipsisOutlined } from '@ant-design/icons'
import { AddressType, Agenda, AgendaSlottingAlgorithm, CalendarItemType, CodeStub, DecryptedAddress, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Dropdown, MenuProps, message, notification, Space, Typography } from 'antd'
import { ReactElement, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { SettingContext } from '../../../contexts/SettingContext'
import { useCreateUpdateAgendaMutation, useGetAllAgendaByAuthorIds } from '../../../core/api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { useCreateUpdateHealthcarePartyMutation, useRecursiveHcpDeletion } from '../../../core/api/healthcarePartyApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { EditableSiteInfo, SiteInfoFormValues } from '../../common/EditableSiteInfo'
import { ButtonStyleType, StyledButton } from '../../common/StyledButton'
import './index.css'

interface SiteSettingProps {
  site: HealthcareParty
  services: HealthcareParty[]
  handleSiteDelete: (site: HealthcareParty) => Promise<void>
}

type ServiceWithProceduresTuple = [HealthcareParty, CalendarItemType[]]

export const SiteSetting = ({ site, services, handleSiteDelete }: SiteSettingProps): ReactElement => {
  const { selectedKeyId, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showEditableSite, setShowEditableSite] = useState<boolean>(false)

  const [createUpdateAgendaMutation, { isError: isCreateUpdateAgendaError, isSuccess: isCreateUpdateAgendaSuccess, isLoading: isCreateUpdateAgendaLoading }] = useCreateUpdateAgendaMutation()
  const [createUpdateSite, { isError: isCreateUpdateSiteError, isSuccess: isCreateUpdateSiteSuccess, isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] = useCreateUpdateHealthcarePartyMutation()

  const siteActionItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: t('content.edit'),
      icon: <EditOutlined />,
      onClick: () => setShowEditableSite(true),
    },
    {
      key: 'delete',
      label: t('content.delete'),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => setShowDeleteSiteModal(true),
    },
  ]

  const onSiteInfoSave = async (formValues: SiteInfoFormValues) => {
    try {
      if (!site) throw new Error()
      await createUpdateSite(new HealthcareParty({ ...site, name: formValues.name, addresses: [new DecryptedAddress({ street: formValues.location, addressType: AddressType.Hq })] })).unwrap()
      showMessageFeedback('success', t('notification.site_saved'))
    } catch (error) {
      openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
    } finally {
      setShowEditableSite(false)
    }
  }

  const handleCreateNewService = async () => {
    try {
      const serviceHcp = new HealthcareParty({
        name: t('content.new_service'),
        descr: {
          FR: t('content.new_service'),
          NL: '',
          EN: '',
          DE: '',
        },
        parentId: selectedKeyId,
        id: v4(),
        public: true,
        tags: [new CodeStub({ id: 'SERVICE', code: 'SERVICE', context: 'SERVICE', type: 'SERVICE' })],
      })
      await createUpdateService({ ...serviceHcp }).unwrap()
      const algorithm = new AgendaSlottingAlgorithm.FixedIntervals({
        intervalMinutes: 5,
      })
      await createUpdateAgendaMutation(new Agenda({ author: serviceHcp.id, zoneId: 'Europe/Brussels', slottingAlgorithm: algorithm })).unwrap()
      showMessageFeedback('success', t('notification.service_saved'))
    } catch (error) {
      openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
    }
  }

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

  const servicesIds = useMemo(() => services?.map((service) => service.id), [services])
  const { data: allAgendas } = useGetAllAgendaByAuthorIds({ skip: !site || !services, authorIds: servicesIds })
  const agendaIds = useMemo(() => allAgendas?.map((agenda) => agenda.id), [allAgendas])

  const { data: allProcedures } = useGetCalendarItemTypesForMultipleAgendasQuery({ agendaIds: agendaIds }, { skip: !site || !agendaIds })
  const flatProceduresArray = useMemo(() => (allProcedures ?? []).flat(), [allProcedures])

  const serviceAndProcedures: ServiceWithProceduresTuple[] = services.map((service): ServiceWithProceduresTuple => {
    const serviceProcedures = flatProceduresArray.filter((procedure) => procedure.healthcarePartyId === service.id && procedure.defaultCalendarItemType === true)
    return [service, serviceProcedures]
  })

  return (
    <div className="site-root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="site-header">
        <div className="site-title">
          <Space align="center">
            {showEditableSite ? <EditableSiteInfo hcp={site} setShowEditableSite={setShowEditableSite} onSave={onSiteInfoSave} /> : <Typography.Title level={2}>{site.name}</Typography.Title>}
            {showEditableSite ? null : (
              <Dropdown menu={{ items: siteActionItems }} trigger={['click']}>
                <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px', fontWeight: 'bold' }} />} shape="circle" size="large" />
              </Dropdown>
            )}
          </Space>
          <Typography.Text type="secondary">{t('content.select_service_to_configure_procedures')}</Typography.Text>
        </div>
        <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={() => handleCreateNewService()} style={{ alignSelf: 'baseline' }}>
          {t('content.add_service')}
        </StyledButton>
      </div>

      <div className="site-grid">
        {serviceAndProcedures.map((service) => (
          <Card key={service[0].id} hoverable onClick={() => setSelectedKey(`service-${service[0].id}`)} className="site-card">
            <Card.Meta title={service[0].name} description={service[1].length && service[1].length > 1 ? `${service[1].length} ${t('content.procedures')}` : `${service[1].length} ${t('content.procedure')}`} />
          </Card>
        ))}
      </div>
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
            onYesClick={() => {
              handleSiteDelete(site)
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

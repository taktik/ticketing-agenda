import { AppstoreOutlined, BankOutlined, DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Agenda, AuthenticationMethod, CardinalBaseSdk, CardinalSdk, CodeStub, DecryptedPropertyStub, DecryptedTypedValue, HealthcareParty, StorageFacade, TypedValuesType, User } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, Layout, Menu, MenuProps, message, Modal } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import emptyIcon from '../../assets/empty.svg'
import { useDeleteAgendasMutation, useDeleteAgendaMutation } from '../../core/api/agendaApi'
import { useDeleteCalendarItemTypesMutation } from '../../core/api/calendarItemTypeApi'
import { APPLICATION_ID, ICURE_API_URL } from '../../constants'
import { HcpTag } from '../../core/api/fetchType'
import { healthcarePartyApiRtk, useCreateUpdateHealthcarePartyMutation, useDeleteHealthcarePartiesMutation } from '../../core/api/healthcarePartyApi'
import { PetraCareCryptoStrategies } from '../../core/services/auth.api'
import { useCreateUpdateUserMutation, useDeleteUserMutation, useGetTokenForUserMutation, useLazyGetUserByHcpIdsQuery } from '../../core/api/userApi'
import { useHierarchyContext } from '../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../core/contexts/PermissionContext'
import { useAppDispatch } from '../../core/hooks'
import { useNotificationHelper } from '../../core/hooks/useNotificationHelper'
import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.less'
import { ServiceSetting } from './ServiceSetting'
import { SiteSetting } from './SiteSetting'

interface ModalHierarchySettingsProps {
  isVisible: boolean
  onClose: () => void
  initialSiteId?: string
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalHierarchySettings = ({ isVisible, onClose, initialSiteId }: ModalHierarchySettingsProps): ReactElement => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { siteRoot, allSites, agendasBySiteId, calendarItemTypesByAgendaId, agendaMap, isLoading: isDataLoading } = useHierarchyContext()
  const { isAdminLevel, attachedSites, attachedServices } = usePermissionContext()
  const [selectedKey, setSelectedKey] = useState<string>('default')
  const [openKeys, setOpenKeys] = useState<string[]>([])

  const [deleteAgenda, { isLoading: isDeleteAgendaLoading }] = useDeleteAgendaMutation()
  const [deleteAgendas] = useDeleteAgendasMutation()
  const [deleteCalendarItemTypes, { isLoading: isDeleteCalendarItemTypesLoading }] = useDeleteCalendarItemTypesMutation()
  const [createUpdateHealthcareParty] = useCreateUpdateHealthcarePartyMutation()
  const [deleteHealthcareParties] = useDeleteHealthcarePartiesMutation()
  const [createUpdateUser] = useCreateUpdateUserMutation()
  const [deleteUser] = useDeleteUserMutation()
  const [getUserByHcpIds] = useLazyGetUserByHcpIdsQuery()
  const [getTokenForUser] = useGetTokenForUserMutation()

  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false)
  const [isCreatingSite, setIsCreatingSite] = useState(false)
  const [isDeletingSite, setIsDeletingSite] = useState(false)
  const [createSiteForm] = Form.useForm<{ name: string }>()

  const { openNotification, notificationContextHolder } = useNotificationHelper()
  const [messageApi, messageContextHolder] = message.useMessage()

  const displayableSites = useMemo(() => {
    if (!isAdminLevel && attachedSites?.length) {
      return allSites.filter((site) => attachedSites.includes(site.id))
    }
    return allSites
  }, [allSites, attachedSites, isAdminLevel])

  useEffect(() => {
    if (isVisible && selectedKey === 'default') {
      if (initialSiteId) {
        setSelectedKey(`site-${initialSiteId}`)
        setOpenKeys([`site-${initialSiteId}`])
      } else if (displayableSites.length > 0) {
        setSelectedKey(`site-${displayableSites[0].id}`)
        setOpenKeys([`site-${displayableSites[0].id}`])
      }
    }
  }, [isVisible, initialSiteId, displayableSites])

  const menuItems: MenuItem[] = useMemo(() => {
    return displayableSites.map((site) => {
      const siteAgendas = agendasBySiteId.get(site.id) || []
      const visibleAgendas = !isAdminLevel && attachedServices?.length ? siteAgendas.filter((a) => attachedServices.includes(a.id)) : siteAgendas

      const children: MenuItem[] = visibleAgendas.map((service) => ({
        key: `service-${service.id}`,
        label: service.name,
        icon: <AppstoreOutlined />,
      }))

      const isSelected = selectedKey === `site-${site.id}`
      const isOpen = openKeys.includes(`site-${site.id}`)

      const label = (
        <div className={isSelected ? 'site-label-white' : 'site-label-black'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{site.name}</span>
          {isOpen ? <DownOutlined style={{ color: isSelected ? '#fff' : 'black' }} /> : <RightOutlined style={{ color: isSelected ? '#fff' : 'black' }} />}
        </div>
      )

      return {
        key: `site-${site.id}`,
        label,
        style: isSelected ? { backgroundColor: '#e30613' } : { backgroundColor: 'white' },
        icon: <BankOutlined className={isSelected ? 'site-label-white' : 'site-label-black'} />,
        children,
      }
    })
  }, [displayableSites, agendasBySiteId, attachedServices, isAdminLevel, selectedKey, openKeys])

  const onServiceClick: MenuProps['onClick'] = useCallback(({ key }: { key: string }) => {
    setSelectedKey((prev) => (prev === key ? 'default' : key))
  }, [])

  const onSiteClick = useCallback(
    (keys: string[]) => {
      if (keys.length > openKeys.length) {
        const openedKey = keys.find((key) => !openKeys.includes(key))
        if (openedKey) setSelectedKey(openedKey)
      } else {
        setSelectedKey('default')
      }
      setOpenKeys(keys)
    },
    [openKeys],
  )

  const handleCreateSite = useCallback(async () => {
    try {
      const values = await createSiteForm.validateFields()
      setIsCreatingSite(true)

      const hcpId = v4()
      const siteHcp = new HealthcareParty({
        id: hcpId,
        name: values.name,
        firstName: values.name,
        lastName: values.name,
        parentId: siteRoot?.id,
        public: true,
        tags: [new CodeStub({ id: HcpTag.SITE, code: HcpTag.SITE, type: HcpTag.SITE, version: '1' })],
        publicProperties: [new DecryptedPropertyStub({ id: HcpTag.SITE, typedValue: new DecryptedTypedValue({ type: TypedValuesType.String, stringValue: HcpTag.SITE }) })],
      })
      const createdHcp = await createUpdateHealthcareParty(siteHcp).unwrap()
      if (!createdHcp) throw new Error('HCP creation failed')

      let createdUser: User | undefined
      let siteFullSdk: CardinalSdk | undefined
      try {
        createdUser = await createUpdateUser(new User({ name: values.name, email: `site-${hcpId}@ticketing.internal`, healthcarePartyId: hcpId })).unwrap()
        if (!createdUser) throw new Error('User creation failed')

        // Authenticate as the new site user to trigger RSA key pair generation and recovery key storage.
        const longToken = await getTokenForUser(createdUser.id).unwrap()
        if (!longToken) throw new Error('Could not generate token for site user')
        const siteBaseSdk = await CardinalBaseSdk.initialize(APPLICATION_ID, ICURE_API_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(createdUser.id, longToken), {
          encryptedFields: { calendarItem: ['details', 'patientId', 'phoneNumber', 'address', 'addressText', 'meetingTags[].*', 'flowItem'] },
        })
        siteFullSdk = await siteBaseSdk.toFullSdk(StorageFacade.usingBrowserLocalStorage(), {
          useHierarchicalDataOwners: true,
          cryptoStrategies: new PetraCareCryptoStrategies(() => siteBaseSdk.auth.getBearerToken()),
        })
      } catch (keyInitError) {
        if (createdUser)
          await deleteUser(createdUser)
            .unwrap()
            .catch(() => {})
        await deleteHealthcareParties([createdHcp])
          .unwrap()
          .catch(() => {})
        throw keyInitError
      } finally {
        siteFullSdk?.close()
      }

      messageApi.success(t('notification.site_created'))
      setShowCreateSiteModal(false)
      createSiteForm.resetFields()
      setSelectedKey(`site-${hcpId}`)
      setOpenKeys([`site-${hcpId}`])
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return // form validation error
      openNotification('error', t('notification.site_create_failed'), t('notification.site_create_error'))
    } finally {
      setIsCreatingSite(false)
    }
  }, [createSiteForm, siteRoot, createUpdateHealthcareParty, createUpdateUser, getTokenForUser, deleteUser, deleteHealthcareParties, messageApi, openNotification, t])

  const handleDeleteSite = useCallback(
    async (site: HealthcareParty) => {
      try {
        setIsDeletingSite(true)

        const siteAgendas = agendasBySiteId.get(site.id) || []
        const allTypes = siteAgendas.flatMap((a) => calendarItemTypesByAgendaId.get(a.id) || [])

        if (allTypes.length > 0) {
          await deleteCalendarItemTypes(allTypes).unwrap()
        }
        if (siteAgendas.length > 0) {
          await deleteAgendas(siteAgendas).unwrap()
        }

        const users = await getUserByHcpIds([site.id]).unwrap()
        if (users?.[0]) {
          await deleteUser(users[0]).unwrap()
        }

        await deleteHealthcareParties([site]).unwrap()
        dispatch(healthcarePartyApiRtk.util.updateQueryData('getHealthcarePartyByTag', HcpTag.SITE, (draft) => draft?.filter((hcp) => hcp.id !== site.id)))

        messageApi.success(t('notification.site_deleted'))
        setSelectedKey('default')
        setOpenKeys([])
      } catch {
        openNotification('error', t('notification.site_delete_failed'), t('notification.site_delete_error'))
      } finally {
        setIsDeletingSite(false)
      }
    },
    [agendasBySiteId, calendarItemTypesByAgendaId, deleteCalendarItemTypes, deleteAgendas, getUserByHcpIds, deleteUser, deleteHealthcareParties, dispatch, messageApi, openNotification, t],
  )

  const handleDeleteService = useCallback(
    async (service: Agenda) => {
      try {
        if (!service) throw new Error('No service selected')

        const existingTypes = calendarItemTypesByAgendaId.get(service.id) || []

        if (existingTypes.length > 0) {
          await deleteCalendarItemTypes(existingTypes).unwrap()
        }

        await deleteAgenda(service).unwrap()

        messageApi.success(t('notification.service_deleted'))
        setSelectedKey(`site-${service.author}`)
      } catch (error) {
        openNotification('error', t('notification.service_delete_failed'), t('notification.service_delete_error'))
      }
    },
    [calendarItemTypesByAgendaId, deleteCalendarItemTypes, deleteAgenda, messageApi, openNotification, t],
  )

  const settingContent = useMemo(() => {
    const match = selectedKey?.match(/^(site|service)-(.+)$/)
    const type = match?.[1]
    const id = match?.[2]

    if (!type || !id) {
      return <Empty image={emptyIcon} description={t('content.select_site_or_service_to_start')} className="modal-settings-empty" />
    }

    if (type === 'site') {
      const matchingSite = displayableSites.find((site) => site.id === id)
      if (!matchingSite) return <div>{t('content.site_not_found')}</div>
      const servicesOfThisSite = agendasBySiteId.get(id) || []
      return (
        <SiteSetting
          key={matchingSite.id}
          site={matchingSite}
          services={servicesOfThisSite}
          isSitesLoading={isDataLoading || isDeletingSite}
          onSelectService={(serviceId) => setSelectedKey(`service-${serviceId}`)}
          onDeleteSite={handleDeleteSite}
        />
      )
    }

    if (type === 'service') {
      const matchingService = agendaMap.get(id)
      if (!matchingService) return <div>{t('content.service_not_found')}</div>

      return <ServiceSetting key={matchingService.id} service={matchingService} handleDeleteService={handleDeleteService} isServicesLoading={isDataLoading || isDeleteAgendaLoading || isDeleteCalendarItemTypesLoading} />
    }

    return <div>{t('content.select_site_or_service')}</div>
  }, [selectedKey, displayableSites, agendasBySiteId, agendaMap, handleDeleteService, handleDeleteSite, isDataLoading, isDeletingSite, isDeleteAgendaLoading, isDeleteCalendarItemTypesLoading, t])

  return (
    <>
      <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.hierarchical_organization')} blockAntModalBodyVerticalScroll noFooter width={1300}>
        <Layout className="modal-settings">
          {notificationContextHolder}
          {messageContextHolder}
          <Sider width={250} className="menu-sites-root">
            <div className="menu-sites">
              <div className="menu-sites-list">
                {isDataLoading ? <SpinLoader /> : <Menu mode="inline" items={menuItems} onClick={onServiceClick} onOpenChange={onSiteClick} selectedKeys={[selectedKey]} openKeys={openKeys} expandIcon={false} />}
              </div>
              {isAdminLevel && (
                <div className="sider-footer">
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => setShowCreateSiteModal(true)} style={{ width: '80%' }}>
                    {t('content.add_site')}
                  </Button>
                </div>
              )}
            </div>
          </Sider>
          <Layout>
            <Content className="selected-setting">{settingContent}</Content>
          </Layout>
        </Layout>
      </CustomModal>
      <Modal
        open={showCreateSiteModal}
        title={t('content.add_site')}
        onCancel={() => {
          setShowCreateSiteModal(false)
          createSiteForm.resetFields()
        }}
        onOk={handleCreateSite}
        okText={t('content.confirm')}
        cancelText={t('content.cancel')}
        confirmLoading={isCreatingSite}
      >
        <Form form={createSiteForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label={t('content.site_name')} rules={[{ required: true, message: t('validation.name_required') }]}>
            <Input autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

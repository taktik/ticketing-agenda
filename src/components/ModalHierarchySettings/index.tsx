import { AppstoreOutlined, BankOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { Agenda, HealthcareParty } from '@icure/cardinal-sdk'
import { Empty, Layout, Menu, MenuProps, message, notification } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import emptyIcon from '../../assets/empty.svg'
import { SettingContext } from '../../contexts/SettingContext'
import { useDeleteAgendaMutation, useDeleteAgendasMutation, useGetAllAgendaByAuthorIds } from '../../core/api/agendaApi'
import { useDeleteCalendarItemTypesMutation, useLazyGetCalendarItemTypesForMultipleAgendasQuery, useLazyGetCalendarItemTypesQuery } from '../../core/api/calendarItemTypeApi'
import { useCreateUpdateHealthcarePartyMutation, useDeleteHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
import { ServiceSetting } from './ServiceSetting'
import { SiteSetting } from './SiteSetting'

interface ModalHierarchySettingsProps {
  isVisible: boolean
  onClose: () => void
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalHierarchySettings = ({ isVisible, onClose }: ModalHierarchySettingsProps): ReactElement => {
  const { selectedSite, siteRoot, selectedKey, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const [openKeys, setOpenKeys] = useState<string[]>(selectedSite ? [`site-${selectedSite.id}`] : [])

  const { data: sites, isLoading: isSitesLoading } = useGetHealthcarePartiesByParentQuery({ parentId: siteRoot?.id ?? '' }, { skip: skip || !siteRoot })
  const sitesIds = useMemo(() => sites?.map((site) => site.id), [sites])

  const { data: services, isLoading: isServicesLoading } = useGetAllAgendaByAuthorIds({ skip: skip || !siteRoot, authorIds: sitesIds ?? [] })

  const sortedServices = useMemo(() => {
    return [...(services ?? [])].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services])

  const [getCalendarItemTypesForAgendasIds] = useLazyGetCalendarItemTypesForMultipleAgendasQuery()
  const [getCalendarItemTypesForAgenda] = useLazyGetCalendarItemTypesQuery()
  const [createUpdateSite, { isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [deleteHcp, { isLoading: isDeleteHcpLoading }] = useDeleteHealthcarePartyMutation()
  const [deleteAgenda, { isLoading: isDeleteAgendaLoading }] = useDeleteAgendaMutation()
  const [deleteAgendas, { isLoading: isDeleteAgendasLoading }] = useDeleteAgendasMutation()
  const [deleteCalendarItemTypes, { isLoading: isDeleteCalendarItemTypesLoading }] = useDeleteCalendarItemTypesMutation()

  const fetchIsLoading = useMemo(() => isSitesLoading || isServicesLoading, [isSitesLoading, isServicesLoading])
  const mutationIsLoading = useMemo(
    () => isCreateUpdateSiteLoading || isDeleteHcpLoading || isDeleteAgendaLoading || isDeleteAgendasLoading || isDeleteCalendarItemTypesLoading,
    [isCreateUpdateSiteLoading, isDeleteHcpLoading, isDeleteAgendaLoading, isDeleteAgendasLoading, isDeleteCalendarItemTypesLoading],
  )

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

  const handleAddSite = useCallback(async () => {
    try {
      /*
      if (!siteRoot) throw new Error()
      const siteHcp = new HealthcareParty({ name: t('content.new_site'), parentId: siteRoot.id, id: v4(), public: true, tags: [new CodeStub({ id: 'SITE', code: 'SITE', context: 'SITE', type: 'SITE' })] })
      await createUpdateSite(siteHcp).unwrap()
      */
      console.info('obsolete')
      showMessageFeedback('success', t('notification.site_saved'))
    } catch (error) {
      openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
    }
  }, [selectedKey, siteRoot, t])

  const menuItems: MenuItem[] = useMemo(
    () =>
      (sites ?? []).map((site) => {
        const matchingServices = sortedServices?.filter((service) => service.author === site.id) ?? []

        const children: MenuItem[] = (matchingServices ?? []).map((service) => ({
          key: `service-${service.id}`,
          label: service.name,
          icon: <AppstoreOutlined />,
        }))

        const isSelected = selectedKey === `site-${site.id}`
        const isOpen = openKeys.includes(`site-${site.id}`)

        return {
          key: `site-${site.id}`,
          label: (
            <div
              className={isSelected ? 'site-label-white' : 'site-label-black'}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{site.name}</span>
              {isOpen ? <DownOutlined style={{ color: `${isSelected ? '#fff' : 'black'}` }} /> : <RightOutlined style={{ color: `${isSelected ? '#fff' : 'black'}` }} />}
            </div>
          ),
          style: isSelected
            ? {
                backgroundColor: '#e30613',
              }
            : {
                backgroundColor: 'white',
              },
          icon: <BankOutlined className={isSelected ? 'site-label-white' : 'site-label-black'} />,
          children,
        }
      }),
    [sites, sortedServices, selectedKey, openKeys],
  )

  const onServiceClick: MenuProps['onClick'] = useCallback(
    ({ key }: { key: string }) => {
      setSelectedKey((prevSelectedKey) => (prevSelectedKey === key ? 'default' : key))
    },
    [setSelectedKey],
  )

  const onSiteClick = useCallback(
    (keys: string[]) => {
      // If the new array of open keys is longer, it means we opened a submenu
      if (keys.length > openKeys.length) {
        // Find the key that was just added
        const openedKey = keys.find((key) => !openKeys.includes(key))
        if (openedKey) {
          setSelectedKey(openedKey)
        }
      } else {
        // Otherwise, a submenu was closed, so deselect the item
        setSelectedKey('default')
      }
      // Finally, update the state with the new list of open keys
      setOpenKeys(keys)
    },
    [openKeys, setSelectedKey, setOpenKeys],
  )

  const handleSiteDelete = useCallback(
    async (site: HealthcareParty) => {
      try {
        if (!site) throw new Error('No site selected')
        const relatedServices = services.filter((service) => service.author === site.id)
        const relatedServicesIds = relatedServices.map((service) => service.id)
        const calendarItemTypes = await getCalendarItemTypesForAgendasIds(relatedServicesIds).unwrap()
        const calendarItemTypesToDelete = calendarItemTypes.flat().map((CIT) => CIT.id)
        if (calendarItemTypesToDelete.length > 0) {
          await deleteCalendarItemTypes(calendarItemTypesToDelete).unwrap()
        }
        await deleteAgendas(relatedServices).unwrap()
        await deleteHcp(site).unwrap()
        showMessageFeedback('success', t('notification.site_deleted'))
      } catch (error) {
        openNotification('error', t('notification.site_delete_failed'), t('notification.site_delete_error'))
      } finally {
        setSelectedKey('default')
      }
    },
    [services, getCalendarItemTypesForAgendasIds, deleteCalendarItemTypes, deleteAgendas, deleteHcp, showMessageFeedback, openNotification, setSelectedKey, t],
  )

  const handleDeleteService = useCallback(
    async (service: Agenda) => {
      try {
        if (!service) throw new Error('No service selected')
        const calendarItemTypes = await getCalendarItemTypesForAgenda(service.id).unwrap()
        const calendarItemTypesToDelete = (calendarItemTypes ?? []).map((CIT) => CIT.id)
        if (calendarItemTypesToDelete.length > 0) {
          await deleteCalendarItemTypes(calendarItemTypesToDelete).unwrap()
        }
        await deleteAgenda(service).unwrap()
        showMessageFeedback('success', t('notification.service_deleted'))
      } catch (error) {
        openNotification('error', t('notification.service_delete_failed'), t('notification.service_delete_error'))
      } finally {
        setSelectedKey('default')
      }
    },
    [getCalendarItemTypesForAgenda, deleteCalendarItemTypes, deleteAgenda, showMessageFeedback, openNotification, setSelectedKey, t],
  )

  const settingContent = useMemo(() => {
    const match = selectedKey?.match(/^(site|service)-(.+)$/)
    const type = match?.[1]
    const id = match?.[2]

    if (!type || !id) {
      return <Empty image={emptyIcon} description={t('content.select_site_or_service_to_start')} className="modal-settings-empty" />
    }

    if (type === 'site') {
      const matchingSite = sites?.find((site) => site.id === id)
      if (!matchingSite) return <div>{t('content.site_not_found')}</div>

      const servicesOfThisSite = sortedServices?.filter((service) => service.author === matchingSite.id) ?? []

      return <SiteSetting site={matchingSite} services={servicesOfThisSite} isSitesLoading={isSitesLoading} />
    }

    if (type === 'service') {
      const matchingService = sortedServices?.find((service) => service.id === id)
      if (!matchingService) return <div>{t('content.service_not_found')}</div>

      return <ServiceSetting service={matchingService} handleDeleteService={handleDeleteService} isServicesLoading={isServicesLoading} />
    }

    return <div>{t('content.select_site_or_service')}</div>
  }, [selectedKey, sites, sortedServices, t, handleDeleteService, isSitesLoading, isServicesLoading])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.hierarchical_organization')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <Layout className="modal-settings">
        {notificationContextHolder}
        {messageContextHolder}
        <Sider width={250} className="menu-sites-root">
          <div className="menu-sites">
            {fetchIsLoading ? <SpinLoader /> : <Menu mode="inline" items={menuItems} onClick={onServiceClick} onOpenChange={onSiteClick} selectedKeys={[selectedKey]} openKeys={openKeys} expandIcon={false} />}
          </div>
        </Sider>
        <Layout>
          <Content className="selected-setting">{settingContent}</Content>
        </Layout>
      </Layout>
    </CustomModal>
  )
}

/*
Must add site from cockpit
<div className="sider-footer">
              <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={handleAddSite} loading={mutationIsLoading} disabled={fetchIsLoading || mutationIsLoading}>
                {t('content.add_site')}
              </StyledButton>
            </div>
            */

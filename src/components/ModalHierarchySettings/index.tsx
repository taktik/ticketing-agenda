import { AppstoreOutlined, BankOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { Agenda } from '@icure/cardinal-sdk'
import { Empty, Layout, Menu, MenuProps, message, notification } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import emptyIcon from '../../assets/empty.svg'
import { useDeleteAgendaMutation } from '../../core/api/agendaApi'
import { useDeleteCalendarItemTypesMutation } from '../../core/api/calendarItemTypeApi'
import { useHierarchyContext } from '../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../core/contexts/PermissionContext'
import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
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
  const { allSites, agendasBySiteId, calendarItemTypesByAgendaId, agendaMap, isLoading: isDataLoading } = useHierarchyContext()
  const { isAdminLevel, attachedSites, attachedServices } = usePermissionContext()
  const [selectedKey, setSelectedKey] = useState<string>('default')
  const [openKeys, setOpenKeys] = useState<string[]>([])

  const [deleteAgenda, { isLoading: isDeleteAgendaLoading }] = useDeleteAgendaMutation()
  const [deleteCalendarItemTypes, { isLoading: isDeleteCalendarItemTypesLoading }] = useDeleteCalendarItemTypesMutation()

  const [api, notificationContextHolder] = notification.useNotification()
  const [messageApi, messageContextHolder] = message.useMessage()

  const displayableSites = useMemo(() => {
    if (!isAdminLevel && attachedSites?.length) {
      return allSites.filter((site) => attachedSites.includes(site.id))
    }
    return allSites
  }, [allSites, attachedSites, isAdminLevel])

  useEffect(() => {
    if (isVisible) {
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

  const handleDeleteService = useCallback(
    async (service: Agenda) => {
      try {
        if (!service) throw new Error('No service selected')

        const existingTypes = calendarItemTypesByAgendaId.get(service.id) || []

        if (existingTypes.length > 0) {
          const ids = existingTypes.map((cit) => cit.id)
          await deleteCalendarItemTypes(ids).unwrap()
        }

        await deleteAgenda(service).unwrap()

        messageApi.success(t('notification.service_deleted'))
        setSelectedKey(`site-${service.author}`)
      } catch (error) {
        api.error({
          message: t('notification.service_delete_failed'),
          description: t('notification.service_delete_error'),
        })
      }
    },
    [calendarItemTypesByAgendaId, deleteCalendarItemTypes, deleteAgenda, messageApi, api, t],
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
      return <SiteSetting key={matchingSite.id} site={matchingSite} services={servicesOfThisSite} isSitesLoading={isDataLoading} onSelectService={(serviceId) => setSelectedKey(`service-${serviceId}`)} />
    }

    if (type === 'service') {
      const matchingService = agendaMap.get(id)
      if (!matchingService) return <div>{t('content.service_not_found')}</div>

      return <ServiceSetting key={matchingService.id} service={matchingService} handleDeleteService={handleDeleteService} isServicesLoading={isDataLoading || isDeleteAgendaLoading || isDeleteCalendarItemTypesLoading} />
    }

    return <div>{t('content.select_site_or_service')}</div>
  }, [selectedKey, displayableSites, agendasBySiteId, agendaMap, handleDeleteService, isDataLoading, isDeleteAgendaLoading, isDeleteCalendarItemTypesLoading, t])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.hierarchical_organization')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <Layout className="modal-settings">
        {notificationContextHolder}
        {messageContextHolder}
        <Sider width={250} className="menu-sites-root">
          <div className="menu-sites">
            {isDataLoading ? <SpinLoader /> : <Menu mode="inline" items={menuItems} onClick={onServiceClick} onOpenChange={onSiteClick} selectedKeys={[selectedKey]} openKeys={openKeys} expandIcon={false} />}
          </div>
        </Sider>
        <Layout>
          <Content className="selected-setting">{settingContent}</Content>
        </Layout>
      </Layout>
    </CustomModal>
  )
}

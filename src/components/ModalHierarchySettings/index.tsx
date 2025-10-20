import { AppstoreOutlined, BankOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { Agenda } from '@icure/cardinal-sdk'
import { Empty, Layout, Menu, MenuProps, message, notification } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import emptyIcon from '../../assets/empty.svg'
import { SettingContext } from '../../contexts/SettingContext'
import { useDeleteAgendaMutation, useGetAgendasByAuthorIds } from '../../core/api/agendaApi'
import { useDeleteCalendarItemTypesMutation, useLazyGetCalendarItemTypesQuery } from '../../core/api/calendarItemTypeApi'
import { useAppSelector } from '../../core/hooks'
import { usePermissions } from '../../core/hooks/usePermissions'
import { useSites } from '../../core/hooks/useSites'
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
  const { selectedSite, selectedKey, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const [openKeys, setOpenKeys] = useState<string[]>(selectedSite ? [`site-${selectedSite.id}`] : [])

  const { attachedService, attachedSite } = usePermissions(skip)

  const { sites, isSitesLoading } = useSites()
  const dispayableSites = useMemo(() => (attachedSite ? (sites?.filter((site) => site.id === attachedSite) ?? []) : (sites ?? [])), [sites, attachedSite])

  const sitesIds = useMemo(() => dispayableSites?.map((site) => site.id), [dispayableSites])

  const { data: services, isLoading: isServicesLoading } = useGetAgendasByAuthorIds({ skip: skip || !dispayableSites, authorIds: sitesIds ?? [] })

  const sortedServices = useMemo(() => {
    const baseServices = services ?? []

    const filteredServices = attachedService ? baseServices.filter((service) => service.id === attachedService) : baseServices

    return [...filteredServices].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services, attachedService])

  const [getCalendarItemTypesForAgenda] = useLazyGetCalendarItemTypesQuery()
  const [deleteAgenda, { isLoading: isDeleteAgendaLoading }] = useDeleteAgendaMutation()
  const [deleteCalendarItemTypes, { isLoading: isDeleteCalendarItemTypesLoading }] = useDeleteCalendarItemTypesMutation()

  const fetchIsLoading = useMemo(() => isSitesLoading || isServicesLoading, [isSitesLoading, isServicesLoading])
  const mutationIsLoading = useMemo(() => isDeleteAgendaLoading || isDeleteCalendarItemTypesLoading, [isDeleteAgendaLoading, isDeleteCalendarItemTypesLoading])

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

  const menuItems: MenuItem[] = useMemo(
    () =>
      dispayableSites.map((site) => {
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
    [dispayableSites, sortedServices, selectedKey, openKeys],
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
      const matchingSite = dispayableSites.find((site) => site.id === id)
      if (!matchingSite) return <div>{t('content.site_not_found')}</div>

      const servicesOfThisSite = sortedServices?.filter((service) => service.author === matchingSite.id) ?? []

      return <SiteSetting key={matchingSite.id} site={matchingSite} services={servicesOfThisSite} isSitesLoading={isSitesLoading} />
    }

    if (type === 'service') {
      const matchingService = sortedServices?.find((service) => service.id === id)
      if (!matchingService) return <div>{t('content.service_not_found')}</div>

      return <ServiceSetting key={matchingService.id} service={matchingService} handleDeleteService={handleDeleteService} isServicesLoading={isServicesLoading} />
    }

    return <div>{t('content.select_site_or_service')}</div>
  }, [selectedKey, dispayableSites, sortedServices, t, handleDeleteService, isSitesLoading, isServicesLoading])

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

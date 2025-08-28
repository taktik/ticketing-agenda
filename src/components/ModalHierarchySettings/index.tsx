import { AppstoreOutlined, BankOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { Agenda, CodeStub, HealthcareParty } from '@icure/cardinal-sdk'
import { Empty, Layout, Menu, MenuProps, message, notification } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import emptyIcon from '../../assets/empty.svg'
import { SettingContext } from '../../contexts/SettingContext'
import { useCreateUpdateHealthcarePartyMutation, useGetAllServiceBySiteId, useGetHealthcarePartiesByParentQuery, useRecursiveHcpDeletion } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { CustomModal } from '../common/CustomModal'
import { ButtonStyleType, StyledButton } from '../common/StyledButton'
import './index.css'
import { ServiceSetting } from './ServiceSetting'
import { SiteSetting } from './SiteSetting'
import { useDeleteAgendaMutation, useGetAllAgendaByAuthorIds } from '../../core/api/agendaApi'

interface ModalHierarchySettingsProps {
  isVisible: boolean
  onClose: () => void
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalHierarchySettings = ({ isVisible, onClose }: ModalHierarchySettingsProps): ReactElement => {
  const { selectedSite, rootHcp, selectedKey, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const [openKeys, setOpenKeys] = useState<string[]>(selectedSite ? [`site-${selectedSite.id}`] : [])
  const { data: sites } = useGetHealthcarePartiesByParentQuery({ parentId: rootHcp?.id ?? '' }, { skip: skip || !rootHcp })
  const sitesIds = useMemo(() => sites?.map((site) => site.id), [sites])

  useEffect(() => console.log('user', user), [user])

  const [createUpdateSite, { isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()
  const { deleteHcpRecursively: deleteSite, isLoading: isDeleteSiteLoading } = useRecursiveHcpDeletion()
  const [deleteAgendaMutation] = useDeleteAgendaMutation()

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
  const { data: services } = useGetAllAgendaByAuthorIds({ skip: skip || !rootHcp, authorIds: sitesIds ?? [] })

  useEffect(() => console.log('agendas in settings', services), [services])

  const sortedServices = useMemo(() => {
    return [...(services ?? [])].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services])

  const handleAddSite = useCallback(() => {
    try {
      if (!rootHcp) throw new Error()
      const id = v4()
      const siteHcp = new HealthcareParty({ name: t('content.new_site'), parentId: rootHcp.id, id: id, public: true, tags: [new CodeStub({ id: 'SITE', code: 'SITE', context: 'SITE', type: 'SITE' })] })
      createUpdateSite(siteHcp).unwrap()
      showMessageFeedback('success', t('notification.site_saved'))
    } catch (error) {
      openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
    }
  }, [selectedKey, rootHcp])

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
    [sites, sortedServices],
  )

  const onServiceClick: MenuProps['onClick'] = ({ key }) => {
    if (key === selectedKey) setSelectedKey('default')
    else setSelectedKey(key)
  }

  const onSiteClick = (keys: string[]) => {
    if (keys.length > openKeys.length) {
      // Means we've opened a menu
      const openedKey = keys.find((key) => !openKeys.includes(key)) // Find the menu we've just opened and select it
      if (openedKey) setSelectedKey(openedKey)
    } else {
      // Closed the menu
      setSelectedKey('default')
    }
    setOpenKeys(keys)
  }

  const handleSiteDelete = async (site: HealthcareParty) => {
    try {
      if (!site) throw new Error('No site selected')
      await deleteSite(site)
      showMessageFeedback('success', t('notification.site_deleted'))
    } catch (error) {
      openNotification('error', t('notification.site_delete_failed'), t('notification.site_delete_error'))
    } finally {
      setSelectedKey('default')
    }
  }

  const handleDeleteService = async (service: Agenda) => {
    try {
      if (!service) throw new Error('No service selected')
      await deleteAgendaMutation(service)
      showMessageFeedback('success', t('notification.service_deleted'))
    } catch (error) {
      openNotification('error', t('notification.service_delete_failed'), t('notification.service_delete_error'))
    } finally {
      setSelectedKey('default')
    }
  }

  const renderSettingContent = useCallback(() => {
    const match = selectedKey.match(/^(site|service)-(.+)$/)
    const type = match?.[1]
    const id = match?.[2]

    if (!type || !id) {
      return <Empty image={emptyIcon} description={t('content.select_site_or_service_to_start')} style={{ paddingTop: '10rem' }} />
    }

    if (type === 'site') {
      const matchingSite = sites?.find((site) => site.id === id)
      if (!matchingSite) return <div>{t('content.site_not_found')}</div>

      const servicesOfThisSite = sortedServices?.filter((service) => service.author === matchingSite.id) ?? []

      return <SiteSetting site={matchingSite} services={servicesOfThisSite} handleSiteDelete={handleSiteDelete} />
    }

    if (type === 'service') {
      const matchingService = sortedServices?.find((service) => service.id === id)
      if (!matchingService) return <div>{t('cntent.service_not_found')}</div>
      return <ServiceSetting service={matchingService} handleDeleteService={handleDeleteService} />
    }

    return <div>{t('content.select_site_or_service')}</div>
  }, [selectedKey, sites, sortedServices, t, sortedServices])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.hierarchical_organization')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <Layout className="modal-settings">
        {notificationContextHolder}
        {messageContextHolder}
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div className="menu-sites">
            <Menu mode="inline" items={menuItems} onClick={onServiceClick} onOpenChange={onSiteClick} selectedKeys={[selectedKey]} openKeys={openKeys} style={{ height: 'auto', borderRight: 0 }} expandIcon={false} />
            <div className="sider-footer">
              <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={handleAddSite}>
                {t('content.add_site')}
              </StyledButton>
            </div>
          </div>
        </Sider>
        <Layout>
          <Content className="selected-setting">{renderSettingContent()}</Content>
        </Layout>
      </Layout>
    </CustomModal>
  )
}

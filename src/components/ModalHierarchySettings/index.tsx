import { AppstoreOutlined, BankOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Empty, Layout, Menu, MenuProps, message, notification, Typography } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { SettingContext } from '../../contexts/SettingContext'
import { useCreateUpdateHealthcarePartyMutation, useGetAllServiceBySiteId, useGetHealthcarePartiesByParentQuery } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { CustomModal } from '../common/CustomModal'
import './index.css'
import { ServiceSetting } from './ServiceSetting'
import emptyIcon from '../../assets/empty.svg'
import { useGetAllAgendaByAuthorIds } from '../../core/api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../core/api/calendarItemTypeApi'
import { SiteSetting } from './SiteSetting'
import { ButtonStyleType, StyledButton } from '../common/StyledButton'

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose }: ModalSchedulingProps): ReactElement => {
  const { selectedSite, rootHcp, selectedKey, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const [openKeys, setOpenKeys] = useState<string[]>(selectedSite ? [`site-${selectedSite.id}`] : [])
  const { data: sites } = useGetHealthcarePartiesByParentQuery({ skip: skip || !rootHcp, parentId: rootHcp?.id ?? '' })
  const sitesIds = useMemo(() => sites?.map((site) => site.id), [sites])

  const [createUpdateSite, { isError: isCreateUpdateSiteError, isSuccess: isCreateUpdateSiteSuccess, isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()

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

  const { data: services } = useGetAllServiceBySiteId({ skip: skip || !rootHcp, sitesIds: sitesIds ?? [] })

  const sortedServices = useMemo(() => {
    return [...(services ?? [])].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services])

  const handleAddSite = useCallback(() => {
    try {
      if (!rootHcp) throw new Error('No root')
      const id = v4()
      const siteHcp = new HealthcareParty({ name: t('content.new_site'), parentId: rootHcp.id, id: id })
      createUpdateSite(siteHcp)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }, [selectedKey, rootHcp])

  useEffect(() => {
    if (isCreateUpdateSiteSuccess) showMessageFeedback('success', t('notification.site_saved'))
    if (isCreateUpdateSiteError) openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
  }, [isCreateUpdateSiteSuccess, isCreateUpdateSiteError])

  const menuItems: MenuItem[] = useMemo(
    () =>
      (sites ?? []).map((site) => {
        const matchingServices = sortedServices?.filter((service) => service.parentId === site.id) ?? []

        const children: MenuItem[] = (matchingServices ?? []).map((service) => ({
          key: `service-${service.id}`,
          label: service.name,
          icon: <AppstoreOutlined />,
        }))

        return {
          key: `site-${site.id}`,
          label: (
            <div
              style={{
                padding: 0,
                margin: 0,
              }}
            >
              {site.name}
            </div>
          ),
          style:
            selectedKey === `site-${site.id}`
              ? {
                  backgroundColor: '#e30613',
                  margin: 13,
                }
              : {
                  margin: 13,
                },
          icon: <BankOutlined />,
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

      const servicesOfThisSite = sortedServices?.filter((service) => service.parentId === matchingSite.id) ?? []

      return <SiteSetting site={matchingSite} services={servicesOfThisSite} />
    }

    if (type === 'service') {
      const matchingService = sortedServices?.find((service) => service.id === id)
      if (!matchingService) return <div>{t('cntent.service_not_found')}</div>
      return <ServiceSetting service={matchingService} />
    }

    return <div>{t('content.select_site_or_service')}</div>
  }, [selectedKey, sites, sortedServices, t, sortedServices])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.hierarchical_organization')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <Layout className="modal-settings">
        {notificationContextHolder}
        {messageContextHolder}
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div className="content">
            <Menu mode="inline" items={menuItems} onClick={onServiceClick} onOpenChange={onSiteClick} selectedKeys={[selectedKey]} openKeys={openKeys} style={{ height: 'auto', borderRight: 0 }} />
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

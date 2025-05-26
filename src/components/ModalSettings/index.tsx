import { AddressType, Agenda, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType, TimeTable } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps, notification, message } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'
import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
import { useGetHealthcarePartiesByParentQuery, useGetAllServiceBySiteId, useCreateUpdateHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { useGetTimeTablesQuery } from '../../core/api/timeTableApi'
import { SettingOutlined } from '@ant-design/icons'
import { ItemType, MenuItemType } from 'antd/es/menu/interface'
import { normalize } from '../patient/modals/ModalImportPatients/utils/functionUtils'
import { SiteSelector } from '../SiteSelector'
import { useGetAgendasQuery } from '../../core/api/agendaApi'
import { SiteSetting } from './SiteSetting'
import { ServiceSetting } from './ServiceSetting'
import { v4 } from 'uuid'
import { SettingContext } from '../../contexts/SettingContext'
import { useTranslation } from 'react-i18next'
import defaultLogo from '../../assets/undraw_choose_j1ds.svg'

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
  const [search, setSearch] = useState('')
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

  const items: MenuItem[] = useMemo(
    () =>
      (sites ?? []).map((site) => {
        const matchingParties = sortedServices?.filter((service) => service.parentId === site.id) ?? []

        const children: MenuItem[] = [
          ...(matchingParties ?? []).map((service) => ({
            key: `service-${service.id}`,
            label: service.name,
          })),
        ]

        return {
          key: `site-${site.id}`,
          label: (
            <div
              style={{
                color: selectedKey === `site-${site.id}` ? '#ffffff' : 'inherit',
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
          children,
        }
      }),
    [sites, sortedServices, selectedKey],
  )

  const filteredItems = useMemo(() => {
    const filtered = (items ?? [])
      .map((item) => {
        if (!item) return null
        if (!('label' in item)) return null

        const normalizedSearch = normalize(search)
        const normalizedItemLabel = normalize(typeof item.label === 'string' ? item.label : React.isValidElement(item.label) && typeof item.label.props?.children === 'string' ? item.label.props.children : '')

        const matchService = normalizedItemLabel.includes(normalizedSearch)

        let matchingChildren: ItemType<MenuItemType>[] = []

        if ('children' in item && Array.isArray(item.children)) {
          matchingChildren = matchService
            ? item.children
            : item.children.filter((child) => {
                if (!child || !('label' in child)) return false

                const labelText = (() => {
                  if (typeof child.label === 'string') {
                    return normalize(child.label)
                  }
                  if (React.isValidElement(child.label) && typeof child.label.props?.children === 'string') {
                    return normalize(child.label.props.children)
                  }
                  return ''
                })()
                return labelText.includes(normalize(search))
              })
        }

        if (matchService || matchingChildren.length > 0) {
          return {
            ...item,
            children: matchingChildren,
          }
        }

        return null
      })
      .filter((item): item is Exclude<typeof item, null> => item !== null)

    return filtered
  }, [items, search])

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

  const renderSetting = useCallback(() => {
    const match = selectedKey.match(/^(site|service)-(.+)$/)
    const type = match?.[1]
    const id = match?.[2]

    if (!type || !id) {
      return (
        <div className="defaultRender">
          {t('content.select_site_or_service_to_edit')} <img src={defaultLogo} />
        </div>
      )
    }

    if (type === 'site') {
      const groupedSites = sites ?? []
      const matchingSite = groupedSites.find((site) => site.id === id)
      return <SiteSetting site={matchingSite} />
    }

    if (type === 'service') {
      const matchingService = services?.find((service) => service.id === id)
      return <ServiceSetting service={matchingService} />
    }

    return <div>{t('content.select_site_or_service_to_edit')}</div>
  }, [selectedKey, sites, services])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.settings')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <div className="modalSettings">
        {notificationContextHolder}
        {messageContextHolder}
        <div className="settingsTitle">
          <div className="content">
            <div className="SearchInput">
              <Input placeholder={t('content.search_site_or_service')} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Menu onClick={onServiceClick} onOpenChange={onSiteClick} selectedKeys={[selectedKey]} openKeys={openKeys} style={{ width: 250 }} defaultSelectedKeys={['default']} mode="inline" items={filteredItems} />
          </div>
          <div className="bottomFooter">
            <Button onClick={handleAddSite}>{t('content.add_site')}</Button>
          </div>
        </div>
        <Divider type="vertical" variant="solid" style={{ height: '100%' }} />
        <div className="selectedSetting">{renderSetting()}</div>
      </div>
    </CustomModal>
  )
}

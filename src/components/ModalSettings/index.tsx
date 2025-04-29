import { AddressType, Agenda, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType, TimeTable } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'
import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
import { useGetHealthcarePartiesByParentQuery, useGetHealthcarePartiesQuery } from '../../core/api/healthcarePartyApi'
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

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose }: ModalSchedulingProps): ReactElement => {
  const { newSite, setNewSite, selectedSite, rootHcp, selectedKey, setSelectedKey } = useContext(SettingContext)
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const [openKeys, setOpenKeys] = useState<string[]>(selectedSite ? [`site-${selectedSite.id}`] : [])
  const [search, setSearch] = useState('')
  const { data: sites } = useGetHealthcarePartiesByParentQuery({ skip: skip || !rootHcp, parentId: rootHcp?.id ?? '' })
  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: skip || !selectedSite, parentId: selectedSite?.id ?? '' })

  const handleAddSite = useCallback(() => {
    if (!newSite && rootHcp) {
      setNewSite(new HealthcareParty({ name: 'New Site', parentId: rootHcp.id, id: v4() }))
    } else {
      // HCp undefined ? => error
    }
  }, [newSite, setNewSite])

  const items: MenuItem[] = useMemo(
    () =>
      [...(sites ?? []), ...(newSite ? [newSite] : [])].map((site) => {
        const children: MenuItem[] = [
          ...(services ?? []).map((service) => ({
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
    [sites, services, selectedKey, newSite],
  )

  const filteredItems = useMemo(() => {
    const filtered = (items ?? [])
      .map((item) => {
        if (!item) return null
        if (!('label' in item)) return null

        const normalizedSearch = normalize(search)
        const normalizedItemLabel = normalize(
          typeof item.label === 'string' ? item.label : React.isValidElement(item.label) && typeof item.label.props?.children === 'string' ? item.label.props.children : '',
        )

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
      return <div>Select a site or a service to edit</div>
    }

    if (type === 'site') {
      const groupedSites = [...(sites ?? []), ...(newSite ? [newSite] : [])]
      const matchingSite = groupedSites.find((site) => site.id === id)
      return <SiteSetting site={matchingSite} />
    }

    if (type === 'service') {
      const matchingService = services?.find((service) => service.id === id)
      return <ServiceSetting service={matchingService} />
    }

    return <div>Select a site or a service to edit</div>
  }, [selectedKey, sites, newSite, services])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Settings" blockAntModalBodyVerticalScroll noFooter>
      <div className="modalSettings">
        <div className="settingsTitle">
          <div className="content">
            <div className="SearchInput">
              <Input placeholder="Search menu" onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Menu
              onClick={onServiceClick}
              onOpenChange={onSiteClick}
              selectedKeys={[selectedKey]}
              openKeys={openKeys}
              style={{ width: 250 }}
              defaultSelectedKeys={['default']}
              mode="inline"
              items={filteredItems}
            />
          </div>
          <div className="bottomFooter">
            <Button disabled={!!newSite} onClick={handleAddSite}>
              Ajouter un site
            </Button>
          </div>
        </div>
        <Divider type="vertical" variant="solid" style={{ height: '100%' }} />
        <div className="selectedSetting">{renderSetting()}</div>
      </div>
    </CustomModal>
  )
}

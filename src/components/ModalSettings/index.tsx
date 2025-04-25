import { AddressType, Agenda, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType, TimeTable } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'
import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
import { useGetHealthcarePartiesQuery } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { useGetTimeTables } from '../../core/api/timeTableApi'
import { SettingOutlined } from '@ant-design/icons'
import { ItemType } from 'antd/es/menu/interface'
import { normalize } from '../patient/modals/ModalImportPatients/utils/functionUtils'
import { SiteSelector } from '../SiteSelector'
import { useGetAgendasQuery } from '../../core/api/agendaApi'

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  selectedSite: Agenda | undefined
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose, selectedSite }: ModalSchedulingProps): ReactElement => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const [selectedKey, setSelectedKey] = useState<string>('default')
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(undefined)
  const { data: sites } = useGetAgendasQuery(undefined, { skip: skip })
  const [selectedSettingSite, setSelectedSettingSite] = useState<Agenda | undefined>(sites?.find((site) => site.id === selectedSite?.id) ?? sites?.[0])

  const { data: services } = useGetHealthcarePartiesQuery(undefined, { skip: skip })
  const { data: demarches } = useGetTimeTables({ agendaId: selectedSite?.id ?? '', serviceTag: undefined, skip: skip || !selectedSite?.id })

  const groupedByService = new Map<HealthcareParty, TimeTable[]>()
  ;(services ?? []).forEach((service) => {
    const matchingDemarches = (demarches ?? []).filter((d) => d.tags.some((tag) => tag.type === `service-${service.id}`))
    groupedByService.set(service, matchingDemarches)
  })

  const items: MenuItem[] = useMemo(
    () =>
      (sites ?? []).map((site) => {
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
    [sites, services, selectedKey],
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

  const renderSetting = useCallback(() => {
    switch (selectedKey) {
      case 'utilisateur':
        return <div>Affichage settings here</div>
      case 'droits':
        return <div>Permissions info form here</div>
      case 'affichage':
        return <div>Affichage settings here</div>
      case 'agenda':
        return <div>Affichage settings here</div>
      case 'license':
        return <div>License settings here</div>
      default:
        return <div>default</div>
    }
  }, [selectedKey])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Settings" blockAntModalBodyVerticalScroll noFooter>
      <div className="modalSettings">
        <div className="settingsTitle">
          <Menu
            onClick={onServiceClick}
            onOpenChange={onSiteClick}
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            style={{ width: 250 }}
            defaultSelectedKeys={['default']}
            mode="inline"
            items={items}
          />
        </div>
        <Divider type="vertical" variant="solid" style={{ height: '100%' }} />
        <div className="selectedSetting">{renderSetting()}</div>
      </div>
    </CustomModal>
  )
}

/*
import { AddressType, Agenda, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'

import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
import { useGetHealthcarePartiesQuery } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { useGetTimeTables } from '../../core/api/timeTableApi'
import { SettingOutlined } from '@ant-design/icons'
import { ItemType } from 'antd/es/menu/interface'
import { normalize } from '../patient/modals/ModalImportPatients/utils/functionUtils'

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  selectedSite: Agenda | undefined
  currentUser?: HealthcareParty
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose, currentUser, selectedSite }: ModalSchedulingProps): ReactElement => {
  const [selectedKey, setSelectedKey] = useState<string>('default')
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(undefined)
  const [search, setSearch] = useState('')
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  const { data: services } = useGetHealthcarePartiesQuery(undefined, { skip: skip })
  const { data: demarches } = useGetTimeTables({ agendaId: selectedSite?.id ?? '', serviceTag: undefined, skip: skip || !selectedSite?.id })

  const itemsFromServices: MenuItem[] = useMemo(
    () =>
      (services ?? []).map((service) => {
        const matchingDemarches = (demarches ?? []).filter((d) => d.tags.some((tag) => tag.type === `service-${service.id}`))

        const children: MenuItem[] = [
          {
            key: `service-${service.id}-general`,
            label: <strong>Paramètres généraux</strong>,
            icon: <SettingOutlined />,
          },
          ...matchingDemarches.map((demarche) => ({
            key: `demarche-${demarche.id}`,
            label: demarche.name,
          })),
        ]

        return {
          key: `service-${service.id}`,
          label: service.name,
          children,
        }
      }),
    [services, demarches],
  )

  const filteredItems = useMemo(
    () =>
      itemsFromServices
        .map((item) => {
          // Check if item has children, if not, return null
          if (!item || !('children' in item) || !item.children || !item.children.length) {
            return null
          }

          const normalizedSearch = normalize(search)
          const normalizedItemLabel = normalize(
            typeof item.label === 'string' ? item.label : React.isValidElement(item.label) && typeof item.label.props?.children === 'string' ? item.label.props.children : '',
          )

          // 🧠 If service name matches search, keep all children
          const matchService = normalizedItemLabel.includes(normalizedSearch)

          // Safely handle children and find 'general' setting if exists
          const generalSetting = item.children?.find((child) => {
            if (!child) return false // Safeguard if the child is null or undefined
            return 'key' in child && typeof child.key === 'string' && child.key.endsWith('-general')
          })
          // Filter out children that match search (with null/undefined check for label)
          const matchingChildren = matchService
            ? item.children
            : item.children.filter((child) => {
                // Narrow the type to MenuItemType or SubMenuType before accessing `label`
                if (!child || !('label' in child)) return false // Skip if no label field

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

          // Combine the "general" setting and the matching children
          const childrenToKeep = [...(generalSetting ? [generalSetting] : []), ...matchingChildren.filter((child) => child !== generalSetting)]

          // If no children match and we're searching, skip this item
          if (childrenToKeep.length === 0 || (search && matchingChildren.length === 0)) {
            return null
          }

          return {
            ...item,
            children: childrenToKeep,
          }
        })
        .filter((item): item is Exclude<typeof item, null> => item !== null),
    [itemsFromServices, search],
  )

  const onClick: MenuProps['onClick'] = ({ key }) => {
    setSelectedKey(key)
  }

  const renderSetting = useCallback(() => {
    switch (selectedKey) {
      case 'utilisateur':
        return <div>Affichage settings here</div>
      case 'droits':
        return <div>Permissions info form here</div>
      case 'affichage':
        return <div>Affichage settings here</div>
      case 'agenda':
        return <div>Affichage settings here</div>
      case 'license':
        return <div>License settings here</div>
      default:
        return <div>default</div>
    }
  }, [selectedKey])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Service Settings">
      <div className="modalSettings">
        <div className="settingsTitle">
          <Input.Search placeholder="Search menu" onChange={(e) => setSearch(e.target.value)} />
          <Menu onClick={onClick} style={{ width: 250 }} defaultSelectedKeys={['default']} defaultOpenKeys={['sub1']} mode="inline" items={filteredItems} />
        </div>
        <Divider type="vertical" variant="solid" style={{ height: '100%' }} />
        <div className="selectedSetting">{renderSetting()}</div>
      </div>
    </CustomModal>
  )
}
*/

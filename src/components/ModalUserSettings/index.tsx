import { AddressType, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useEffect, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'

import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import '../ModalUserSettings/index.css'
import { AccountSetting } from './Settings/AccountSetting'
import { AgendaSetting } from './Settings/AgendaSetting'

interface ModalSettingsProps {
  isVisible: boolean
  onClose: () => void
  currentUser?: HealthcareParty
}

type MenuItem = Required<MenuProps>['items'][number]

const items: MenuItem[] = [
  {
    key: 'g1',
    label: 'Compte',
    type: 'group',
    children: [
      { key: 'utilisateur', label: 'Utilisateur' },
      { key: 'droits', label: 'Droits' },
    ],
  },
  {
    key: 'g2',
    label: 'Préférence',
    type: 'group',
    children: [
      { key: 'affichage', label: 'Affichage' },
      { key: 'agenda', label: 'Agenda' },
    ],
  },
  {
    key: 'g3',
    label: 'Autre',
    type: 'group',
    children: [{ key: 'license', label: 'License' }],
  },
]

export const ModalSettings = ({ isVisible, onClose, currentUser }: ModalSettingsProps): ReactElement => {
  const [selectedKey, setSelectedKey] = useState<string>('utilisateur')

  const onClick: MenuProps['onClick'] = ({ key }) => {
    setSelectedKey(key)
  }

  const renderSetting = useCallback(() => {
    switch (selectedKey) {
      case 'utilisateur':
        return <AccountSetting currentUser={currentUser} onClose={onClose} />
      case 'droits':
        return <div>Permissions info form here</div>
      case 'affichage':
        return <div>Affichage settings here</div>
      case 'agenda':
        return <AgendaSetting onClose={onClose} />
      case 'license':
        return <div>License settings here</div>
      default:
        return <AccountSetting currentUser={currentUser} onClose={onClose} />
    }
  }, [selectedKey, currentUser])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Settings">
      <div className="modalSettings">
        <div className="settingsTitle">
          <Menu onClick={onClick} style={{ width: 150 }} defaultSelectedKeys={['utilisateur']} defaultOpenKeys={['sub1']} mode="inline" items={items} />
        </div>
        <Divider type="vertical" variant="solid" style={{ height: '100%' }} />
        <div className="selectedSetting">{renderSetting()}</div>
      </div>
    </CustomModal>
  )
}

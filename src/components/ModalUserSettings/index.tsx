import { AddressType, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType, User } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useEffect, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'

import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import '../ModalUserSettings/index.css'
import { AccountSetting } from './Settings/AccountSetting'
import { ProfileOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { ManagerUsers } from './Settings/ManageUsers'
import { useTranslation } from 'react-i18next'

interface ModalSettingsProps {
  isVisible: boolean
  onClose: () => void
  currentUser?: HealthcareParty
  user?: User
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose, currentUser, user }: ModalSettingsProps): ReactElement => {
  const [selectedKey, setSelectedKey] = useState<string>('profil')

  const { t } = useTranslation()

  const items: MenuItem[] = [
    { key: 'profil', icon: <ProfileOutlined />, label: t('content.your_profile') },
    { key: 'manageUsers', icon: <UsergroupAddOutlined />, label: t('content.manage_users') },
  ]

  const onClick: MenuProps['onClick'] = ({ key }) => {
    setSelectedKey(key)
  }

  const renderSetting = useCallback(() => {
    switch (selectedKey) {
      case 'profil':
        return <AccountSetting currentUser={currentUser} user={user} />
      case 'manageUsers':
        return <ManagerUsers />
      default:
        return <AccountSetting currentUser={currentUser} user={user} />
    }
  }, [selectedKey, currentUser])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Settings" noFooter blockAntModalBodyVerticalScroll width={1300}>
      <div className="modalSettings">
        <div className="settingsTitle">
          <Menu onClick={onClick} style={{ width: 200 }} defaultSelectedKeys={['profil']} mode="inline" items={items} />
        </div>
        <Divider type="vertical" variant="solid" style={{ height: '100%' }} />
        <div className="selectedSetting">{renderSetting()}</div>
      </div>
    </CustomModal>
  )
}

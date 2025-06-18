import { AddressType, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType, User } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps, Layout } from 'antd'

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
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'

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
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.your_settings')} noFooter blockAntModalBodyVerticalScroll width={1300}>
      <Layout className="modal-settings">
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div className="menu-user">
            <Menu onClick={onClick} defaultSelectedKeys={['profil']} mode="inline" items={items} style={{ height: 'auto', borderRight: 0 }} expandIcon={false} />
          </div>
        </Sider>
        <Layout>
          <Content className="selected-user-setting">{renderSetting()}</Content>
        </Layout>
      </Layout>
    </CustomModal>
  )
}

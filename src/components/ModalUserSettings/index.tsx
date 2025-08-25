import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Layout, Menu, MenuProps } from 'antd'
import { ReactElement, useCallback, useState } from 'react'
import { ProfileOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { useTranslation } from 'react-i18next'
import { CustomModal } from '../common/CustomModal'
import '../ModalUserSettings/index.css'
import { AccountSetting } from './Settings/AccountSetting'
import { ManagerUsers } from './Settings/ManageUsers'

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
      <Layout className="modal-settings-user">
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div className="menu-sites">
            <Menu mode="inline" items={items} onClick={onClick} defaultSelectedKeys={['profil']} style={{ height: 'auto', borderRight: 0 }} expandIcon={false} />
          </div>
        </Sider>
        <Layout>
          <Content className="selected-setting-user">{renderSetting()}</Content>
        </Layout>
      </Layout>
    </CustomModal>
  )
}

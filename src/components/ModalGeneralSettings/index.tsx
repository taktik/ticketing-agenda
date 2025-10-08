import { ProfileOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Layout, Menu, MenuProps } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CustomModal } from '../common/CustomModal'
import './index.css'
import { AccountSetting } from './Settings/AccountSetting'
import { ManagerUsers } from './Settings/ManageUsers'
import { usePermissions } from '../../core/hooks/usePermissions'

interface ModalSettingsProps {
  isVisible: boolean
  onClose: () => void
  currentUserHcp?: HealthcareParty
  user?: User
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose, currentUserHcp, user }: ModalSettingsProps): ReactElement => {
  const [selectedKey, setSelectedKey] = useState<string>('profil')

  const { t } = useTranslation()

  const { isAdministrator } = usePermissions()

  const items: MenuItem[] = useMemo(() => {
    return [{ key: 'profil', icon: <ProfileOutlined />, label: t('content.your_profile') }, isAdministrator && { key: 'manageUsers', icon: <UsergroupAddOutlined />, label: t('content.manage_users') }].filter(
      Boolean,
    ) as MenuItem[]
  }, [t, isAdministrator])

  const onClick: MenuProps['onClick'] = ({ key }) => {
    setSelectedKey(key)
  }

  const renderSetting = useCallback(() => {
    switch (selectedKey) {
      case 'profil':
        return <AccountSetting currentUserHcp={currentUserHcp} user={user} />
      case 'manageUsers':
        return <ManagerUsers />
      default:
        return <AccountSetting currentUserHcp={currentUserHcp} user={user} />
    }
  }, [selectedKey, currentUserHcp, user])

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

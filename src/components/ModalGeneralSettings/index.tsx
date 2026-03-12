import { ProfileOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { Layout, Menu, MenuProps } from 'antd'
import { Content } from 'antd/es/layout/layout'
import Sider from 'antd/es/layout/Sider'
import { ReactElement, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePermissionContext } from '../../core/contexts/PermissionContext'
import { CustomModal } from '../common/CustomModal'
import './index.css'
import { AccountSetting } from './Settings/AccountSetting'
import { ManagerUsers } from './Settings/ManageUsers'

interface ModalSettingsProps {
  isVisible: boolean
  onClose: () => void
  currentUserHcp?: HealthcareParty
}

type MenuItem = Required<MenuProps>['items'][number]

export const ModalSettings = ({ isVisible, onClose, currentUserHcp }: ModalSettingsProps): ReactElement => {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string>('profil')
  const { isAdministrator } = usePermissionContext()

  const items: MenuItem[] = useMemo(() => {
    return [
      {
        key: 'profil',
        icon: <ProfileOutlined />,
        label: t('content.your_profile'),
      },
      isAdministrator && {
        key: 'manageUsers',
        icon: <UsergroupAddOutlined />,
        label: t('content.manage_users'),
      },
    ].filter(Boolean) as MenuItem[]
  }, [t, isAdministrator])

  const activeContent = useMemo(() => {
    switch (selectedKey) {
      case 'manageUsers':
        return <ManagerUsers />
      case 'profil':
      default:
        return <AccountSetting currentUserHcp={currentUserHcp} />
    }
  }, [selectedKey, currentUserHcp])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.your_settings')} noFooter blockAntModalBodyVerticalScroll width={1300}>
      <Layout className="modal-settings-user">
        <Sider width={250} className="menu-sites-root">
          <div className="menu-sites">
            <Menu mode="inline" items={items} onClick={({ key }) => setSelectedKey(key)} selectedKeys={[selectedKey]} style={{ height: 'auto', borderRight: 0 }} expandIcon={false} />
          </div>
        </Sider>
        <Layout>
          <Content className="selected-setting-user">{activeContent}</Content>
        </Layout>
      </Layout>
    </CustomModal>
  )
}

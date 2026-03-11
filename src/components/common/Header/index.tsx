import Icon from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { arrowDownIcn, logOutIcn, manageUserIcn, userIcn } from '../../../assets/CustomIcons'
import defaultLogo from '../../../assets/mouscronLogo.png'
import { LOGO_URL } from '../../../constants'
import { useGetCurrentUserQuery } from '../../../core/api/userApi'
import { usePermissionContext } from '../../../core/contexts/PermissionContext'
import { useAppDispatch } from '../../../core/hooks'
import { logout } from '../../../core/services/auth.api'
import { ModalSettings } from '../../ModalGeneralSettings'
import { LanguageSelector } from '../LanguageSelector'
import './index.css'

const logoSrc = LOGO_URL ?? defaultLogo

export const Header = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false)
  const [isModalManageAccountFormOpen, setModalManageAccountFormOpen] = useState(false)

  const { currentDataOwner: currentUserHcp, isLoading: isContextLoading } = usePermissionContext()
  const { data: currentUser } = useGetCurrentUserQuery(undefined, { skip: !currentUserHcp })

  const handleLogout = useCallback(() => {
    dispatch(logout())
  }, [dispatch])

  const items: MenuProps['items'] = [
    {
      key: 'manageAccount',
      label: (
        <div className="header__userDropdown__item">
          <Icon component={manageUserIcn} />
          <span>{t('content.your_settings')}</span>
        </div>
      ),
    },
    {
      key: 'logout',
      danger: true,
      label: (
        <div className="header__userDropdown__item">
          <Icon component={logOutIcn} />
          <span>{t('content.log_out')}</span>
        </div>
      ),
    },
  ]

  const onClick: MenuProps['onClick'] = useCallback(
    ({ key }: { key: string }) => {
      switch (key) {
        case 'manageAccount':
          setModalManageAccountFormOpen(true)
          break
        case 'logout':
          handleLogout()
          break
      }
    },
    [handleLogout],
  )

  return (
    <>
      <div className="header">
        <div className="header__logoHolder">
          <img src={logoSrc} alt="logo" />
        </div>
        <div className="right-side">
          {!isContextLoading && currentUserHcp && (
            <Dropdown menu={{ items, onClick }} placement="bottomRight" arrow onOpenChange={setUserDropdownOpen}>
              <div className={`header__userDropdown ${isUserDropdownOpen ? 'header__userDropdown--active' : ''}`}>
                <div className="header__userDropdown__heading">
                  <p className="header__userDropdown__heading__name">{`${currentUserHcp.firstName ?? ''} ${currentUserHcp.lastName ?? ''}`}</p>
                </div>
                <div className="header__userDropdown__userAvatarPlaceholder">
                  <Icon component={userIcn} />
                </div>
                <div className="header__userDropdown__arrow">
                  <Icon component={arrowDownIcn} />
                </div>
              </div>
            </Dropdown>
          )}
          <LanguageSelector />
        </div>
      </div>

      {isModalManageAccountFormOpen &&
        currentUserHcp &&
        createPortal(<ModalSettings isVisible={isModalManageAccountFormOpen} onClose={() => setModalManageAccountFormOpen(false)} currentUserHcp={currentUserHcp} user={currentUser} />, document.body)}
    </>
  )
}

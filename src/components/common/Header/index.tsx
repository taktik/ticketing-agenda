import Icon from '@ant-design/icons'
import { createSelector } from '@reduxjs/toolkit'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { arrowDownIcn, logOutIcn, manageUserIcn, userIcn } from '../../../assets/CustomIcons'
import mouscronLogo from '../../../assets/mouscronLogo.png'
import { useGetHealthcarePartyQuery } from '../../../core/api/healthcarePartyApi'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import { CardinalApiState, logout } from '../../../core/services/auth.api'
import { getImgSRC } from '../../../helpers/fileToBase64'
import { ModalSettings } from '../../ModalGeneralSettings'
import { LanguageSelector } from '../LanguageSelector'
import './index.css'
import { useGetCurrentUserQuery } from '../../../core/api/userApi'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    user: cardinalApi.user,
    healthcarePartyId: cardinalApi.user?.healthcarePartyId,
  }),
)
export const Header = () => {
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false)
  const [isModalManageAccountFormOpen, setModalManageAccountFormOpen] = useState(false)
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const { healthcarePartyId } = useAppSelector(reduxSelector)

  const { data: currentUser } = useGetCurrentUserQuery(undefined, { skip: !healthcarePartyId })
  const { data: currentUserHcp, isFetching: isPractitionerFetching } = useGetHealthcarePartyQuery(healthcarePartyId ?? '', { skip: !healthcarePartyId })

  const userAvatarSrc = getImgSRC(currentUserHcp?.picture)
  const handleLogout = () => {
    dispatch(logout())
  }

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
  const onClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'manageAccount': {
        setModalManageAccountFormOpen(true)
        break
      }
      case 'logout': {
        handleLogout()
        break
      }
    }
  }

  return (
    <>
      <div className="header">
        <div className="header__logoHolder">
          <img src={mouscronLogo} alt="mouscron logo" />
        </div>
        <div className="right-side">
          {!isPractitionerFetching && (
            <Dropdown menu={{ items, onClick }} placement="bottomRight" arrow onOpenChange={(open: boolean) => setUserDropdownOpen(open)}>
              <div className={`header__userDropdown ${isUserDropdownOpen && 'header__userDropdown--active'}`}>
                <div className="header__userDropdown__heading">
                  <p className="header__userDropdown__heading__name">{currentUserHcp?.firstName + ' ' + currentUserHcp?.lastName}</p>
                </div>
                {userAvatarSrc ? (
                  <div className="header__userDropdown__picture">
                    <img src={userAvatarSrc} alt={currentUser?.name ?? 'Dear User!'} />
                  </div>
                ) : (
                  <div className="header__userDropdown__userAvatarPlaceholder">
                    <Icon component={userIcn} />
                  </div>
                )}
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
        createPortal(<ModalSettings isVisible={isModalManageAccountFormOpen} onClose={() => setModalManageAccountFormOpen(false)} currentUserHcp={currentUserHcp} user={currentUser} />, document.body)}
    </>
  )
}

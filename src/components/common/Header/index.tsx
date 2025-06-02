import Icon from '@ant-design/icons'
import { createSelector } from '@reduxjs/toolkit'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { arrowDownIcn, logOutIcn, manageUserIcn, userIcn } from '../../../assets/CustomIcons'
import mouscronLogo from '../../../assets/mouscronLogo.png'
import { useGetPractitionerQuery } from '../../../core/api/practitionerApi'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import { CardinalApiState, logout } from '../../../core/services/auth.api'
import { getImgSRC } from '../../../helpers/fileToBase64'
import { ModalSettings } from '../../ModalUserSettings'
import { LanguageSelector } from '../LanguageSelector'
import './index.css'

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

  const { user, healthcarePartyId } = useAppSelector(reduxSelector)

  const { data: practitioner, isFetching: isPractitionerFetching } = useGetPractitionerQuery(healthcarePartyId ?? '', { skip: !healthcarePartyId })

  const userAvatarSrc = getImgSRC(practitioner?.picture)
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
                  <p className="header__userDropdown__heading__name">{practitioner?.firstName + ' ' + practitioner?.lastName}</p>
                </div>
                {userAvatarSrc ? (
                  <div className="header__userDropdown__picture">
                    <img src={userAvatarSrc} alt={user?.name ?? 'Dear User!'} />
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
      {isModalManageAccountFormOpen && createPortal(<ModalSettings isVisible={isModalManageAccountFormOpen} onClose={() => setModalManageAccountFormOpen(false)} currentUser={practitioner} />, document.body)}
    </>
  )
}

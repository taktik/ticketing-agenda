import Icon from '@ant-design/icons'
import { createSelector } from '@reduxjs/toolkit'
import logo_mouscron from '../../assets/logo_mouscron.png'
import './index.css'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { arrowDownIcn, logOutIcn, manageUserIcn, userIcn } from '../../../assets/CustomIcons'
import logo_horizontal from '../../../assets/logo_horizontal.svg'
import { useGetPractitionerQuery } from '../../../core/api/practitionerApi'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import { CardinalApiState, logout } from '../../../core/services/auth.api'
import { getImgSRC } from '../../../helpers/fileToBase64'
import { ModalManageAccountForm } from '../../doctor/ModalManageAccountForm'

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
          <span>Manage account</span>
        </div>
      ),
    },
    {
      key: 'logout',
      danger: true,
      label: (
        <div className="header__userDropdown__item">
          <Icon component={logOutIcn} />
          <span>Log out</span>
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
      {/*<div className="headerBanner">*/}
      {/*  <p>*/}
      {/*  </p>*/}
      {/*</div>*/}

      <div className="header">
        <div className="header__logoHolder">
          <img src={logo_mouscron} alt="mouscron logo" />
        </div>
        {!isPractitionerFetching && (
          <Dropdown menu={{ items, onClick }} placement="bottomRight" arrow onOpenChange={(open: boolean) => setUserDropdownOpen(open)}>
            <div className={`header__userDropdown ${isUserDropdownOpen && 'header__userDropdown--active'}`}>
              <div className="header__userDropdown__heading">
                <p className="header__userDropdown__heading__name">{practitioner?.firstName + ' ' + practitioner?.lastName}</p>
                <p className="header__userDropdown__heading__speciality">{practitioner?.speciality ?? 'Speciality'}</p>
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
      </div>
      {isModalManageAccountFormOpen &&
        createPortal(
          <ModalManageAccountForm isVisible={isModalManageAccountFormOpen} onClose={() => setModalManageAccountFormOpen(false)} practitionerToBeUpdated={practitioner} />,
          document.body,
        )}
    </>
  )
}

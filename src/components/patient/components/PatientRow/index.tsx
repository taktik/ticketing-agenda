import Icon from '@ant-design/icons'
import { DecryptedPatient } from '@icure/cardinal-sdk'
import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Dropdown, MenuProps, message, notification, Tag, Tooltip } from 'antd'
import React, { ReactElement, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { deleteIcn, emailIcn, manageUserIcn, moreVerticalIcn, shareIcn, stethoscopeIcn, userAvatarPlaceholderIcn, userIcn } from '../../../../assets/CustomIcons'
import { useDeletePatientMutation } from '../../../../core/api/patientApi'
import { useCreateUserMutation } from '../../../../core/api/userApi'
import { getImgSRC } from '../../../../helpers/fileToBase64'
import { getTagColor } from '../../../../helpers/getTagColor'
import { getPatientDataFormated } from '../../../../helpers/patientDataManipulations'
import { ModalConfirmAction } from '../../../common/ModalConfirmAction'
import { ModalAddConsultationForm } from '../../modals/ModalAddConsultationForm'
import { ModalPatientForm } from '../../modals/ModalPatientForm'
import { ModalPatientProfile } from '../../modals/ModalPatientProfile'
import './index.css'
import { ModalSharePatient } from '../../modals/ModalSharePatient'

interface PatientRowProps {
  patient: DecryptedPatient
}

export const PatientRow = ({ patient }: PatientRowProps): ReactElement => {
  const [isOverFlowMenuOpen, setOverFlowMenuOpen] = useState(false)
  const [isPatientFormModalOpen, setPatientFormModalOpen] = useState(false)
  const [isAddConsultationModalOpen, setAddConsultationModalOpen] = useState(false)
  const [isPatientProfileModalOpen, setPatientProfileModalOpen] = useState(false)
  const [isPatientToBeDeleted, setPatientToBeDeleted] = useState(false)
  const [isSharePatientModalOpen, setSharePatientModalOpen] = useState(false)

  const [invitePatient, { error: invitePatientError, isError: isInvitePatientError, isSuccess: isPatientInvitedSuccessfully, isLoading: isPatientInvitingLoading }] =
    useCreateUserMutation()
  const [deletePatient, { isError: isDeletePatientError, isSuccess: isPatientDeletedSuccessfully, isLoading: isPatientDeletingLoading }] = useDeletePatientMutation()

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  useEffect(() => {
    if (isPatientInvitingLoading) showMessageFeedback('loading', 'The invite mail is sending...')
    if (isPatientInvitedSuccessfully) showMessageFeedback('success', 'The invite mail was sent!')
    if (isInvitePatientError)
      openNotification(
        'error',
        'Cannot invite the patient!',
        `An error occurred while sending the invitation letter. ${(invitePatientError as FetchBaseQueryError)?.data ?? invitePatientError}`,
      )

    if (isPatientDeletingLoading) showMessageFeedback('loading', 'The patient is deleting...')
    if (isPatientDeletedSuccessfully) showMessageFeedback('success', 'The patient was deleted!')
    if (isDeletePatientError)
      openNotification(
        'error',
        'We could not delete the patient!',
        `An error occurred while deleting the patient. ${(invitePatientError as FetchBaseQueryError)?.data ?? invitePatientError}`,
      )
  }, [isPatientInvitingLoading, isPatientInvitedSuccessfully, isInvitePatientError, isDeletePatientError])

  const items: MenuProps['items'] = [
    {
      key: 'invite_patient',
      label: (
        <div className="patientRow__btnGroup__item__dropdownRow">
          <div className="patientRow__btnGroup__item__dropdownRow__icn">
            <Icon component={emailIcn} />
          </div>
          <span>Send invitation email</span>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'add_consultation',
      label: (
        <div className="patientRow__btnGroup__item__dropdownRow">
          <div className="patientRow__btnGroup__item__dropdownRow__icn">
            <Icon component={stethoscopeIcn} />
          </div>
          <span>Add consultation</span>
        </div>
      ),
    },
    {
      key: 'view_profile',
      label: (
        <div className="patientRow__btnGroup__item__dropdownRow">
          <div className="patientRow__btnGroup__item__dropdownRow__icn">
            <Icon component={userIcn} />
          </div>
          <span>View profile</span>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'edit_patient',
      label: (
        <div className="patientRow__btnGroup__item__dropdownRow">
          <div className="patientRow__btnGroup__item__dropdownRow__icn">
            <Icon component={manageUserIcn} />
          </div>
          <span>Edit patient</span>
        </div>
      ),
    },
    {
      key: 'share_patient',
      label: (
        <div className="patientRow__btnGroup__item__dropdownRow">
          <div className="patientRow__btnGroup__item__dropdownRow__icn">
            <Icon component={shareIcn} />
          </div>
          <span>Share patient</span>
        </div>
      ),
    },
    {
      key: 'delete_patient',
      danger: true,
      label: (
        <div className="patientRow__btnGroup__item__dropdownRow patientRow__btnGroup__item__dropdownRow--danger">
          <div className="patientRow__btnGroup__item__dropdownRow__icn">
            <Icon component={deleteIcn} />
          </div>
          <span>Delete patient</span>
        </div>
      ),
    },
  ]
  const onClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'add_consultation': {
        setAddConsultationModalOpen(true)
        break
      }
      case 'share_patient': {
        setSharePatientModalOpen(true)
        break
      }
      case 'view_profile': {
        setPatientProfileModalOpen(true)
        break
      }
      case 'edit_patient': {
        setPatientFormModalOpen(true)
        break
      }
      case 'invite_patient': {
        if (emailAddress && userNameOneString) invitePatient({ email: emailAddress, id: patient.id, name: userNameOneString })
        break
      }
      case 'delete_patient': {
        setPatientToBeDeleted(true)
        break
      }
    }
  }

  const { picture, userDateOfBirthOneString, userNameOneString, phoneNumber, tags, emailAddress, userHomeAddressOneString } = getPatientDataFormated(patient)

  const patientAvatarSrc = getImgSRC(picture)

  return (
    <>
      {notificationContextHolder}
      {messageContextHolder}
      <div className="patientRow" onClick={() => setPatientProfileModalOpen(true)}>
        {patientAvatarSrc ? (
          <div className="patientRow__picture">
            <img src={patientAvatarSrc} alt={`${userNameOneString} picture`} />
          </div>
        ) : (
          <div className="patientRow__userAvatarPlaceholder">
            <Icon component={userAvatarPlaceholderIcn} />
          </div>
        )}
        <div className="patientRow__contentDesktop">
          <div className="patientRow__contentDesktop__item patientRow__contentDesktop__item--name">
            <span className="patientRow__contentDesktop__item__title">Name:</span>
            <span className="patientRow__contentDesktop__item__value patientRow__contentDesktop__item__value--name">{userNameOneString}</span>
          </div>
          <div className="patientRow__contentDesktop__item patientRow__contentDesktop__item--language">
            <span className="patientRow__contentDesktop__item__title">Date of birth:</span>
            <span className="patientRow__contentDesktop__item__value ">{userDateOfBirthOneString}</span>
          </div>
          <div className="patientRow__contentDesktop__item patientRow__contentDesktop__item--language">
            <span className="patientRow__contentDesktop__item__title">Phone number:</span>
            <span className="patientRow__contentDesktop__item__value ">{phoneNumber}</span>
          </div>
          <div className="patientRow__contentDesktop__item patientRow__contentDesktop__item--email">
            <span className="patientRow__contentDesktop__item__title">E-mail address:</span>
            <span className="patientRow__contentDesktop__item__value">{emailAddress}</span>
          </div>
          <div className="patientRow__contentDesktop__item patientRow__contentDesktop__item--address">
            <span className="patientRow__contentDesktop__item__title">Home address:</span>
            <span className="patientRow__contentDesktop__item__value">{userHomeAddressOneString}</span>
          </div>
          <div className="patientRow__contentDesktop__item">
            <span className="patientRow__contentDesktop__item__title">Tags:</span>
            <div className="patientRow__contentDesktop__item__tagsContainer">
              {tags.map((tag, index) => (
                <Tag key={index} color={getTagColor(tag.code)} bordered={false}>
                  {tag.code}
                </Tag>
              ))}
            </div>
          </div>
        </div>
        <div className="patientRow__contentMobile">
          <span className="patientRow__contentMobile__name">{userNameOneString}</span>
          <span className="patientRow__contentMobile__value">
            {userDateOfBirthOneString},{phoneNumber}, {emailAddress}, {userHomeAddressOneString}
          </span>
          <div className="patientRow__contentMobile__tagsGroup">
            {tags.map((tag, index) => (
              <Tag key={index} color={getTagColor(tag.code)} bordered={false}>
                {tag.code}
              </Tag>
            ))}
          </div>
        </div>

        <div className="patientRow__btnGroup" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Add consultation">
            <div className="patientRow__btnGroup__item patientRow__btnGroup__item--addConsultation" onClick={() => setAddConsultationModalOpen(true)}>
              <Icon component={stethoscopeIcn} />
            </div>
          </Tooltip>
          <Dropdown menu={{ items, onClick }} placement="bottomRight" arrow onOpenChange={(open: boolean) => setOverFlowMenuOpen(open)}>
            <div className={`patientRow__btnGroup__item ${isOverFlowMenuOpen && 'patientRow__btnGroup__item--active'}`}>
              <Icon component={moreVerticalIcn} />
            </div>
          </Dropdown>
        </div>
      </div>
      {isPatientFormModalOpen &&
        createPortal(<ModalPatientForm mode="edit" patientToEdit={patient} isVisible={isPatientFormModalOpen} onClose={() => setPatientFormModalOpen(false)} />, document.body)}
      {isAddConsultationModalOpen &&
        createPortal(<ModalAddConsultationForm isVisible={isAddConsultationModalOpen} onClose={() => setAddConsultationModalOpen(false)} patient={patient} />, document.body)}
      {isPatientProfileModalOpen &&
        createPortal(
          <ModalPatientProfile
            patient={patient}
            isVisible={isPatientProfileModalOpen}
            onClose={() => setPatientProfileModalOpen(false)}
            onEdit={() => setPatientFormModalOpen(true)}
            onAddConsultation={() => setAddConsultationModalOpen(true)}
          />,
          document.body,
        )}
      {isPatientToBeDeleted &&
        createPortal(
          <ModalConfirmAction
            title="Delete patient"
            description="Are you sure you want to delete this patient? Once deleted, their information can't be recovered, so it's a permanent action."
            yesBtnTitle="Delete"
            noBtnTitle="Close"
            onYesClick={() => {
              deletePatient(patient)
              setPatientToBeDeleted(false)
            }}
            onNoClick={() => setPatientToBeDeleted(false)}
            isVisible={isPatientToBeDeleted}
            mode="danger"
          />,
          document.body,
        )}
      {isSharePatientModalOpen &&
        createPortal(<ModalSharePatient isVisible={isSharePatientModalOpen} onClose={() => setSharePatientModalOpen(false)} patientToEdit={patient} />, document.body)}
    </>
  )
}

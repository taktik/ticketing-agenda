import Icon from '@ant-design/icons'
import { DecryptedPatient } from '@icure/cardinal-sdk'
import { createSelector } from '@reduxjs/toolkit'
import { Tag } from 'antd'
import React, { ReactElement } from 'react'
import { emailIcn, locationIcn, phoneIcn, userAvatarPlaceholderIcn } from '../../../../assets/CustomIcons'
import { useFindContactsByHcPartyPatientQuery } from '../../../../core/api/contactApi'
import { useAppSelector } from '../../../../core/hooks'
import { CardinalApiState } from '../../../../core/services/auth.api'
import { formatTimestampToHumanReadable } from '../../../../helpers/dateFormaters'
import { getImgSRC } from '../../../../helpers/fileToBase64'
import { getTagColor } from '../../../../helpers/getTagColor'
import { getPatientDataFormated } from '../../../../helpers/patientDataManipulations'
import { CommonPlaceholder } from '../../../common/CommonPlaceholder'

import { CustomModal } from '../../../common/CustomModal'
import './index.css'
import { SpinLoader } from '../../../common/SpinLoader'
import { Consultation } from './Consultation'

interface ModalPatientProfileProps {
  isVisible: boolean
  patient: DecryptedPatient
  onClose: () => void
  onEdit: () => void
  onAddConsultation: () => void
}

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    healthcarePartyId: cardinalApi.user?.healthcarePartyId,
  }),
)

export const ModalPatientProfile = ({ isVisible, onClose, patient, onEdit, onAddConsultation }: ModalPatientProfileProps): ReactElement => {
  const { healthcarePartyId } = useAppSelector(reduxSelector)
  const { language, picture, userNameOneString, userHomeAddressOneString, emailAddress, phoneNumber, birthSex, userDateOfBirthOneString, tags, age } =
    getPatientDataFormated(patient)
  const { data: listOfContacts, isLoading: isListOfContactsLoading } = useFindContactsByHcPartyPatientQuery(
    {
      hcPartyId: healthcarePartyId ?? '',
      patient,
    },
    { skip: !healthcarePartyId },
  )

  const sortedContacts = [...(listOfContacts ?? [])]?.sort((a, b) => (b.openingDate ?? 0) - (a.openingDate ?? 0))

  const patientAvatarSrc = getImgSRC(picture)

  return (
    <CustomModal
      isVisible={isVisible}
      handleClose={onClose}
      title="Patient profile"
      secondaryBtnTitle="Edit patient"
      handleClickSecondaryBtn={onEdit}
      primaryBtnTitle="Start consultation"
      handleClickPrimaryBtn={onAddConsultation}
      width={1000}
    >
      <div className="modalPatienProfile">
        {<SpinLoader /> && (isListOfContactsLoading || (listOfContacts?.length !== 0 && sortedContacts?.length === 0))}
        <div className="modalPatienProfile__innerContainer">
          <div className="modalPatienProfile__shortInfo">
            <div className="modalPatienProfile__shortInfo__leftBlock">
              <div className="modalPatienProfile__shortInfo__intro">
                {patientAvatarSrc ? (
                  <div className="modalPatienProfile__shortInfo__intro__photo">
                    <img src={patientAvatarSrc} alt="patientPicture" />
                  </div>
                ) : (
                  <div className="modalPatienProfile__shortInfo__intro__userAvatarPlaceholder">
                    <Icon component={userAvatarPlaceholderIcn} />
                  </div>
                )}
                <h3 className="modalPatienProfile__shortInfo__name">{userNameOneString}</h3>
              </div>
              <div className="modalPatienProfile__shortInfo__contactDetails">
                <h4>Contact Details:</h4>
                <div className="modalPatienProfile__shortInfo__contactDetails__itemsContainer">
                  <div className="modalPatienProfile__shortInfo__contactDetails__item">
                    <Icon component={phoneIcn} />
                    <p>{phoneNumber}</p>
                  </div>
                  <div className="modalPatienProfile__shortInfo__contactDetails__item">
                    <Icon component={emailIcn} />
                    <p>{emailAddress}</p>
                  </div>
                  <div className="modalPatienProfile__shortInfo__contactDetails__item">
                    <Icon component={locationIcn} />
                    <p>{userHomeAddressOneString}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modalPatienProfile__shortInfo__rightBlock">
              <div className="modalPatienProfile__shortInfo__overview">
                <h4>Overview:</h4>
                <div className="modalPatienProfile__shortInfo__overview__itemsWrap">
                  <div className="modalPatienProfile__shortInfo__overview__item">
                    <h5>Date of birth:</h5>
                    <p>{userDateOfBirthOneString}</p>
                  </div>
                  <div className="modalPatienProfile__shortInfo__overview__item">
                    <h5>Age:</h5>
                    <p>{age}</p>
                  </div>
                  <div className="modalPatienProfile__shortInfo__overview__item">
                    <h5>Sex at birth:</h5>
                    <p>{birthSex}</p>
                  </div>
                  <div className="modalPatienProfile__shortInfo__overview__item">
                    <h5>Language:</h5>
                    <p>{language}</p>
                  </div>
                </div>
              </div>

              <div className="modalPatienProfile__shortInfo__overview">
                <h4>Tags:</h4>
                <div className="modalPatienProfile__shortInfo__overview__tags">
                  {tags.map((tag, index) => (
                    <Tag key={index} color={getTagColor(tag.code)} bordered={false}>
                      {tag.code}
                    </Tag>
                  ))}
                </div>
              </div>

              <div className="modalPatienProfile__shortInfo__overview">
                <h4>Visit history:</h4>
                <div className="modalPatienProfile__shortInfo__overview__itemsWrap">
                  <div className="modalPatienProfile__shortInfo__overview__item">
                    <h5>Previous visit:</h5>
                    <p>{sortedContacts?.[0]?.openingDate ? formatTimestampToHumanReadable(sortedContacts[0].openingDate) : '-'}</p>
                  </div>
                  <div className="modalPatienProfile__shortInfo__overview__item">
                    <h5>Next visit:</h5>
                    <p>-</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h4 className="consultationsHeading">Consultations:</h4>

          {/*Consultations*/}
          {sortedContacts?.length !== 0 && sortedContacts?.map((contact, index) => <Consultation contact={contact} key={index} />)}

          {listOfContacts?.length === 0 && (
            <CommonPlaceholder title="No Consultations Available" content="This patient has no consultations recorded. Add a new consultation to get started!" />
          )}
        </div>
      </div>
    </CustomModal>
  )
}

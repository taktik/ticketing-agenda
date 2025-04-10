import React from 'react'

import { CustomModal } from '../CustomModal'
import './index.css'

interface ModalConfirmActionProps {
  title: string
  description: string
  yesBtnTitle: string
  noBtnTitle: string
  onYesClick: () => void
  onNoClick: () => void
  isVisible: boolean
  mode?: 'danger' | undefined
}

export const ModalConfirmAction = ({ title, description, yesBtnTitle, noBtnTitle, onYesClick, onNoClick, isVisible, mode }: ModalConfirmActionProps) => {
  return (
    <CustomModal
      mode={mode}
      isVisible={isVisible}
      handleClose={onNoClick}
      secondaryBtnTitle={noBtnTitle}
      handleClickPrimaryBtn={onYesClick}
      primaryBtnTitle={yesBtnTitle}
      title={title}
    >
      <div className="modalConfirmAction">
        <p>{description}</p>
      </div>
    </CustomModal>
  )
}

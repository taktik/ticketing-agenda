import React, { useState } from 'react'

import { CustomModal } from '../CustomModal'
import './index.css'

interface ModalConfirmActionProps {
  title: string
  description: string
  yesBtnTitle: string
  noBtnTitle: string
  onYesClick: () => void | Promise<void>
  onNoClick: () => void
  isVisible: boolean
  mode?: 'danger' | undefined
  content?: React.ReactNode
}

export const ModalConfirmAction = ({ title, description, yesBtnTitle, noBtnTitle, onYesClick, onNoClick, isVisible, mode, content }: ModalConfirmActionProps) => {
  const [isExecuting, setIsExecuting] = useState(false)

  const handleYesClick = async () => {
    if (isExecuting) return
    setIsExecuting(true)
    try {
      await onYesClick()
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <CustomModal
      mode={mode}
      isVisible={isVisible}
      handleClose={onNoClick}
      secondaryBtnTitle={noBtnTitle}
      handleClickPrimaryBtn={handleYesClick}
      primaryBtnTitle={yesBtnTitle}
      primaryBtnDisabled={isExecuting}
      title={title}
    >
      <div className="modalConfirmAction">{content ? content : <p>{description}</p>}</div>
    </CustomModal>
  )
}

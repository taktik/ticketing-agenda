import { TimeTable } from '@icure/cardinal-sdk'
import React, { ReactElement } from 'react'
import { CustomModal } from '../../common/CustomModal'
import './index.css'

interface ModalRulesProps {
  isVisible: boolean
  onClose: () => void
  timeTable: TimeTable | undefined
}

export const ModalRules = ({ isVisible, onClose, timeTable }: ModalRulesProps): ReactElement => {
  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Edition d'un horaire" blockAntModalBodyVerticalScroll noFooter>
      <div className="modalSchedule">Ceci est un time table {timeTable?.name}</div>
    </CustomModal>
  )
}

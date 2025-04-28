import { AddressType, Agenda, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType } from '@icure/cardinal-sdk'
import { Form, Input, Upload, UploadFile, UploadProps, Button, Col, Divider, Row, Typography, Menu, MenuProps } from 'antd'
import ImgCrop from 'antd-img-crop'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../helpers/fileToBase64'

import { CustomModal } from '../common/CustomModal'
import { SpinLoader } from '../common/SpinLoader'
import './index.css'
import { useGetHealthcarePartiesQuery } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import { useGetTimeTablesQuery } from '../../core/api/timeTableApi'
import { SettingOutlined } from '@ant-design/icons'
import { ItemType } from 'antd/es/menu/interface'
import { normalize } from '../patient/modals/ModalImportPatients/utils/functionUtils'

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  selectedSite: HealthcareParty | undefined
}

export const ModalScheduling = ({ isVisible, onClose, selectedSite }: ModalSchedulingProps): ReactElement => {
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Liste des horaires">
      <div className="modalSheduling">test</div>
    </CustomModal>
  )
}

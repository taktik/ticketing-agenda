import { AddressType, DecryptedAddress, DecryptedTelecom, HealthcareParty, TelecomType } from '@icure/cardinal-sdk'
import { Form, UploadFile, UploadProps, Input, Upload, Button, Tabs } from 'antd'
import React, { ReactElement, useEffect, useState } from 'react'
import { useCreateOrUpdatePractitionerMutation } from '../../../../core/api/practitionerApi'
import { getFileUploaderCommonProps, getImgSRC } from '../../../../helpers/fileToBase64'
import './index.css'
import { SpinLoader } from '../../../common/SpinLoader'
import ImgCrop from 'antd-img-crop'

interface AgendaSettingProps {
  onClose: () => void
}
export const AgendaSetting = ({ onClose }: AgendaSettingProps): ReactElement => {
  const { TabPane } = Tabs
  return (
    <Tabs defaultActiveKey="1">
      <TabPane tab="Paramètres de l’agenda" key="1">
        <div>Manage account and personal info</div>
      </TabPane>
      <TabPane tab="Portail de rendez-vous" key="2">
        <div>Manage calendar preferences</div>
      </TabPane>
    </Tabs>
  )
}

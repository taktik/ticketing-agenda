import { TelecomType } from '@icure/cardinal-sdk'
import { createSelector } from '@reduxjs/toolkit'
import { Alert, Button, Popconfirm, Typography } from 'antd'
import React from 'react'
import { useGetPractitionerQuery } from '../../../core/api/practitionerApi'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'

import { CardinalApiState, setNewlyCreatedRecoveryKey } from '../../../core/services/auth.api'
import { CopyJSONButton } from '../../common/CopyJSONButton'
import './index.css'
import { CustomModal } from '../../common/CustomModal'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    newlyCreatedRecoveryKey: cardinalApi.newlyCreatedRecoveryKey,
    healthcarePartyId: cardinalApi.user?.healthcarePartyId,
  }),
)

export const ModalRecoveryKey = () => {
  const { newlyCreatedRecoveryKey, healthcarePartyId } = useAppSelector(reduxSelector)
  const dispatch = useAppDispatch()
  const { data: practitioner, isFetching: isPractitionerFetching } = useGetPractitionerQuery(healthcarePartyId ?? '', { skip: !healthcarePartyId })

  const practitionerEmail = practitioner?.addresses[0].telecoms.find((item) => item.telecomType === TelecomType.Email)?.telecomNumber
  const jsonTitle = `PetraCare_RecoveryKey_${practitioner?.firstName}_${practitioner?.lastName}`
  const jsonData = {
    petraCare: {
      accountEmail: practitionerEmail,
      accountName: practitioner?.firstName + ' ' + practitioner?.lastName,
      recoveryKey: newlyCreatedRecoveryKey,
    },
  }

  const defaultOnClose = () => dispatch(setNewlyCreatedRecoveryKey({ recoveryKey: undefined }))
  const getCustomFooter = () => {
    return [
      <Popconfirm
        key="confirmClose"
        title="Close this window?"
        description={
          <div className="modalCryptographicKeypair__popconfirm">
            <p>The Recovery Key won’t be available in PetraCare anymore.</p>
            <p>Make sure it’s securely saved before proceeding.</p>
          </div>
        }
        onConfirm={() => defaultOnClose()}
        okText="Yes"
        cancelText="No"
        placement="topRight"
      >
        <Button key="back">Close</Button>
      </Popconfirm>,

      <Button key="submit" type="primary" disabled={isPractitionerFetching}>
        <CopyJSONButton jsonData={jsonData} jsonName={jsonTitle} buttonTitle="Download the key as a JSON" />
      </Button>,
    ]
  }
  return (
    <CustomModal closable={false} isVisible={!!newlyCreatedRecoveryKey} title={'Your Recovery Key'} handleClose={() => console.log('handleClose')} customFooter={getCustomFooter()}>
      <div className="modalRecoveryKey">
        <Alert message=" 🎉 Welcome to PetraCare!" description="You have been successfully registered!" type="success" />
        <Alert
          message="🚨 Important: Save Your Recovery Key!"
          description={
            <ul>
              <li>
                <span className="highlighted">Access on Other Devices:</span>
                You will need this Recovery Key to log in to your account on a new device.
              </li>
              <li>
                <span className="highlighted">Save It Now:</span>
                This key will not be shown again, as we do not store it on our servers.
              </li>
              <li>
                <span className="highlighted">Keep It Safe:</span>
                Store your Recovery Key securely and never share it with anyone.
              </li>
              <li>
                <span className="highlighted">No Key, No Access:</span>
                If you lose this key, you will lose access to your data permanently.
              </li>
            </ul>
          }
          type="error"
        />
        <Alert
          message="Recovery Key"
          description={
            <Typography.Paragraph className="values-token" copyable={{ text: newlyCreatedRecoveryKey }}>
              {newlyCreatedRecoveryKey}
            </Typography.Paragraph>
          }
          type="info"
        />
      </div>
    </CustomModal>
  )
}

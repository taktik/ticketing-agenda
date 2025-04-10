import { createSelector } from '@reduxjs/toolkit'
import { Alert, Form, Input } from 'antd'
import React from 'react'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import { CardinalApiState, markRecoveryKeyAsLost, provideRecoveryKey } from '../../../core/services/auth.api'

import { CustomModal } from '../../common/CustomModal'
import './index.css'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    recoveryKeyRequest: cardinalApi.recoveryKeyRequest,
  }),
)

export const ModalRecoveryKeyRequest = ({}) => {
  const [form] = Form.useForm()

  const dispatch = useAppDispatch()
  const { recoveryKeyRequest } = useAppSelector(reduxSelector)

  const handleSubmit = ({ recoveryKey }: { recoveryKey: string }) => {
    dispatch(provideRecoveryKey({ recoveryKey }))
  }

  return (
    <CustomModal
      isVisible={true}
      handleClose={() => {
        dispatch(markRecoveryKeyAsLost())
      }}
      secondaryBtnTitle={'Skip'}
      handleClickPrimaryBtn={() => form.submit()}
      primaryBtnTitle={'Submit'}
      title={'Provide your recovery key'}
    >
      <div className="modalRecoveryKeyRequest">
        <Alert
          message={
            <>
              <p>We couldn’t find the encryption key needed to access your sensitive data. Please enter the key you received when creating your account.</p>
              <p>
                [<span className="highlighted">Reason:</span> {recoveryKeyRequest?.reason ?? 'Undefined'}]
              </p>
            </>
          }
          type="error"
          showIcon
        />

        <Form className="modalRecoveryKeyRequest__form" layout="vertical" colon={false} form={form} onFinish={(values) => handleSubmit(values)}>
          <Form.Item name="recoveryKey" label="Recovery key" rules={[{ required: true, message: 'Recovery key is required' }]}>
            <Input placeholder="Recovery key" size="large" />
          </Form.Item>
        </Form>
      </div>
    </CustomModal>
  )
}

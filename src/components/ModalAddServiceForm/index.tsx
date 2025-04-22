import { Form, Input } from 'antd'
import { SetStateAction, useEffect } from 'react'
import { v4 } from 'uuid'
import './index.css'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { CustomModal } from '../common/CustomModal'
import React from 'react'
import { useCreateHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'

interface ModalAddServiceFormProps {
  isVisible: boolean
  onClose: () => void
}

export const ModalAddServiceForm = ({ isVisible, onClose }: ModalAddServiceFormProps) => {
  const [form] = Form.useForm()

  const [
    createHealthcareParty,
    {
      data: newHealthcareParty,
      error: healthcarePartyCreationError,
      isError: healthcarePartyCreationFailed,
      isSuccess: healthcarePartyCreationSucceeded,
      isLoading: healthcarePartyCreationOngoing,
    },
  ] = useCreateHealthcarePartyMutation()

  const handleSubmit = () => {
    createHealthcareParty(new HealthcareParty({ ...form.getFieldsValue(), tags: [{ type: 'SERVICE' }], id: v4() }))
    form.submit()
  }

  useEffect(() => {
    if (healthcarePartyCreationSucceeded) {
      console.log('Service created successfully: ', newHealthcareParty)
      onClose()
    }
  }, [healthcarePartyCreationSucceeded])

  return (
    <CustomModal
      isVisible={isVisible}
      handleClose={() => {
        form.resetFields()
        onClose()
      }}
      secondaryBtnTitle="Cancel"
      handleClickPrimaryBtn={() => handleSubmit()}
      primaryBtnTitle="Save"
      title="Add service"
    >
      <div className="modalAddForm">
        <Form className="modalAddForm__form" layout="vertical" colon={false} form={form}>
          <div className="modalAddForm__form__inputs">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name of the service' }]}>
              <Input placeholder="Type the service's name" size="large" style={{ fontSize: 13 }} />
            </Form.Item>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

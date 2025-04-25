import { Form, Input } from 'antd'
import { SetStateAction, useEffect } from 'react'
import { v4 } from 'uuid'
import './index.css'
import { HealthcareParty } from '@icure/cardinal-sdk'
import { CustomModal } from '../common/CustomModal'
import React from 'react'
import { useCreateUpdateHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'

interface ModalServiceFormProps {
  isVisible: boolean
  onClose: () => void
  selectedService: HealthcareParty | undefined
  modalMode: 'add' | 'edit'
}

export const ModalServiceForm = ({ isVisible, onClose, selectedService, modalMode }: ModalServiceFormProps) => {
  const [form] = Form.useForm()

  const [createUpdateHealthcareParty, { data, error, isError, isSuccess, isLoading }] = useCreateUpdateHealthcarePartyMutation()

  const handleSubmit = () => {
    const { name } = form.getFieldsValue()
    if (modalMode === 'add') {
      createUpdateHealthcareParty(new HealthcareParty({ ...form.getFieldsValue(), tags: [{ type: 'SERVICE' }], id: v4() }))
    } else {
      createUpdateHealthcareParty(new HealthcareParty({ ...selectedService, name: name }))
    }
    form.submit()
  }

  useEffect(() => {
    if (isSuccess) {
      const successMessage = modalMode === 'add' ? 'Service created successfully: ' : 'Service modified successfully: '
      console.log(successMessage, data)
      onClose()
    }
  }, [isSuccess])

  return (
    <CustomModal
      isVisible={isVisible}
      primaryBtnTitle="Save"
      secondaryBtnTitle="Cancel"
      deleteBtnTitle={modalMode === 'edit' ? 'Delete' : undefined}
      handleClickPrimaryBtn={() => handleSubmit()}
      handleClose={() => {
        form.resetFields()
        onClose()
      }}
      handleClickDeleteBtn={modalMode === 'edit' ? () => console.log('delete') : undefined}
      title={modalMode === 'add' ? 'Add service' : 'Edit service'}
    >
      <div className="modalAddForm">
        <Form
          className="modalAddForm__form"
          layout="vertical"
          colon={false}
          form={form}
          initialValues={{
            name: modalMode === 'add' ? undefined : selectedService?.name,
          }}
        >
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

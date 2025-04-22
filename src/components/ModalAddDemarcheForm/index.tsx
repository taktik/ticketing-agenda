import { Form, Input } from 'antd'
import { SetStateAction, useEffect } from 'react'
import { v4 } from 'uuid'
import './index.css'
import { Agenda, HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { CustomModal } from '../common/CustomModal'
import React from 'react'
import { useCreateHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'
import { useCreateTimeTableMutation } from '../../core/api/timeTableApi'

interface ModalAddDemarcheFormProps {
  isVisible: boolean
  onClose: () => void
  selectedService: HealthcareParty | undefined
  selectedSite: Agenda | undefined
}

export const ModalAddDemarcheForm = ({ isVisible, onClose, selectedService, selectedSite }: ModalAddDemarcheFormProps) => {
  const [form] = Form.useForm()

  const [createDemarche, { data, error, isError, isSuccess, isLoading }] = useCreateTimeTableMutation()

  const handleSubmit = () => {
    if (selectedService && selectedSite) {
      console.log('selectedService', selectedService)
      createDemarche(new TimeTable({ ...form.getFieldsValue(), tags: [{ type: `service-${selectedService.id}` }], id: v4(), agendaId: selectedSite.id }))
      form.submit()
    }
  }

  useEffect(() => {
    if (isSuccess) {
      console.log('Demarche created successfully: ', data)
      onClose()
    }
  }, [isSuccess])

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
      title="Add demarche"
    >
      <div className="modalAddForm">
        <Form className="modalAddForm__form" layout="vertical" colon={false} form={form}>
          <div className="modalAddForm__form__inputs">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name of the demarche' }]}>
              <Input placeholder="Type the demarche's name" size="large" style={{ fontSize: 13 }} />
            </Form.Item>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

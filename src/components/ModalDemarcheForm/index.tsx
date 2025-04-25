import { Form, Input } from 'antd'
import { SetStateAction, useEffect } from 'react'
import { v4 } from 'uuid'
import './index.css'
import { Agenda, HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { CustomModal } from '../common/CustomModal'
import React from 'react'
import { useCreateUpdateHealthcarePartyMutation } from '../../core/api/healthcarePartyApi'
import { useCreateUpdateTimeTableMutation } from '../../core/api/timeTableApi'

interface ModalDemarcheFormProps {
  isVisible: boolean
  onClose: () => void
  selectedService: HealthcareParty | undefined
  selectedSite: Agenda | undefined
  selectedDemarche: TimeTable | undefined
  modalMode: 'add' | 'edit'
}

export const ModalDemarcheForm = ({ isVisible, onClose, selectedService, selectedSite, selectedDemarche, modalMode }: ModalDemarcheFormProps) => {
  const [form] = Form.useForm()

  const [createUpdateDemarche, { data, error, isError, isSuccess, isLoading }] = useCreateUpdateTimeTableMutation()

  const handleSubmit = () => {
    if (selectedSite) {
      const { name } = form.getFieldsValue()
      if (modalMode === 'add' && selectedService) {
        createUpdateDemarche(new TimeTable({ ...form.getFieldsValue(), tags: [{ type: `service-${selectedService.id}` }], id: v4(), agendaId: selectedSite.id }))
      } else if (modalMode === 'edit') {
        createUpdateDemarche(new TimeTable({ ...selectedDemarche, name: name }))
      }
      form.submit()
    }
  }

  useEffect(() => {
    if (isSuccess) {
      const successMessage = modalMode === 'add' ? 'Demarche created successfully: ' : 'Demarche modified successfully: '
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
      title={modalMode === 'add' ? 'Add demarche' : 'Edit demarche'}
    >
      <div className="modalAddForm">
        <Form
          className="modalAddForm__form"
          layout="vertical"
          colon={false}
          form={form}
          initialValues={{
            name: modalMode === 'add' ? undefined : selectedDemarche?.name,
          }}
        >
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

import { Form, Input } from 'antd'
import { useEffect } from 'react'
import { v4 } from 'uuid'
import './index.css'
import { Agenda } from '@icure/cardinal-sdk'
import { CustomModal } from '../common/CustomModal'
import { useCreateUpdateAgendaMutation } from '../../core/api/agendaApi'
import React from 'react'

interface ModalSiteFormProps {
  isVisible: boolean
  onClose: () => void
  selectedSite: Agenda | undefined
  modalMode: 'add' | 'edit'
}

export const ModalSiteForm = ({ isVisible, onClose, selectedSite, modalMode }: ModalSiteFormProps) => {
  const [form] = Form.useForm()

  const [createAgenda, { data: newAgenda, error: agendaCreationError, isError: agendaCreationFailed, isSuccess: agendaCreationSucceeded, isLoading: agendaCreationOngoing }] =
    useCreateUpdateAgendaMutation()

  const handleSubmit = () => {
    const { name } = form.getFieldsValue()
    createAgenda(new Agenda(modalMode === 'add' ? { name: name, id: v4() } : { ...selectedSite, name: name }))

    form.submit()
  }

  useEffect(() => {
    if (agendaCreationSucceeded) {
      const successMessage = modalMode === 'add' ? 'Site created successfully: ' : 'Site modified successfully: '
      console.log(successMessage, newAgenda)
      onClose()
    }
  }, [agendaCreationSucceeded])

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
      title={modalMode === 'add' ? 'Add site' : 'Edit site'}
    >
      <div className="modalAddAgendaForm">
        <Form
          className="modalAddAgendaForm__form"
          layout="vertical"
          colon={false}
          form={form}
          initialValues={{
            name: modalMode === 'add' ? undefined : selectedSite?.name,
          }}
        >
          <div className="modalAddAgendaForm__form__inputs">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name of the site' }]}>
              <Input placeholder="Type the site's name" size="large" style={{ fontSize: 13 }} />
            </Form.Item>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

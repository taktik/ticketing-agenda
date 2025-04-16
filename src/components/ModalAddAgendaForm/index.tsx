import { Form, Input } from 'antd'
import { useEffect } from 'react'
import { v4 } from 'uuid'
import './index.css'
import { Agenda } from '@icure/cardinal-sdk'
import { CustomModal } from '../common/CustomModal'
import { useCreateAgendaMutation } from '../../core/api/agendaApi'
import React from 'react'

interface ModalAddAgendaFormProps {
  isVisible: boolean
  onClose: () => void
}

export const ModalAddAgendaForm = ({ isVisible, onClose }: ModalAddAgendaFormProps) => {
  const [form] = Form.useForm()

  const [createAgenda, { data: newAgenda, error: agendaCreationError, isError: agendaCreationFailed, isSuccess: agendaCreationSucceeded, isLoading: agendaCreationOngoing }] =
    useCreateAgendaMutation()

  const handleSubmit = () => {
    createAgenda(new Agenda({ ...form.getFieldsValue(), id: v4() }))
    form.submit()
  }

  useEffect(() => {
    if (agendaCreationSucceeded) {
      console.log('Site created successfully: ', newAgenda)
      onClose()
    }
  }, [agendaCreationSucceeded])

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
      title="Add site"
    >
      <div className="modalAddAgendaForm">
        <Form className="modalAddAgendaForm__form" layout="vertical" colon={false} form={form}>
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

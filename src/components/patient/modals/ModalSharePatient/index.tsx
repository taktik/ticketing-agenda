import { DecryptedPatient } from '@icure/cardinal-sdk'
import { Form } from 'antd'
import React, { ReactElement } from 'react'
import { useSharePatientWithMutation } from '../../../../core/api/patientApi'
import { CustomModal } from '../../../common/CustomModal'
import './index.css'
import { SpinLoader } from '../../../common/SpinLoader'
import { DevicesSelect } from '../../components/DevicesSelect'
import { PractitionersSelect } from '../../components/PractitionersSelect'

interface ModalPatientFormProps {
  isVisible: boolean
  onClose: () => void
  patientToEdit: DecryptedPatient
}

export const ModalSharePatient = ({ isVisible, onClose, patientToEdit }: ModalPatientFormProps): ReactElement => {
  const [form] = Form.useForm()

  const [sharePatient, { error: sharePatientError, isError: isSharePatientError, isLoading: isSharePatientLoading }] = useSharePatientWithMutation()

  if (isSharePatientError) console.error(sharePatientError)

  const handleOnClose = () => {
    form.resetFields()
    onClose()
  }

  const handleOnOk = (values: { selectedDoctors: { value: string; label: string }[]; selectedDevices: { value: string; label: string }[] }) => {
    if (values.selectedDoctors !== undefined) {
      values.selectedDoctors.map((el) => sharePatient({ patient: new DecryptedPatient(patientToEdit), delegateId: el.value }))
    }
    if (values.selectedDevices !== undefined) {
      values.selectedDevices?.map((el) => sharePatient({ patient: new DecryptedPatient(patientToEdit), delegateId: el.value }))
    }

    form.resetFields()
    onClose()
  }

  return (
    <CustomModal
      isVisible={isVisible}
      handleClose={handleOnClose}
      secondaryBtnTitle="Cancel"
      handleClickPrimaryBtn={() => form.submit()}
      primaryBtnTitle="Save"
      title="Share patient"
    >
      <div className="modalSharePatient">
        {isSharePatientLoading && <SpinLoader />}
        <Form className="modalSharePatient__form" layout="vertical" colon={false} form={form} onFinish={(values) => handleOnOk(values)}>
          <div className="modalSharePatient__form__inputs">
            <Form.Item name="selectedDoctors" label="Select healthcare professionals">
              <PractitionersSelect />
            </Form.Item>
            <Form.Item name="selectedDevices" label="Select devices">
              <DevicesSelect />
            </Form.Item>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

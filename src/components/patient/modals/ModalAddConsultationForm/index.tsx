import { DecryptedContact, DecryptedContent, DecryptedHealthElement, DecryptedPatient, DecryptedService, DecryptedSubContact, Identifier, Measure } from '@icure/cardinal-sdk'
import { createSelector } from '@reduxjs/toolkit'
import { DatePicker, Form, Input, InputNumber } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { useCreateContactMutation } from '../../../../core/api/contactApi'
import { useCreateHealthElementMutation } from '../../../../core/api/healthElementApi'
import { useGetPractitionerQuery } from '../../../../core/api/practitionerApi'
import { useAppSelector } from '../../../../core/hooks'
import { CardinalApiState } from '../../../../core/services/auth.api'
import { getNumericDate } from '../../../../helpers/dateFormaters'

import { CustomModal } from '../../../common/CustomModal'
import './index.css'
import { SpinLoader } from '../../../common/SpinLoader'

interface modalAddConsultationFormFormProps {
  isVisible: boolean
  onClose: () => void
  patient: DecryptedPatient
}

type ConsultationType = {
  complains: string
  anamnesis: string
  clinicalExam: string
  systolicPressure: number
  diastolicPressure: number
  diagnosis: string
  treatment: string
}

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    healthcarePartyId: cardinalApi.user?.healthcarePartyId,
  }),
)

export const ModalAddConsultationForm = ({ isVisible, onClose, patient }: modalAddConsultationFormFormProps) => {
  const startOfTheConsultation = getNumericDate(new Date())
  const bloodPressureMeasuringUnit = 'mmHg'
  const { healthcarePartyId } = useAppSelector(reduxSelector)
  const { data: practitioner } = useGetPractitionerQuery(healthcarePartyId ?? '', { skip: !healthcarePartyId })
  const [form] = Form.useForm()
  const [createContact, { error: createContactError, isError: isCreateContactError, isSuccess: isContactCreatedSuccessfully, isLoading: isContactCreatingLoading }] =
    useCreateContactMutation()
  const [createHealthElement, { error: createHealthElementError, isError: isCreateHealthElementError, isLoading: isHealthElementCreatingLoading }] =
    useCreateHealthElementMutation()

  if (isCreateContactError) {
    console.error(createContactError)
  }
  if (isCreateHealthElementError) {
    console.error(createHealthElementError)
  }

  useEffect(() => {
    if (isContactCreatedSuccessfully) {
      onClose()
    }
  }, [isContactCreatedSuccessfully])

  const handleSubmit = async (value: ConsultationType) => {
    const diagnosisHealthElement = new DecryptedHealthElement({
      id: uuid(),
      descr: value.diagnosis,
    })

    const createdDiagnosisHealthElement = await createHealthElement({ patient, healthElement: diagnosisHealthElement }).unwrap()

    const complainsService = new DecryptedService({
      medicalLocationId: undefined,
      id: uuid(),
      label: 'Complains',
      identifier: [new Identifier({ system: 'cardinal', value: 'complains' })],
      content: {
        en: new DecryptedContent({
          stringValue: value.complains,
        }),
      },
    })
    const anamnesisService = new DecryptedService({
      medicalLocationId: undefined,
      id: uuid(),
      label: 'Anamnesis',
      identifier: [new Identifier({ system: 'cardinal', value: 'anamnesis' })],
      content: {
        en: new DecryptedContent({
          stringValue: value.anamnesis,
        }),
      },
    })
    const clinicalExamService = new DecryptedService({
      medicalLocationId: undefined,
      id: uuid(),
      label: 'Clinical Exam',
      identifier: [new Identifier({ system: 'cardinal', value: 'clinicalExam' })],
      content: {
        en: new DecryptedContent({
          stringValue: value.clinicalExam,
        }),
      },
    })
    const bloodPressureService = new DecryptedService({
      medicalLocationId: undefined,
      id: uuid(),
      label: 'Blood pressure',
      identifier: [new Identifier({ system: 'cardinal', value: 'bloodPressure' })],
      content: {
        en: new DecryptedContent({
          ratio: [
            new Measure({
              value: value.systolicPressure,
              unit: bloodPressureMeasuringUnit,
              comment: 'systolicPressure',
            }),
            new Measure({
              value: value.diastolicPressure,
              unit: bloodPressureMeasuringUnit,
              comment: 'diastolicPressure',
            }),
          ],
        }),
      },
    })
    const treatmentService = new DecryptedService({
      medicalLocationId: undefined,
      id: uuid(),
      label: 'Treatment',
      identifier: [new Identifier({ system: 'cardinal', value: 'clinicalExam' })],
      content: {
        en: new DecryptedContent({
          stringValue: value.treatment,
        }),
      },
    })

    const contact = new DecryptedContact({
      id: uuid(),
      descr: `${practitioner?.speciality ?? 'Doctor'} consultation`,
      openingDate: startOfTheConsultation,
      services: [complainsService, anamnesisService, clinicalExamService, bloodPressureService, treatmentService],
      subContacts: [
        new DecryptedSubContact({
          descr: 'Diagnosis',
          healthElementId: createdDiagnosisHealthElement?.id,
        }),
      ],

      closingDate: getNumericDate(new Date()), // Closing the Examination
    })

    createContact({ patient, contact })
    form.resetFields()
  }
  const handleOnClose = () => {
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
      title="Add consultation"
    >
      <div className="modalAddConsultationForm">
        {(isContactCreatingLoading || isHealthElementCreatingLoading) && <SpinLoader />}
        <Form
          className="modalAddConsultationForm__form"
          layout="vertical"
          colon={false}
          form={form}
          initialValues={{ dateOfVisit: dayjs(new Date()) }}
          onFinish={(values) => handleSubmit(values)}
        >
          <div className="modalAddConsultationForm__form__inputs">
            <Form.Item name="dateOfVisit" label="Date of visit" rules={[{ required: true, message: 'Date of visit field is required' }]}>
              <DatePicker disabled format="DD.MM.YYYY" placeholder="Date of visit" size="large" style={{ width: '100%' }} maxDate={dayjs()} />
            </Form.Item>
            <Form.Item name="complains" label="Complains" rules={[{ required: true, message: 'Complains field is required' }]}>
              <Input.TextArea placeholder="Type the patient complains" size="large" style={{ fontSize: 13 }} autoSize={{ minRows: 1, maxRows: 7 }} />
            </Form.Item>
            <Form.Item name="anamnesis" label="Anamnesis" rules={[{ required: true, message: 'Anamnesis field is required' }]}>
              <Input.TextArea placeholder="Type the Anamnesis" size="large" style={{ fontSize: 13 }} autoSize={{ minRows: 1, maxRows: 7 }} />
            </Form.Item>
            <Form.Item name="clinicalExam" label="Clinical Exam" rules={[{ required: true, message: 'Clinical Exam field is required' }]}>
              <Input.TextArea placeholder="Type the Clinical Exam" size="large" style={{ fontSize: 13 }} autoSize={{ minRows: 1, maxRows: 7 }} />
            </Form.Item>
            <div className="modalAddConsultationForm__form__infoBlock">
              <h3 className="modalAddConsultationForm__form__infoBlock__title">Blood Pressure</h3>
              <div className="modalAddConsultationForm__form__infoBlock__inputs">
                <Form.Item name="systolicPressure" label="Systolic Pressure" rules={[{ required: true, message: 'Systolic Pressure field is required' }]} style={{ width: '100%' }}>
                  <InputNumber placeholder="Add Systolic Pressure " size="large" style={{ fontSize: 13, width: '100%' }} suffix={bloodPressureMeasuringUnit} />
                </Form.Item>
                <Form.Item
                  name="diastolicPressure"
                  label="Diastolic Pressure"
                  rules={[{ required: true, message: 'Diastolic Pressure field is required' }]}
                  style={{ width: '100%' }}
                >
                  <InputNumber placeholder="Add Diastolic Pressure" size="large" style={{ fontSize: 13, width: '100%' }} suffix={bloodPressureMeasuringUnit} />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="diagnosis" label="Diagnosis" rules={[{ required: true, message: 'Diagnosis is field required' }]}>
              <Input.TextArea placeholder="Type the Diagnosis" size="large" style={{ fontSize: 13 }} autoSize={{ minRows: 1, maxRows: 7 }} />
            </Form.Item>
            <Form.Item name="treatment" label="Treatment" rules={[{ required: true, message: 'Treatment is field required' }]}>
              <Input.TextArea placeholder="Type the Treatment" size="large" style={{ fontSize: 13 }} autoSize={{ minRows: 1, maxRows: 7 }} />
            </Form.Item>
          </div>
        </Form>
      </div>
    </CustomModal>
  )
}

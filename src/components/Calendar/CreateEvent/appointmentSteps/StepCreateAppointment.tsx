import { Button, Card, Col, Descriptions, FormInstance, Layout, Result, Row, Space, Spin, Typography } from 'antd'
import dayjs from 'dayjs'
import { FC, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { appointmentDuration, AppointmentForm, formatDateTime, FormProcedure, languageMapping } from '../CreateEvent'
import './index.css'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'
import { useCreateUpdateUserMutation, useLazyGetUserByEmailQuery } from '../../../../core/api/userApi'
import { DecryptedCalendarItem, DecryptedPatient, User } from '@icure/cardinal-sdk'
import { useCreateOrUpdatePatientMutation, useLazyGetPatientByIdQuery, useUpdatePatientMutation } from '../../../../core/api/patientApi'
import { v4 } from 'uuid'
import { PlusOutlined, RedoOutlined } from '@ant-design/icons'
import { Content } from 'antd/es/layout/layout'
const { Title, Paragraph, Text } = Typography

interface StepCreateAppointmentProps {
  formValues: AppointmentForm
  selections: ProcedureSelection[]
  form: FormInstance<AppointmentForm>
}

export const StepCreateAppointment = ({ formValues, selections, form }: StepCreateAppointmentProps) => {
  const { t, i18n } = useTranslation()
  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR' // Fallback
  }, [i18n.language])

  const [processStatus, setProcessStatus] = useState('idle')

  const [getUserByMailLazy, { isError: isGetUserError, isSuccess: isGetUserSuccess, isLoading: isGetUserLoading }] = useLazyGetUserByEmailQuery()
  const [getPatientByIdLazy, { isError: isGetPatientError, isSuccess: isGetPatientSuccess, isLoading: isGetPatientLoading }] = useLazyGetPatientByIdQuery()
  const [createUpdateUser, { isError: isCreateUpdateUserError, isSuccess: isCreateUpdateUserSuccess, isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [updatePatient, { isLoading: isUpdatePatientLoading }] = useUpdatePatientMutation()
  const [createUpdatePatient, { isError: isCreateUpdatePatientError, isSuccess: isCreateUpdatePatientSuccess, isLoading: isCreateUpdatePatientLoading }] = useCreateOrUpdatePatientMutation()

  const isLoading = useMemo(
    () => processStatus === 'pending' || isGetPatientLoading || isCreateUpdatePatientLoading || isCreateUpdateUserLoading || isGetUserLoading,
    [processStatus, isGetPatientLoading, isCreateUpdatePatientLoading, isGetUserLoading],
  )

  useEffect(() => {
    if (processStatus !== 'idle') {
      return
    }
    if (!formValues || !formValues.personalInfo || !selections || !form) {
      setProcessStatus('error')
      return
    }

    const runUpdateProcess = async () => {
      setProcessStatus('pending')
      const { personalInfo } = formValues
      const userEmail = personalInfo?.email

      if (!userEmail) {
        setProcessStatus('error')
        return
      }

      try {
        console.log('try')
        let citizenUser: User | undefined
        let citizenPatient: DecryptedPatient | undefined
        // --- Step 1: Attempt to get the user ---
        try {
          const foundUser = await getUserByMailLazy(userEmail).unwrap()

          console.log('found user', foundUser)
          if (!foundUser) {
            throw { status: 404, data: 'User not found in database.' }
          }

          // --- If user was found, proceed with update logic ---
          citizenUser = { ...foundUser } // Create a mutable copy

          // Step 2: Update existing user's phone if it changed
          const newPhoneNumber = personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined
          if (newPhoneNumber && newPhoneNumber !== citizenUser.mobilePhone) {
            const userUpdatePayload = new User({ ...citizenUser, mobilePhone: newPhoneNumber })
            const updatedUserResult = await createUpdateUser(userUpdatePayload).unwrap()
            if (!updatedUserResult) throw new Error("Failed to update user's phone number.")
            citizenUser = updatedUserResult
          }

          // Step 3: Get or Create/Update patient for the existing user
          let patientNeedsUpdate = false
          if (citizenUser.patientId) {
            try {
              const foundPatient = await getPatientByIdLazy(citizenUser.patientId).unwrap()
              if (!foundPatient) throw { status: 404 }
              citizenPatient = foundPatient
            } catch (getPatientError) {
              if (typeof getPatientError === 'object' && getPatientError !== null && 'status' in getPatientError && (getPatientError as { status: unknown }).status === 404) {
                citizenPatient = new DecryptedPatient({ id: v4() })
                patientNeedsUpdate = true
              } else {
                throw getPatientError
              }
            }
          } else {
            citizenPatient = new DecryptedPatient({ id: v4() })
            patientNeedsUpdate = true
          }

          const newLanguage = personalInfo.language
          const newBirthDate = personalInfo.birthDate ? Number(dayjs(personalInfo.birthDate).format('YYYYMMDD')) : undefined
          const hasLanguageChanged = newLanguage && newLanguage !== (citizenPatient.languages?.[0] || '')
          const hasBirthDateChanged = newBirthDate && newBirthDate !== citizenPatient.dateOfBirth

          if (patientNeedsUpdate || hasLanguageChanged || hasBirthDateChanged) {
            const patientPayload = new DecryptedPatient({
              ...citizenPatient,
              languages: hasLanguageChanged ? [newLanguage!] : citizenPatient.languages,
              dateOfBirth: hasBirthDateChanged ? newBirthDate : citizenPatient.dateOfBirth,
              firstName: patientNeedsUpdate ? personalInfo.firstName : citizenPatient.firstName,
              lastName: patientNeedsUpdate ? personalInfo.lastName : citizenPatient.lastName,
            })
            const updatedPatient = await createUpdatePatient(patientPayload).unwrap()
            if (updatedPatient) citizenPatient = updatedPatient
          }
        } catch (getUserError: unknown) {
          // --- This catch block handles the "User Not Found" case ---
          const isNotFoundError = typeof getUserError === 'object' && getUserError !== null && 'status' in getUserError && (getUserError as { status: unknown }).status === 404

          if (isNotFoundError) {
            // Create new Patient first
            const patientId = v4()
            const newBirthDate = personalInfo.birthDate ? Number(dayjs(personalInfo.birthDate).format('YYYYMMDD')) : undefined
            const newPatientPayload = new DecryptedPatient({ id: patientId, languages: [personalInfo.language], dateOfBirth: newBirthDate, firstName: personalInfo.firstName, lastName: personalInfo.lastName })
            const createdPatient = await createUpdatePatient(newPatientPayload).unwrap()
            if (!createdPatient) throw new Error('Failed to create a new patient record.')
            citizenPatient = createdPatient

            // Then create the new User linked to the new Patient
            const newPhoneNumber = personalInfo.countryCode && personalInfo.phoneNumber ? `${personalInfo.countryCode}${personalInfo.phoneNumber}` : undefined
            const newUserPayload = new User({ id: v4(), patientId: patientId, mobilePhone: newPhoneNumber, email: userEmail, login: userEmail, name: `${personalInfo.firstName} ${personalInfo.lastName}` })
            const createdUser = await createUpdateUser(newUserPayload).unwrap()
            if (!createdUser) throw new Error('Failed to create a new user record after creating patient.')
            citizenUser = createdUser
          } else {
            // The error was something else (e.g., server 500). Re-throw to be caught by the outer catch.
            throw getUserError
          }
        }

        console.log('user', citizenUser)
        console.log('patient', citizenPatient)

        // create appointments

        setProcessStatus('success')
      } catch (error: unknown) {
        // This outer catch now handles any re-thrown API errors or other unexpected issues.
        setProcessStatus('error')
        console.error('An error occurred in the main process:', error)
      }
    }

    runUpdateProcess()
  }, [formValues, selections, form, processStatus])

  return (
    <Layout style={{ backgroundColor: '#f0f2f5' }}>
      <Content style={{ padding: '24px 50px', marginTop: '24px' }}>
        <Row justify="center">
          <Col xs={24} lg={22} xl={20}>
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'normal', justifyContent: 'center', height: '100vh', background: '#f0f2f5' }}>
                <Spin tip="Finalizing your appointment..." size="large">
                  <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '4px' }} />
                </Spin>
              </div>
            )}

            {processStatus === 'success' && (
              <Card>
                <Result
                  status="success"
                  title="Thank You for Your Visit!"
                  subTitle={
                    <>
                      <Paragraph style={{ paddingBottom: '1rem' }}>Your appointment has been successfully completed. A summary is provided below for your records.</Paragraph>

                      <Card size="small" style={{ marginTop: 16, maxWidth: 500, margin: 'auto', textAlign: 'left' }}>
                        <Descriptions title="Appointment Summary" column={1} bordered>
                          <Descriptions.Item label={t('content.procedures')}>
                            <Space direction="vertical">
                              {formValues?.procedures?.map((item, index) => {
                                const mainProcedure = selections?.find((proc) => proc.id === item.procedureSelectionId)
                                if (!mainProcedure) return null
                                return (
                                  <Text key={index}>
                                    {item.quantity} x {mainProcedure.displayTextByLanguage[langCode]}
                                  </Text>
                                )
                              })}
                            </Space>
                          </Descriptions.Item>

                          <Descriptions.Item label={t('content.date')}>{formatDateTime(formValues.timeslot?.date, formValues.timeslot?.time)}</Descriptions.Item>
                          <Descriptions.Item label={t('content.duration')}>
                            <Text strong>{appointmentDuration(formValues, selections) + ' ' + t('content.minutes')}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Location">Rue du sanglier</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </>
                  }
                />
              </Card>
            )}
            {processStatus === 'error' && (
              <Card>
                <Result status="error" title="Submission Failed" subTitle="We were unable to finalize your appointment. Please check your connection and try again." />
              </Card>
            )}
          </Col>
        </Row>
      </Content>
    </Layout>
  )
}

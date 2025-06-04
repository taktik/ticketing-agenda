import { CloseOutlined, DeleteOutlined, ExclamationCircleOutlined, MinusCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, InputNumber, message, notification, Radio, Space, Table, Tag, Tooltip, Typography } from 'antd'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { ReactElement, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { SettingContext } from '../../../contexts/SettingContext'
import { useGetAgendaByAuthorId } from '../../../core/api/agendaApi'
import { useCreateUpdateCalendarItemTypeMutation, useDeleteCalendarItemTypeMutation, useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'
import { useCreateUpdateHealthcarePartyMutation, useRecursiveHcpDeletion } from '../../../core/api/healthcarePartyApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import './index.css'

const getAllDurations = (procedures: CalendarItemType[] | undefined, name: string | undefined): number[] => {
  const matchingProcedures = (procedures ?? []).filter((item) => item.name === name)
  const sortedMatchingProcedures = sortByOtherInfosOrder(matchingProcedures)
  const allDurations = sortedMatchingProcedures.map((item) => item.duration)

  return allDurations
}

const sortByOtherInfosOrder = (items: CalendarItemType[]): CalendarItemType[] => {
  return [...items].sort((a, b) => {
    const aOrder = parseInt(a.otherInfos?.order ?? '9999', 10)
    const bOrder = parseInt(b.otherInfos?.order ?? '9999', 10)
    return aOrder - bOrder
  })
}

interface ProcedureRow {
  rowId: string
  procedureId: string
  procedureName: string
  appointmentDurations: number[]
  isPublic: string
}

interface FormValues {
  serviceName: string
  procedureName: string
  appointmentDurations: number[]
  isPublic: string
}

interface ServiceSettingProps {
  service: HealthcareParty | undefined
}

export const ServiceSetting = ({ service }: ServiceSettingProps): ReactElement => {
  const { setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const [isModification, setIsModification] = useState<boolean>(false)
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const [showDeleteProcedureModal, setShowDeleteProcedureModal] = useState<boolean>(false)
  const [procedureRowToBeDeleted, setProcedureRowToBeDeleted] = useState<ProcedureRow | undefined>(undefined)
  const [proceduresList, setProceduresList] = useState<CalendarItemType[]>([])
  const [tableRows, setTableRows] = useState<ProcedureRow[]>([])
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: ProcedureRow) => record.rowId === editingKey, [editingKey])

  const { data: agenda, isLoading: isAgendaLoading } = useGetAgendaByAuthorId({ skip: !service, authorId: service?.id ?? '' })

  const { data: procedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesQuery({ skip: !service || !agenda, agendaId: agenda?.id ?? '' })

  const sortedProcedures = useMemo(() => {
    return [...(procedures ?? [])]
      .sort((a, b) => {
        const nameA = a.name ?? ''
        const nameB = b.name ?? ''
        return nameA.localeCompare(nameB)
      })
      .filter((item) => item.defaultCalendarItemType === true)
  }, [procedures])

  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    setProceduresList(sortedProcedures)
    setEditingKey('')
  }, [sortedProcedures, form])

  useEffect(() => {
    const tableRowsList: ProcedureRow[] = proceduresList.map((procedure) => {
      const allDurations = getAllDurations(procedures, procedure.name)

      return {
        rowId: v4(),
        procedureId: procedure.id,
        procedureName: procedure.name,
        appointmentDurations: allDurations,
        isPublic: procedure.otherInfos.isPublic === 'true' ? 'true' : 'false',
      } as ProcedureRow
    })
    setTableRows(tableRowsList)
  }, [proceduresList])

  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [createUpdateProcedure, { isError: isCreateUpdateDemarcheError, isSuccess: isCreateUpdateDemarcheSuccess, isLoading: isCreateUpdateDemarcheLoading }] = useCreateUpdateCalendarItemTypeMutation()

  const [deleteProcedure, { isError: isDeleteDemarcheError, isSuccess: isDeleteDemarcheSuccess, isLoading: isDeleteDemarcheLoading }] = useDeleteCalendarItemTypeMutation()
  const { deleteHcpRecursively: deleteService, isLoading: isDeleteServiceLoading, isSuccess: isDeleteServiceSuccess, error: isDeleteServiceError } = useRecursiveHcpDeletion()

  const isFetching = useMemo(() => isAgendaLoading || isProceduresLoading, [isAgendaLoading, isProceduresLoading])
  const isMutating = useMemo(
    () => isCreateUpdateServiceLoading || isCreateUpdateDemarcheLoading || isDeleteDemarcheLoading || isDeleteServiceLoading,
    [isCreateUpdateServiceLoading, isCreateUpdateDemarcheLoading, isDeleteDemarcheLoading, isDeleteServiceLoading],
  )
  const isLoading = useMemo(() => isFetching || isMutating, [isFetching, isMutating])

  const handleSubmit = () => {
    try {
      if (!service) throw new Error('No service selected')
      const { serviceName } = form.getFieldsValue()
      createUpdateService({ ...service, name: serviceName })
      form.submit()
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  useEffect(() => {
    if (service) {
      form.setFieldsValue({
        serviceName: service.name,
      })
    }
  }, [service, form])

  const addProcedure = () => {
    try {
      if (!service) throw new Error('No service selected')
      const procedure = new CalendarItemType({
        name: t('content.new_procedure'),
        defaultCalendarItemType: true,
        duration: 15,
        healthcarePartyId: service.id,
        agendaId: agenda?.id,
        otherInfos: {
          order: '0',
          isPublic: 'true',
        },
        id: v4(),
      })
      createUpdateProcedure(procedure)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableRowUpdate = async (procedureRow: ProcedureRow) => {
    try {
      setIsModification(true)
      // Step 1 : We first make sure everything is valid
      if (!service) throw new Error('No service selected')
      if (!agenda) throw new Error('No agenda selected')

      const rowValues = await form.validateFields()

      // Step 2 : We get our current procedures and sort them by their order
      const matchingProcedures = (procedures ?? []).filter((item) => item.name === procedureRow.procedureName)
      const sortedMatchingProcedures = sortByOtherInfosOrder(matchingProcedures)

      // Step 3 : We make our desired Array as the user has chosen
      const desiredArray = rowValues.appointmentDurations.map(
        (duration, index) =>
          new CalendarItemType({
            name: rowValues.procedureName,
            duration: duration,
            defaultCalendarItemType: index === 0,
            healthcarePartyId: service.id,
            agendaId: agenda.id,
            otherInfos: {
              order: String(index),
              isPublic: rowValues.isPublic,
            },
            id: v4(),
          }),
      )

      // Step 4 : We will compare both our current array and our desired array and UPDATE, CREATE or DELETE as needed.
      const mutationPromises: Promise<unknown>[] = []
      const maxLen = Math.max(desiredArray.length, sortedMatchingProcedures.length)

      for (let i = 0; i < maxLen; i++) {
        const desiredProps = desiredArray[i] // Target state for this slot (order i)
        const existingItem = sortedMatchingProcedures[i] // Current item at this slot (order i)

        if (desiredProps && existingItem) {
          // === Both exist: Potential UPDATE ===
          // Check if an update is actually needed by comparing relevant fields.
          if (
            existingItem.duration !== desiredProps.duration ||
            existingItem.defaultCalendarItemType !== desiredProps.defaultCalendarItemType ||
            existingItem.name !== desiredProps.name ||
            existingItem.otherInfos?.order !== desiredProps.otherInfos.order ||
            existingItem.otherInfos?.isPublic !== desiredProps.otherInfos.isPublic
          ) {
            const procedure = new CalendarItemType({
              name: desiredProps.name,
              duration: desiredProps.duration,
              defaultCalendarItemType: desiredProps.defaultCalendarItemType,
              otherInfos: desiredProps.otherInfos,
              healthcarePartyId: desiredProps.healthcarePartyId,
              agendaId: desiredProps.agendaId,
              id: existingItem.id,
              rev: existingItem.rev,
            })
            mutationPromises.push(createUpdateProcedure(procedure).unwrap())
          }
        } else if (desiredProps && !existingItem) {
          // === Desired, but no corresponding existing item: CREATE ===
          mutationPromises.push(createUpdateProcedure(desiredProps).unwrap())
        } else if (!desiredProps && existingItem) {
          // === No longer desired at this position, but exists: DELETE ===
          mutationPromises.push(deleteProcedure([existingItem.id]).unwrap())
        }
      }

      // 3. Execute all collected mutations
      try {
        await Promise.allSettled(mutationPromises) // Use allSettled to attempt all operations
      } catch (error) {
        console.error('Error during sync/mutation execution:', error)
        openNotification('error', 'Update Failed', 'Some operations may have failed.')
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error && Array.isArray(error.errorFields) && error.errorFields.length > 0) {
        openNotification('error', t('validation.validation_failed'), t('validation.check_highlighted_fields_correct_errors'))
      } else if (error instanceof Error) {
        openNotification('error', 'Update Failed', error.message)
      } else {
        openNotification('error', 'Update Failed', 'An unexpected error occurred.')
      }
    } finally {
      // Step 5: we return the row to its display mode
      setEditingKey('')
      setIsModification(false)
    }
  }

  const tableRowCancel = (procedureRow: ProcedureRow) => {
    setEditingKey('')
  }

  const tableRowEdit = (procedureRow: ProcedureRow) => {
    try {
      if (!procedureRow.rowId) throw new Error('No rule selected')
      // Set the state with the values
      form.setFieldsValue({
        procedureName: procedureRow.procedureName,
        appointmentDurations: procedureRow.appointmentDurations,
        isPublic: procedureRow.isPublic,
      })
      setEditingKey(procedureRow.rowId)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const handleDeleteService = () => {
    try {
      if (!service) throw new Error('No site selected')
      deleteService(service)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setSelectedKey('default')
    }
  }

  const tableRowDelete = () => {
    try {
      if (!procedureRowToBeDeleted) throw new Error('No procedure selected')
      // Simply remove it from the state. When user save the form it will be 'deleted'
      const proceduresToDelete = procedures?.filter((item) => item.name === procedureRowToBeDeleted.procedureName)
      if (!proceduresToDelete) throw new Error('No procedure selected')
      const proceduresToDeleteIds = proceduresToDelete.map((item) => item.id)
      deleteProcedure(proceduresToDeleteIds)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setShowDeleteProcedureModal(false)
      setProcedureRowToBeDeleted(undefined)
    }
  }

  //  Two pairs of useffects : First pair handles the delete and create/update of procedures
  useEffect(() => {
    if (isDeleteDemarcheError && isModification) openNotification('error', t('notification.procedure_modify_failed'), t('notification.procedure_modify_error'))
    else if (isDeleteDemarcheError) openNotification('error', t('notification.procedure_delete_failed'), t('notification.procedure_delete_error'))
    if (isDeleteDemarcheSuccess && isModification) showMessageFeedback('success', t('notification.procedure_modified'))
    else if (isDeleteDemarcheSuccess) showMessageFeedback('success', t('notification.procedure_deleted'))
  }, [isDeleteDemarcheSuccess, isDeleteDemarcheError])

  useEffect(() => {
    if (isCreateUpdateDemarcheError && isModification) openNotification('error', t('notification.procedure_modify_failed'), t('notification.procedure_modify_error'))
    else if (isCreateUpdateDemarcheError) openNotification('error', t('notification.procedure_save_failed'), t('notification.procedure_save_error'))
    if (isCreateUpdateDemarcheSuccess && isModification) showMessageFeedback('success', t('notification.procedure_modified'))
    else if (isCreateUpdateDemarcheSuccess) showMessageFeedback('success', t('notification.procedure_saved'))
  }, [isCreateUpdateDemarcheSuccess, isCreateUpdateDemarcheError])

  // Second pair handles the delete and update of the service
  useEffect(() => {
    if (isDeleteServiceSuccess) showMessageFeedback('success', t('notification.service_deleted'))
    if (isDeleteServiceError) openNotification('error', t('notification.service_delete_failed'), t('notification.service_delete_error'))
  }, [isDeleteServiceSuccess, isDeleteServiceError])

  useEffect(() => {
    if (isCreateUpdateServiceSuccess) showMessageFeedback('success', t('notification.service_saved'))
    if (isCreateUpdateServiceError) openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
  }, [isCreateUpdateServiceSuccess, isCreateUpdateServiceError])

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  const handleNameCancel = () => {
    form.setFieldsValue({ serviceName: initialName })
  }

  const watchedDurations = Form.useWatch('appointmentDurations', form)
  const nameValue = Form.useWatch('serviceName', form)
  const initialName = useMemo(() => service?.name || '', [service])

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
      <Form
        layout="vertical"
        colon={false}
        form={form}
        initialValues={{
          name: service?.name,
        }}
        style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between' }}
      >
        <div className="form-fields">
          <div className="edit-service">
            <Form.Item name="serviceName" rules={[{ required: true, message: 'Name of the service' }]}>
              <Input suffix={<CloseOutlined disabled={nameValue === service?.name} onClick={handleNameCancel} />} />
            </Form.Item>
            <Tooltip title={t('content.save_service')}>
              <Button icon={<SaveOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} disabled={nameValue === initialName} onClick={handleSubmit} />
            </Tooltip>
            <Tooltip title={t('content.delete_service')}>
              <Button icon={<DeleteOutlined />} danger disabled={!service} onClick={() => setShowDeleteServiceModal(true)} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
            </Tooltip>
          </div>

          <div className="ant-table-custom">
            <Table<ProcedureRow>
              className="custom-table"
              pagination={{
                pageSize: 9,
                simple: true,
              }}
              scroll={{ y: 'calc(100vh - 500px)', x: 'max-content' }}
              dataSource={tableRows}
              rowKey="rowId"
              locale={{ emptyText: <Empty description={t('content.no_procedure_yet')} /> }}
              loading={isLoading}
            >
              <ColumnGroup
                title={
                  <Button style={{ width: '100%' }} onClick={addProcedure}>
                    {t('content.add_procedure')}
                  </Button>
                }
              >
                <Column
                  title={t('content.procedure')}
                  dataIndex="procedureName"
                  key="procedureName"
                  width="50%"
                  sorter={(a, b) => a.procedureName.localeCompare(b.procedureName)}
                  render={(currentValue: string, record: ProcedureRow) => {
                    const editable = isEditing(record)
                    if (editable) {
                      return (
                        <>
                          <Form.Item name="procedureName" style={{ margin: 0 }} rules={[{ required: true, message: t('content.procedure_name_required') }]}>
                            <Input autoFocus />
                          </Form.Item>
                        </>
                      )
                    } else {
                      return currentValue
                    }
                  }}
                />

                <Column
                  title={t('content.appointment_duration')}
                  dataIndex="appointmentDurations"
                  key="appointmentDurations"
                  width={'30%'}
                  render={(durations: number[] | undefined, record: ProcedureRow) => {
                    const editable = isEditing(record)

                    if (editable) {
                      return (
                        <Form.List
                          name="appointmentDurations"
                          rules={[
                            {
                              validator: async (_, durationList) => {
                                if (!durationList || durationList.length === 0) {
                                  return Promise.reject(new Error(t('validation.at_least_one_duration_required')))
                                }
                                for (const duration of durationList) {
                                  if (duration === null || duration === undefined || duration <= 0) {
                                    return Promise.reject(new Error(t('validation.all_durations_must_be_positive')))
                                  }
                                }
                              },
                            },
                          ]}
                        >
                          {(fields, { add, remove }, { errors }) => {
                            return (
                              <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '10px' }}>
                                {fields.map(({ key, name, ...restField }, index) => (
                                  <Space key={key} className="appointment-duration" align="baseline">
                                    <Typography.Text style={{ minWidth: '100px' }}>
                                      {index + 1} {index === 0 ? t('content.person') : t('content.persons')} :
                                    </Typography.Text>
                                    <div className="appointment-duration-input">
                                      <Form.Item
                                        {...restField}
                                        name={name}
                                        noStyle
                                        rules={[
                                          { required: true, message: t('validation.at_least_one_duration_required') },
                                          { type: 'number', min: 1, message: t('validation.all_durations_must_be_positive') },
                                        ]}
                                      >
                                        <InputNumber addonAfter="min" style={{ width: '100px' }} />
                                      </Form.Item>

                                      <Button
                                        type="text"
                                        danger
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => {
                                          remove(name)
                                        }}
                                        disabled={fields.length === 1}
                                        size="small"
                                      />
                                    </div>
                                  </Space>
                                ))}
                                <Button
                                  type="dashed"
                                  onClick={() => {
                                    const currentDurationsList: number[] = watchedDurations || []
                                    const lastDuration = currentDurationsList && currentDurationsList.length > 1 ? currentDurationsList?.[currentDurationsList.length - 1] : 15
                                    add(lastDuration + 15)
                                  }}
                                  block
                                  icon={<PlusOutlined />}
                                >
                                  {t('content.add_appointment_duration')}
                                </Button>
                                <Form.ErrorList errors={errors} />
                              </div>
                            )
                          }}
                        </Form.List>
                      )
                    } else {
                      if (!durations || durations.length === 0) {
                        return (
                          <Tag icon={<ExclamationCircleOutlined />} color="warning">
                            {t('content.not_set')}
                          </Tag>
                        )
                      }
                      return (
                        <Space direction="vertical" size="small">
                          {durations.map((duration, index) => (
                            <Tag key={index}>
                              {index + 1} {index === 0 ? t('content.person') : t('content.persons')}: {duration ?? 'N/A'} min
                            </Tag>
                          ))}
                        </Space>
                      )
                    }
                  }}
                />
                <Column
                  title={t('content.visibility')}
                  dataIndex="isPublic"
                  key="isPublic"
                  width="25%"
                  render={(currentValue: string | undefined, record: ProcedureRow) => {
                    const editable = isEditing(record)

                    if (editable) {
                      return (
                        <Form.Item name="isPublic" style={{ margin: 0 }} rules={[{ required: true, message: 'Please select privacy mode!' }]}>
                          <Radio.Group className="radio-group">
                            <Radio value={'true'}>{t('content.public')}</Radio>
                            <Radio value={'false'}>{t('content.private')}</Radio>
                          </Radio.Group>
                        </Form.Item>
                      )
                    } else {
                      if (currentValue === 'true') {
                        return <Tag color="green">{t('content.public')}</Tag>
                      } else if (currentValue === 'false') {
                        return <Tag color="red">{t('content.private')}</Tag>
                      }
                      return <Tag color="orange">{t('content.unknown')}</Tag>
                    }
                  }}
                />
                <Column
                  title={t('content.actions')}
                  key="action"
                  fixed="right"
                  width={'auto'}
                  render={(_: unknown, record: ProcedureRow) => {
                    const editable = isEditing(record)

                    if (editable) {
                      return (
                        <Space size="middle">
                          <Button onClick={() => tableRowUpdate(record)}>{t('content.update')}</Button>
                          <Button onClick={() => tableRowCancel(record)}>{t('content.cancel')}</Button>
                        </Space>
                      )
                    } else {
                      return (
                        <Space size="middle">
                          <Button onClick={() => tableRowEdit(record)}>{t('content.edit')}</Button>
                          <Button
                            onClick={() => {
                              setProcedureRowToBeDeleted(record)
                              setShowDeleteProcedureModal(true)
                            }}
                          >
                            {t('content.delete')}
                          </Button>
                        </Space>
                      )
                    }
                  }}
                />
              </ColumnGroup>
            </Table>
          </div>
        </div>
      </Form>

      {showDeleteServiceModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_service_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_service_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
            onYesClick={() => {
              handleDeleteService()
              setShowDeleteServiceModal(false)
            }}
            onNoClick={() => setShowDeleteServiceModal(false)}
            isVisible={showDeleteServiceModal}
            mode="danger"
          />,
          document.body,
        )}
      {showDeleteProcedureModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_procedure_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_procedure_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
            onYesClick={() => {
              tableRowDelete()
              setShowDeleteProcedureModal(false)
            }}
            onNoClick={() => setShowDeleteProcedureModal(false)}
            isVisible={showDeleteProcedureModal}
            mode="danger"
          />,
          document.body,
        )}
    </div>
  )
}

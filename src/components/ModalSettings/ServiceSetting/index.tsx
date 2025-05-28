import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined, RollbackOutlined, CloseOutlined, MinusCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { SettingContext } from '../../../contexts/SettingContext'
import { HealthcareParty, CalendarItemType, Agenda } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col, notification, message, Empty, Typography, Table, Space, InputNumber, Tag } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './index.css'
import { useCreateUpdateHealthcarePartyMutation, useDeleteHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery, useRecursiveHcpDeletion } from '../../../core/api/healthcarePartyApi'
import { useCreateUpdateCalendarItemTypeMutation, useDeleteCalendarItemTypeMutation, useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { createPortal } from 'react-dom'
import { v4 } from 'uuid'
import { useCreateUpdateAgendaMutation, useDeleteAgendaByAuthorId, useDeleteAgendaMutation, useGetAgendaByAuthorId } from '../../../core/api/agendaApi'
import { useGetCalendarItemQuery } from '../../../core/api/calendarItemApi'
import { useTranslation } from 'react-i18next'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import Column from 'antd/es/table/Column'

interface ProcedureRow {
  rowId: string
  procedureName: string
  appointmentDurations: number[]
}

interface FormValues {
  serviceName: string
  procedureName: string
  appointmentDurations: number[]
}

interface ServiceSettingProps {
  service: HealthcareParty | undefined
}

export const ServiceSetting = ({ service }: ServiceSettingProps): ReactElement => {
  const { setSelectedKey } = useContext(SettingContext)
  const { t, i18n } = useTranslation()
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const [showDeleteProcedureModal, setShowDeleteProcedureModal] = useState<boolean>(false)
  const [procedureRowToBeDeleted, setProcedureRowToBeDeleted] = useState<ProcedureRow | undefined>(undefined)
  const [proceduresList, setProceduresList] = useState<CalendarItemType[]>([])
  const [tableRows, setTableRows] = useState<ProcedureRow[]>([])
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: ProcedureRow) => record.rowId === editingKey, [editingKey])

  const { data: agenda } = useGetAgendaByAuthorId({ skip: !service, authorId: service?.id ?? '' })

  const { data: procedures } = useGetCalendarItemTypesQuery({ skip: !service || !agenda, agendaId: agenda?.id ?? '' })

  const sortedProcedures = useMemo(() => {
    return [...(procedures ?? [])].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [procedures])

  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    setProceduresList(sortedProcedures)
    setEditingKey('')
  }, [sortedProcedures, form])

  useEffect(() => {
    const tableRowsList: ProcedureRow[] = proceduresList.map((procedure) => {
      return {
        rowId: v4(),
        procedureName: procedure.name,
        appointmentDurations: [15],
      } as ProcedureRow
    })
    setTableRows(tableRowsList)
  }, [proceduresList])

  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [createUpdateProcedure, { data: createdUpdatedCalendarItemTypeData, isError: isCreateUpdateDemarcheError, isSuccess: isCreateUpdateDemarcheSuccess, isLoading: isCreateUpdateDemarcheLoading }] =
    useCreateUpdateCalendarItemTypeMutation()

  const [deleteProcedure, { isError: isDeleteDemarcheError, isSuccess: isDeleteDemarcheSuccess, isLoading: isDeleteDemarcheLoading }] = useDeleteCalendarItemTypeMutation()
  const { deleteHcpRecursively: deleteService, isLoading: isDeleteServiceLoading, isSuccess: isDeleteServiceSuccess, error: isDeleteServiceError } = useRecursiveHcpDeletion()

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
      const newProcedure: ProcedureRow = {
        rowId: v4(),
        procedureName: t('content.new_procedure'),
        appointmentDurations: [15],
      }
      setTableRows((prev) => [...prev, newProcedure])
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableRowUpdate = async (procedureRow: ProcedureRow) => {
    // Updates the row
    try {
      const rowValues = await form.validateFields()

      setTableRows((prev) =>
        prev.map((row) => {
          if (row.rowId === procedureRow.rowId) {
            return {
              ...row,
              procedureName: rowValues.procedureName,
              appointmentDurations: rowValues.appointmentDurations,
            }
          }
          return row
        }),
      )

      setEditingKey('')
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error && Array.isArray(error.errorFields) && error.errorFields.length > 0) {
        openNotification('error', t('validation.validation_failed'), t('validation.check_highlighted_fields_correct_errors'))
      } else if (error instanceof Error) {
        openNotification('error', 'Update Failed', error.message)
      } else {
        openNotification('error', 'Update Failed', 'An unexpected error occurred.')
      }
    }
  }

  const tableRowCancel = (procedureRow: ProcedureRow) => {
    setEditingKey('')
  }

  const tableRowEdit = (procedureRow: ProcedureRow) => {
    // Edit the row
    try {
      if (!procedureRow.rowId) throw new Error('No rule selected')
      // Set the state with the values
      form.setFieldsValue({
        procedureName: procedureRow.procedureName,
        appointmentDurations: procedureRow.appointmentDurations,
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
      setTableRows((prev) => prev.filter((item) => item.rowId !== procedureRowToBeDeleted.rowId))
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setShowDeleteProcedureModal(false)
      setProcedureRowToBeDeleted(undefined)
    }
  }

  //  Two pairs of useffects : First pair handles the delete and create/update of procedures
  useEffect(() => {
    if (isDeleteDemarcheSuccess) showMessageFeedback('success', t('notification.procedure_deleted'))
    if (isDeleteDemarcheError) openNotification('error', t('notification.procedure_delete_failed'), t('notification.procedure_delete_error'))
  }, [isDeleteDemarcheSuccess, isDeleteDemarcheError])

  useEffect(() => {
    if (isCreateUpdateDemarcheSuccess) showMessageFeedback('success', t('notification.procedure_saved'))
    if (isCreateUpdateDemarcheError) openNotification('error', t('notification.procedure_save_failed'), t('notification.procedure_save_error'))
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
  const nameValue = Form.useWatch('name', form)
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
          </div>

          <div className="ant-table-custom">
            <Table<ProcedureRow>
              className="custom-table"
              pagination={{
                pageSize: 8,
                simple: true,
              }}
              scroll={{ y: 400, x: 'max-content' }}
              dataSource={tableRows}
              rowKey="rowId"
              locale={{ emptyText: <Empty description={t('content.no_procedure_yet')} /> }}
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
        <div className="actions-buttons">
          <Button disabled={!service} onClick={() => setShowDeleteServiceModal(true)} danger>
            {t('content.delete_service')}
          </Button>
          <Button disabled={nameValue === service?.name} onClick={handleSubmit}>
            {t('content.save_service')}
          </Button>
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

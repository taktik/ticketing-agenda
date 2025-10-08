import { DeleteOutlined, EditOutlined, EllipsisOutlined, ExclamationCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Agenda, CalendarItemType, CodeStub } from '@icure/cardinal-sdk'
import { Button, ColorPicker, Dropdown, Empty, Form, Input, InputNumber, MenuProps, message, notification, Radio, Segmented, Space, Table, Tag, Typography } from 'antd'
import type { Color } from 'antd/es/color-picker'
import Column from 'antd/es/table/Column'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useCreateUpdateAgendaMutation } from '../../../core/api/agendaApi'
import { useCreateUpdateCalendarItemTypeMutation, useDeleteCalendarItemTypesMutation, useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { EditableServiceTitle } from '../../EditableServiceTitle/EditableServiceTitle'
import './index.css'
import { usePermissions } from '../../../core/hooks/usePermissions'

const SubjectEdit = React.memo(() => {
  const languages = ['FR', 'NL', 'EN', 'DE']
  const [selectedLang, setSelectedLang] = useState('FR')

  return (
    <div style={{ minWidth: 350 }}>
      <Segmented options={languages} value={selectedLang} onChange={(lang) => setSelectedLang(String(lang))} style={{ marginBottom: 16 }} />

      {languages.map((lang) => (
        <div key={lang} style={{ display: selectedLang === lang ? 'block' : 'none' }}>
          <Form.Item name={['subjectByLanguage', lang]} rules={[{ required: lang === 'FR', message: 'French subject is mandatory.' }]}>
            <Input autoFocus />
          </Form.Item>
        </div>
      ))}
    </div>
  )
})

const SubjectDisplay = React.memo(({ subjects }: { subjects: { [key: string]: string } }): ReactElement => {
  const { t } = useTranslation()
  const availableLangs = useMemo(() => Object.keys(subjects || {}), [subjects])
  const [viewedLang, setViewedLang] = useState<string | undefined>(availableLangs[0])

  useEffect(() => {
    if (availableLangs.length > 0 && !availableLangs.includes(viewedLang || '')) {
      setViewedLang(availableLangs[0])
    } else if (availableLangs.length === 0) {
      setViewedLang(undefined)
    }
  }, [availableLangs, viewedLang])

  if (availableLangs.length === 0) {
    return (
      <Tag icon={<ExclamationCircleOutlined />} color="warning">
        {t('content.not_set')}
      </Tag>
    )
  }

  return (
    <div style={{ minWidth: 350, maxHeight: 130, overflow: 'auto' }}>
      <Segmented size="small" options={availableLangs.map((lang) => ({ label: lang, value: lang }))} value={viewedLang} onChange={(lang) => setViewedLang(lang as string)} style={{ marginBottom: 8 }} />
      <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px', minHeight: '60px' }}>{subjects[viewedLang || '']} </div>
    </div>
  )
})

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

export interface LanguageDescription {
  [key: string]: string
}

interface ProcedureRow {
  rowId: string
  procedureId: string
  appointmentDurations: number[]
  isPublic: string
  subjectByLanguage: LanguageDescription
  procedureDetails: string
  color: string
}

export interface FormValuesService {
  descr: LanguageDescription
  appointmentDurations: number[]
  isPublic: string
  emailTemplate: string
  subjectByLanguage: LanguageDescription
  procedureDetails: string
  color: string
}

interface ServiceSettingProps {
  service: Agenda
  handleDeleteService: (service: Agenda) => Promise<void>
  isServicesLoading: boolean
}

export const ServiceSetting = ({ service, handleDeleteService, isServicesLoading }: ServiceSettingProps): ReactElement => {
  const { t } = useTranslation()
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const [showDeleteProcedureModal, setShowDeleteProcedureModal] = useState<boolean>(false)
  const [procedureRowToBeDeleted, setProcedureRowToBeDeleted] = useState<ProcedureRow | undefined>(undefined)
  const [proceduresList, setProceduresList] = useState<CalendarItemType[]>([])
  const [showEditServiceTitle, setShowEditServiceTitle] = useState<boolean>(false)
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: ProcedureRow) => record.rowId === editingKey, [editingKey])

  const { attachedService } = usePermissions()

  if (attachedService && attachedService !== service.id) {
    return <div></div>
  }

  const { data: procedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesQuery(service?.id ?? '', { skip: !service })

  const sortedProcedures = useMemo(() => {
    return [...(procedures ?? [])]
      .sort((a, b) => {
        const nameA = a.name ?? ''
        const nameB = b.name ?? ''
        return nameA.localeCompare(nameB)
      })
      .filter((item) => item.defaultCalendarItemType === true)
  }, [procedures])

  const [form] = Form.useForm<FormValuesService>()

  const [createUpdateService, { isLoading: isCreateUpdateServiceLoading }] = useCreateUpdateAgendaMutation()
  const [createUpdateProcedure, { isLoading: isCreateUpdateDemarcheLoading }] = useCreateUpdateCalendarItemTypeMutation()
  const [deleteProcedures, { isLoading: isDeleteDemarcheLoading }] = useDeleteCalendarItemTypesMutation()

  const isFetching = useMemo(() => isProceduresLoading || isServicesLoading, [isProceduresLoading, isServicesLoading])
  const isMutating = useMemo(() => isCreateUpdateServiceLoading || isCreateUpdateDemarcheLoading || isDeleteDemarcheLoading, [isCreateUpdateServiceLoading, isCreateUpdateDemarcheLoading, isDeleteDemarcheLoading])
  const isLoading = useMemo(() => isFetching || isMutating, [isFetching, isMutating])

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

  const tableRows: ProcedureRow[] = useMemo(() => {
    const proceduresByName = (procedures ?? []).reduce((acc, procedure) => {
      if (!procedure.name) {
        return acc
      }
      const existing = acc.get(procedure.name) || []
      acc.set(procedure.name, [...existing, procedure])
      return acc
    }, new Map<string, CalendarItemType[]>())

    const durationsMap = new Map<string, number[]>()
    proceduresByName.forEach((procsForName, name) => {
      const sortedDurations = getAllDurations(procsForName, name)
      durationsMap.set(name, sortedDurations)
    })

    return (proceduresList ?? []).map((procedure) => ({
      rowId: procedure.id,
      procedureId: procedure.id,
      procedureName: procedure.name,
      appointmentDurations: procedure.name ? durationsMap.get(procedure.name) || [] : [],
      isPublic: String(procedure.otherInfos.isPublic === 'true'),
      procedureDetails: procedure.otherInfos.procedureDetails,
      subjectByLanguage: procedure.subjectByLanguage,
      color: procedure.color ?? '',
    }))
  }, [procedures, proceduresList])

  useEffect(() => {
    setProceduresList(sortedProcedures)
    setEditingKey('')
  }, [sortedProcedures, form])

  useEffect(() => {
    if (service) {
      form.setFieldsValue({
        descr: service.tags[0].label,
      })
    }
  }, [service, form])

  const addProcedure = useCallback(async () => {
    try {
      if (!service) throw new Error()
      const procedure = new CalendarItemType({
        name: t('content.new_procedure'),
        defaultCalendarItemType: true,
        duration: 15,
        agendaId: service.id,
        otherInfos: {
          order: '0',
          isPublic: 'true',
          procedureDetails: '',
        },
        subjectByLanguage: {
          FR: t('content.new_procedure'),
          NL: '',
          EN: '',
          DE: '',
        },
        color: '#0000ff',
        id: v4(),
      })
      await createUpdateProcedure(procedure).unwrap()
      showMessageFeedback('success', t('notification.procedure_saved'))
    } catch (error) {
      openNotification('error', t('notification.procedure_save_failed'), t('notification.procedure_save_error'))
    }
  }, [service, createUpdateProcedure, showMessageFeedback, openNotification, t])

  const updateAgendaSchedules = useCallback(
    async (defaultCalendarItemTypeId: string, service: Agenda, addedCalendarItemTypesIds: string[], removedCalendarItemTypesIds: string[]) => {
      const newSchedules = service.schedules?.map((schedule) => {
        const newItems = schedule.items?.map((item) => {
          if (item.calendarItemTypesIds?.includes(defaultCalendarItemTypeId)) {
            const filteredIds = item.calendarItemTypesIds.filter((calendarItemTypeId) => !removedCalendarItemTypesIds.includes(calendarItemTypeId))
            const newIds = [...filteredIds, ...addedCalendarItemTypesIds]
            return {
              ...item,
              calendarItemTypesIds: newIds,
            }
          }
          return item
        })

        return {
          ...schedule,
          items: newItems,
        }
      })

      await createUpdateService(new Agenda({ ...service, schedules: newSchedules })).unwrap()
    },
    [createUpdateService],
  )

  const tableRowUpdate = async (procedureRow: ProcedureRow) => {
    try {
      // Step 1 : We first make sure everything is valid
      if (!service) throw new Error()
      const rowValues = await form.validateFields()

      // Step 2 : We get our current procedures and sort them by their order
      const matchingProcedures = (procedures ?? []).filter((item) => item.name === procedureRow.subjectByLanguage['FR'])
      const sortedMatchingProcedures = sortByOtherInfosOrder(matchingProcedures)

      // Step 3 : We make our desired Array with the values the user has chosen
      const desiredArray = rowValues.appointmentDurations.map(
        (duration, index) =>
          new CalendarItemType({
            name: rowValues.subjectByLanguage['FR'],
            duration: duration,
            defaultCalendarItemType: index === 0,
            agendaId: service.id,
            otherInfos: {
              order: String(index),
              isPublic: rowValues.isPublic,
              procedureDetails: rowValues.procedureDetails,
            },
            subjectByLanguage: rowValues.subjectByLanguage,
            color: typeof rowValues.color !== 'string' ? (rowValues.color as Color).toHexString() : rowValues.color,
            id: v4(),
          }),
      )

      // Step 4 : We will compare both our current array and our desired array and UPDATE, CREATE or DELETE as needed.
      const mutationPromises: Promise<unknown>[] = []
      const addedCalendarItemTypesIds: string[] = []
      const removedCalendarItemTypesIds: string[] = []
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
            JSON.stringify(existingItem.otherInfos) !== JSON.stringify(desiredProps.otherInfos) ||
            JSON.stringify(existingItem.subjectByLanguage) !== JSON.stringify(desiredProps.subjectByLanguage) ||
            existingItem.color !== desiredProps.color
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
              subjectByLanguage: desiredProps.subjectByLanguage,
              color: desiredProps.color,
            })
            mutationPromises.push(createUpdateProcedure(procedure).unwrap())
          }
        } else if (desiredProps && !existingItem) {
          // === Desired, but no corresponding existing item: CREATE ===
          mutationPromises.push(createUpdateProcedure(desiredProps).unwrap())
          addedCalendarItemTypesIds.push(desiredProps.id)
        } else if (!desiredProps && existingItem) {
          // === No longer desired at this position, but exists: DELETE ===
          mutationPromises.push(deleteProcedures([existingItem.id]).unwrap())
          removedCalendarItemTypesIds.push(existingItem.id)
        }
      }

      // 3. Execute all collected mutations
      if (mutationPromises.length > 0) {
        await Promise.all(mutationPromises)
        if (addedCalendarItemTypesIds.length || removedCalendarItemTypesIds.length) {
          await updateAgendaSchedules(procedureRow.procedureId, service, addedCalendarItemTypesIds, removedCalendarItemTypesIds)
        }
      }
      showMessageFeedback('success', t('notification.procedure_modified'))
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error && Array.isArray(error.errorFields) && error.errorFields.length > 0) {
        openNotification('error', t('validation.validation_failed'), t('validation.check_highlighted_fields_correct_errors'))
      } else {
        openNotification('error', t('notification.procedure_modify_failed'), t('notification.procedure_modify_error'))
      }
    } finally {
      // Step 5: we return the row to its display mode
      setEditingKey('')
    }
  }

  const tableRowCancel = useCallback(() => {
    setEditingKey('')
  }, [setEditingKey])

  const tableRowEdit = useCallback(
    (procedureRow: ProcedureRow) => {
      if (!procedureRow?.rowId) {
        console.error('Attempted to edit a row without a valid rowId.', procedureRow)
        openNotification('error', t('validation.unexpected_error'), '')
        return
      }

      form.setFieldsValue({
        appointmentDurations: procedureRow.appointmentDurations,
        isPublic: procedureRow.isPublic,
        procedureDetails: procedureRow.procedureDetails,
        subjectByLanguage: procedureRow.subjectByLanguage,
        color: procedureRow.color,
      })

      setEditingKey(procedureRow.rowId)
    },
    [form, setEditingKey, openNotification, t],
  )

  const tableRowDelete = useCallback(async () => {
    try {
      if (!procedureRowToBeDeleted) throw new Error()
      const proceduresToDelete = procedures?.filter((item) => item.name === procedureRowToBeDeleted.subjectByLanguage['FR']) || []
      if (!proceduresToDelete || proceduresToDelete.length === 0) {
        console.warn('No matching procedures found to delete by that name.')
      }
      const proceduresToDeleteIds = proceduresToDelete.map((item) => item.id)
      await deleteProcedures(proceduresToDeleteIds).unwrap()
      await updateAgendaSchedules(procedureRowToBeDeleted.procedureId, service, [], proceduresToDeleteIds)
      showMessageFeedback('success', t('notification.procedure_deleted'))
    } catch (error) {
      console.error('Failed to delete procedure group:', error)
      openNotification('error', t('notification.procedure_delete_failed'), t('notification.procedure_delete_error'))
    } finally {
      setShowDeleteProcedureModal(false)
      setProcedureRowToBeDeleted(undefined)
    }
  }, [procedureRowToBeDeleted, procedures, deleteProcedures, showMessageFeedback, openNotification, setProcedureRowToBeDeleted, t])

  const renameService = useCallback(
    async (newTitles: LanguageDescription) => {
      try {
        if (!service || !newTitles || !newTitles['FR']) throw new Error()
        const newTags = service.tags.map((tag) =>
          tag.type === 'SERVICE'
            ? new CodeStub({
                ...tag,
                label: newTitles,
              })
            : tag,
        )
        await createUpdateService(new Agenda({ ...service, tags: newTags, name: newTitles['FR'] })).unwrap()
        showMessageFeedback('success', t('notification.service_saved'))
      } catch (error) {
        openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
      } finally {
        setShowEditServiceTitle(false)
      }
    },
    [service, createUpdateService, showMessageFeedback, openNotification, setShowEditServiceTitle, t],
  )

  const watchedDurations = Form.useWatch('appointmentDurations', form)

  const siteActionItems: MenuProps['items'] = [
    {
      key: 'rename',
      label: t('content.rename'),
      icon: <EditOutlined />,
      onClick: () => setShowEditServiceTitle(true),
    },
    {
      key: 'delete',
      label: t('content.delete'),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => setShowDeleteServiceModal(true),
    },
  ]

  const serviceTitles = useMemo(() => {
    const serviceTag = service.tags?.find((tag) => tag.type === 'SERVICE')
    return serviceTag?.label || { FR: '', NL: '', EN: '', DE: '' }
  }, [service.tags])

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
        className="service-setting-form"
      >
        <>
          <div className="service-title">
            <Space align="center">
              <EditableServiceTitle form={form} initialTitles={serviceTitles} showEditServiceTitle={showEditServiceTitle} setShowEditServiceTitle={setShowEditServiceTitle} onSave={renameService} />
              {showEditServiceTitle ? null : (
                <Dropdown menu={{ items: siteActionItems }} trigger={['click']}>
                  <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px' }} />} shape="circle" size="large" />
                </Dropdown>
              )}
            </Space>
          </div>

          <div className="table-add-entry">
            <Button style={{ width: '100%' }} onClick={addProcedure} loading={isMutating} disabled={isLoading || !!editingKey}>
              {t('content.add_procedure')}
            </Button>
          </div>

          <div className="ant-table-custom">
            <Table<ProcedureRow>
              className="custom-table"
              scroll={{ y: 'calc(800px - 340px)', x: 'max-content' }}
              dataSource={tableRows}
              rowKey="rowId"
              locale={{ emptyText: <Empty description={t('content.no_procedure_yet')} /> }}
              loading={isLoading}
              pagination={false}
            >
              <Column
                title={undefined}
                dataIndex="color"
                key="color"
                minWidth={50}
                render={(color: string, record: ProcedureRow) => {
                  const editable = isEditing(record)
                  if (editable) {
                    return (
                      <Form.Item
                        name="color"
                        style={{ margin: 0 }}
                        rules={[
                          {
                            required: true,
                            message: t('validation.color_required'),
                          },
                        ]}
                      >
                        <ColorPicker />
                      </Form.Item>
                    )
                  } else {
                    return (
                      <div className="color-swatch-wrapper">
                        <div className="color-swatch" style={{ backgroundColor: color }} />
                      </div>
                    )
                  }
                }}
              />
              <Column
                title={t('content.procedure')}
                dataIndex="subjectByLanguage"
                key="subjectByLanguage"
                minWidth={350}
                render={(subjectsByLanguage: { [key: string]: string }, record: ProcedureRow) => {
                  const editable = isEditing(record)
                  if (editable) {
                    return <SubjectEdit />
                  } else {
                    return <SubjectDisplay subjects={subjectsByLanguage} />
                  }
                }}
              />

              <Column
                title={t('content.appointment_duration')}
                dataIndex="appointmentDurations"
                key="appointmentDurations"
                minWidth={180}
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
                minWidth={120}
                render={(currentValue: string | undefined, record: ProcedureRow) => {
                  const editable = isEditing(record)

                  if (editable) {
                    return (
                      <Form.Item name="isPublic" style={{ margin: 0 }} rules={[{ required: true, message: t('validation.visibility_required') }]}>
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
                title={t('content.procedure_information')}
                dataIndex="procedureDetails"
                key="procedureDetails"
                minWidth={350}
                render={(details: string | undefined, record: ProcedureRow) => {
                  const editable = isEditing(record)

                  if (editable) {
                    return (
                      <Form.Item name="procedureDetails" style={{ width: '100%' }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder="" />
                      </Form.Item>
                    )
                  } else {
                    return (
                      <div className="details-box">
                        <Typography.Paragraph className="details-text">{details || ''}</Typography.Paragraph>
                      </div>
                    )
                  }
                }}
              />
              <Column
                title={t('content.actions')}
                key="action"
                fixed="right"
                width={'12%'}
                render={(_: unknown, record: ProcedureRow) => {
                  const editable = isEditing(record)

                  if (editable) {
                    return (
                      <Space size="middle">
                        <Button onClick={() => tableRowUpdate(record)}>{t('content.update')}</Button>
                        <Button onClick={tableRowCancel}>{t('content.cancel')}</Button>
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
            </Table>
          </div>
        </>
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
              handleDeleteService(service)
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

import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined, RollbackOutlined, CloseOutlined } from '@ant-design/icons'
import { SettingContext } from '../../../contexts/SettingContext'
import { HealthcareParty, CalendarItemType, Agenda } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col, notification, message, Empty, Typography } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './index.css'
import {
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartiesByParentQuery,
  useRecursiveHcpDeletion,
} from '../../../core/api/healthcarePartyApi'
import { useCreateUpdateCalendarItemTypeMutation, useDeleteCalendarItemTypeMutation, useGetCalendarItemTypesQuery } from '../../../core/api/calendarItemTypeApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { createPortal } from 'react-dom'
import { v4 } from 'uuid'
import { useCreateUpdateAgendaMutation, useDeleteAgendaByAuthorId, useDeleteAgendaMutation, useGetAgendaByAuthorId } from '../../../core/api/agendaApi'
import { useGetCalendarItemQuery } from '../../../core/api/calendarItemApi'
import { useTranslation } from 'react-i18next'

interface ListHeaderProps {
  service: HealthcareParty | undefined
  agenda: Agenda | undefined
  handleSaveProcedure: (item: CalendarItemType) => void
}

const ListHeader = React.memo(({ service, agenda, handleSaveProcedure }: ListHeaderProps) => {
  const { selectedKeyId } = useContext(SettingContext)
  const { t } = useTranslation()

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

  const handleAddProcedure = () => {
    try {
      if (!selectedKeyId) throw new Error('No selected Service')
      const procedure = new CalendarItemType({
        name: t('content.new_procedure'),
        defaultCalendarItemType: false,
        duration: 0,
        healthcarePartyId: service?.id,
        agendaId: agenda?.id,
        id: v4(),
      })
      handleSaveProcedure(procedure)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  return (
    <div className="list-header">
      {notificationContextHolder}
      <div>{t('content.procedures')} :</div>
      <Tooltip title={t('content.new_procedure')}>
        <Button icon={<PlusOutlined />} onClick={handleAddProcedure} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
      </Tooltip>
    </div>
  )
})

interface ServiceSettingProps {
  service: HealthcareParty | undefined
}

export const ServiceSetting = ({ service }: ServiceSettingProps): ReactElement => {
  const { setSelectedKey } = useContext(SettingContext)
  const { t, i18n } = useTranslation()
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const [showDeleteProcedureModal, setShowDeleteProcedureModal] = useState<boolean>(false)
  const [editItem, setEditItem] = useState<CalendarItemType | undefined>(undefined) // The procedure being edited in the list
  const [inputValue, setInputValue] = useState<string>(t('content.new_procedure')) // Input value of the procedure being edited

  const { data: agenda } = useGetAgendaByAuthorId({ skip: !service, authorId: service?.id ?? '' })

  const { data: procedures } = useGetCalendarItemTypesQuery({ skip: !service || !agenda, agendaId: agenda?.id ?? '' })

  const servicesList = useMemo(() => {
    return [...(procedures ?? [])]
      .filter((proc) => !proc.deletionDate) // Exclude deleted items
      .sort((a, b) => {
        const nameA = a.name ?? ''
        const nameB = b.name ?? ''
        return nameA.localeCompare(nameB)
      })
  }, [procedures])

  const [form] = Form.useForm()

  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] =
    useCreateUpdateHealthcarePartyMutation()
  const [
    createUpdateProcedure,
    { data: createdUpdatedCalendarItemTypeData, isError: isCreateUpdateDemarcheError, isSuccess: isCreateUpdateDemarcheSuccess, isLoading: isCreateUpdateDemarcheLoading },
  ] = useCreateUpdateCalendarItemTypeMutation()

  const [deleteProcedure, { isError: isDeleteDemarcheError, isSuccess: isDeleteDemarcheSuccess, isLoading: isDeleteDemarcheLoading }] = useDeleteCalendarItemTypeMutation()
  const { deleteHcpRecursively: deleteService, isLoading: isDeleteServiceLoading, isSuccess: isDeleteServiceSuccess, error: isDeleteServiceError } = useRecursiveHcpDeletion()

  const handleSubmit = () => {
    try {
      if (!service) throw new Error('No service selected')
      const { name } = form.getFieldsValue()
      createUpdateService({ ...service, name: name })
      form.submit()
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  useEffect(() => {
    if (service) {
      form.setFieldsValue({
        name: service.name,
      })
    }
  }, [service, form])

  const handleServiceDelete = () => {
    try {
      if (!service) throw new Error('No site selected')
      deleteService(service)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setSelectedKey('default')
    }
  }

  const handleProcedureDelete = () => {
    try {
      if (!editItem) throw new Error('No site selected')
      deleteProcedure([editItem.id])
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setEditItem(undefined)
    }
  }

  const handleSaveProcedure = (item: CalendarItemType) => {
    try {
      createUpdateProcedure({ ...item, name: inputValue })
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setInputValue(t('content.new_procedure'))
      setEditItem(undefined)
    }
  }

  const handleEditService = (item: CalendarItemType) => {
    setEditItem(item)
    setInputValue(item.name ?? '')
  }

  const handleDeleteService = (item: CalendarItemType) => {
    setShowDeleteProcedureModal(true)
  }

  const cancelEditService = () => {
    setEditItem(undefined)
    setInputValue(t('content.new_procedure'))
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

  const handleCancel = () => {
    form.resetFields()
  }

  const nameValue = Form.useWatch('name', form)

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="edit-service">
        <Form
          layout="vertical"
          colon={false}
          form={form}
          initialValues={{
            name: service?.name,
          }}
          style={{ width: '100%' }}
        >
          <Form.Item name="name" rules={[{ required: true, message: 'Name of the service' }]}>
            <Input
              suffix={
                <Tooltip title={t('content.reset_name')}>
                  <span
                    style={{
                      color: nameValue === service?.name ? 'gray' : 'black',
                      cursor: nameValue === service?.name ? 'not-allowed' : 'pointer',
                      pointerEvents: 'auto',
                    }}
                    onClick={handleCancel}
                  >
                    <CloseOutlined />
                  </span>
                </Tooltip>
              }
              value={service ? service.name : t('content.new_service')}
              style={{ fontSize: 13, borderRadius: 0, width: '100%' }}
            />
          </Form.Item>
        </Form>
        <Tooltip title={t('content.save_service')}>
          <Button
            icon={<SaveOutlined />}
            style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
            disabled={nameValue === service?.name}
            onClick={handleSubmit}
          />
        </Tooltip>
        <Tooltip title={t('content.delete_service')}>
          <Button
            icon={<DeleteOutlined />}
            disabled={!service}
            onClick={() => setShowDeleteServiceModal(true)}
            style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
          />
        </Tooltip>
      </div>
      <div className="procedures-list">
        <List
          header={<ListHeader service={service} agenda={agenda} handleSaveProcedure={handleSaveProcedure} />}
          dataSource={servicesList}
          locale={{ emptyText: <Empty description={t('content.no_procedure_yet')} /> }}
          renderItem={(item) => (
            <List.Item>
              {editItem?.id === item.id ? (
                <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveProcedure(item)} autoFocus />
              ) : (
                item.name
              )}
              {editItem?.id !== item.id && (
                <Tooltip title={t('content.edit_procedure')}>
                  <Button
                    className="edit-button"
                    icon={<EditOutlined />}
                    style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                    onClick={() => handleEditService(item)}
                  />
                </Tooltip>
              )}
              {editItem?.id === item.id && (
                <div className="action-buttons">
                  <Tooltip title="Cancel">
                    <Button icon={<RollbackOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={cancelEditService} />
                  </Tooltip>
                  <Tooltip title={t('content.save_procedure')}>
                    <Button
                      icon={<SaveOutlined />}
                      style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                      onClick={() => handleSaveProcedure(item)}
                    />
                  </Tooltip>
                  <Tooltip title={t('content.delete_procedure')}>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteService(item)}
                      style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                    />
                  </Tooltip>
                </div>
              )}
            </List.Item>
          )}
        />
      </div>

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
              handleServiceDelete()
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
              handleProcedureDelete()
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

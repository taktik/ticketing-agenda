import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined, RollbackOutlined, CloseOutlined } from '@ant-design/icons'
import { SettingContext } from '../../../contexts/SettingContext'
import { HealthcareParty, CalendarItemType, Agenda } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col, notification, message, Empty } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './index.css'
import {
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartiesByParentQuery,
  useRecursiveHcpDeletion,
} from '../../../core/api/healthcarePartyApi'
import { useDeleteCalendarItemTypeMutation } from '../../../core/api/calendarItemTypeApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { createPortal } from 'react-dom'
import { v4 } from 'uuid'
import { useCreateUpdateAgendaMutation, useDeleteAgendaByAuthorId, useDeleteAgendaMutation, useGetAgendaByAuthorId } from '../../../core/api/agendaApi'
import { useTranslation } from 'react-i18next'

interface ListHeaderProps {
  site: HealthcareParty | undefined
  handleSaveService: (item: HealthcareParty) => void
}

const ListHeader = React.memo(({ site, handleSaveService }: ListHeaderProps) => {
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

  const handleAddService = useCallback(() => {
    try {
      if (!selectedKeyId) throw new Error('No selected Site')
      const serviceHcp = new HealthcareParty({ name: t('content.new_service'), parentId: selectedKeyId, id: v4() })
      handleSaveService(serviceHcp)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }, [selectedKeyId])

  return (
    <div className="list-header">
      {notificationContextHolder}
      <div>{t('content.services')} :</div>
      <Tooltip title={!site?.rev ? t('content.save_site_before_adding_services') : t('content.add_new_service')}>
        <Button icon={<PlusOutlined />} disabled={!site?.rev} onClick={handleAddService} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
      </Tooltip>
    </div>
  )
})

interface SiteSettingProps {
  site: HealthcareParty | undefined
}

export const SiteSetting = ({ site }: SiteSettingProps): ReactElement => {
  const { setSelectedKey } = useContext(SettingContext)
  const { t, i18n } = useTranslation()
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const [editItem, setEditItem] = useState<HealthcareParty | undefined>(undefined) // The service being edited in the list
  const [inputValue, setInputValue] = useState<string>(t('content.new_service')) // Input value of the service being edited

  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: !site, parentId: site?.id ?? '' })
  const servicesList = useMemo(() => {
    // Sorting the services alphabetically
    return [...(services ?? [])].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services])

  const [form] = Form.useForm()

  const [createUpdateAgendaMutation, { isError: isCreateUpdateAgendaError, isSuccess: isCreateUpdateAgendaSuccess, isLoading: isCreateUpdateAgendaLoading }] =
    useCreateUpdateAgendaMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const [createUpdateSite, { isError: isCreateUpdateSiteError, isSuccess: isCreateUpdateSiteSuccess, isLoading: isCreateUpdateSiteLoading }] =
    useCreateUpdateHealthcarePartyMutation()
  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] =
    useCreateUpdateHealthcarePartyMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const { deleteHcpRecursively: deleteSite, isLoading: isDeleteSiteLoading, isSuccess: isDeleteSiteSuccess, error: isDeleteSiteError } = useRecursiveHcpDeletion()
  const { deleteHcpRecursively: deleteService, isLoading: isDeleteServiceLoading, isSuccess: isDeleteServiceSuccess, error: isDeleteServiceError } = useRecursiveHcpDeletion()

  const handleSubmit = () => {
    try {
      if (!site) throw new Error('No site selected')
      const { name } = form.getFieldsValue()
      createUpdateSite({ ...site, name: name })
      form.submit()
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  useEffect(() => {
    if (site) {
      form.setFieldsValue({
        name: site.name,
      })
    }
  }, [site, form])

  const handleSiteDelete = () => {
    if (site) {
      deleteSite(site)
    }
    setSelectedKey('default')
  }

  const handleServiceDelete = () => {
    if (editItem) {
      deleteService(editItem)
      setEditItem(undefined)
    }
  }

  const handleSaveService = useCallback(
    (item: HealthcareParty) => {
      try {
        createUpdateService({ ...item, name: inputValue })
        setInputValue(t('content.new_service'))
      } catch (error) {
        openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
      }
    },
    [inputValue],
  )

  const handleEditServiceClick = (item: HealthcareParty) => {
    setInputValue(item.name ?? '')
    setEditItem(item)
  }

  const handleDeleteServiceClick = (item: HealthcareParty) => {
    if (!item.rev) {
      setEditItem(undefined)
    } else {
      setShowDeleteServiceModal(true)
    }
  }

  const cancelEditService = () => {
    setEditItem(undefined)
    setInputValue(t('content.new_service'))
  }

  // If we successfully created the service, then we create the associated agenda. Error is handled in the useEffects below
  useEffect(() => {
    if (editItem && isCreateUpdateServiceSuccess) {
      if (!editItem.rev) {
        // If service has no rev, it's a new object and thus we create an associated agenda
        createUpdateAgendaMutation(new Agenda({ author: editItem.id }))
      }
      setEditItem(undefined)
    }
  }, [isCreateUpdateServiceSuccess])

  // We have two same mutations with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  useEffect(() => {
    if (isDeleteSiteSuccess) showMessageFeedback('success', t('notification.site_deleted'))
    if (isDeleteSiteError) openNotification('error', t('notification.site_delete_failed'), t('notification.site_delete_error'))
  }, [isDeleteSiteSuccess, isDeleteSiteError])

  useEffect(() => {
    if (isCreateUpdateSiteSuccess) showMessageFeedback('success', t('notification.site_saved'))
    if (isCreateUpdateSiteError) openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
  }, [isCreateUpdateSiteSuccess, isCreateUpdateSiteError])

  // We have two same mutations with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
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
      <div className="top-part">
        <div className="edit-site">
          <Form
            layout="vertical"
            colon={false}
            form={form}
            initialValues={{
              name: site?.name,
            }}
            style={{ width: '100%' }}
          >
            <Form.Item name="name" rules={[{ required: true, message: 'Name of the site' }]}>
              <Input
                suffix={
                  <Tooltip title={t('content.reset_name')}>
                    <span
                      style={{
                        color: nameValue === site?.name ? 'gray' : 'black',
                        cursor: nameValue === site?.name ? 'not-allowed' : 'pointer',
                        pointerEvents: 'auto',
                      }}
                      onClick={handleCancel}
                    >
                      <CloseOutlined />
                    </span>
                  </Tooltip>
                }
                value={site ? site.name : t('content.new_site')}
                style={{ fontSize: 13, borderRadius: 0, width: '100%' }}
              />
            </Form.Item>
          </Form>
          <Tooltip title={t('content.save_site')}>
            <Button
              icon={<SaveOutlined />}
              style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
              disabled={nameValue === site?.name && !!site?.rev}
              onClick={handleSubmit}
            />
          </Tooltip>
          <Tooltip title={t('content.delete_site')}>
            <Button
              icon={<DeleteOutlined />}
              disabled={!site}
              onClick={() => setShowDeleteSiteModal(true)}
              style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
            />
          </Tooltip>
        </div>
        <div className="services-list">
          <List
            header={<ListHeader site={site} handleSaveService={handleSaveService} />}
            dataSource={servicesList}
            locale={{ emptyText: <Empty description={t('content.no_service_yet')} /> }}
            renderItem={(item) => (
              <List.Item>
                {editItem?.id === item.id ? (
                  <Input defaultValue={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveService(item)} autoFocus />
                ) : (
                  item.name
                )}
                {editItem?.id !== item.id && (
                  <Tooltip title={t('content.edit_service')}>
                    <Button
                      className="edit-button"
                      icon={<EditOutlined />}
                      style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                      onClick={() => handleEditServiceClick(item)}
                    />
                  </Tooltip>
                )}
                {editItem?.id === item.id && (
                  <div className="action-buttons">
                    <Tooltip title="Cancel">
                      <Button icon={<RollbackOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={cancelEditService} />
                    </Tooltip>
                    <Tooltip title={t('content.save_service')}>
                      <Button
                        icon={<SaveOutlined />}
                        style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                        onClick={() => handleSaveService(item)}
                      />
                    </Tooltip>
                    <Tooltip title={t('content.delete_service')}>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteServiceClick(item)}
                        style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                      />
                    </Tooltip>
                  </div>
                )}
              </List.Item>
            )}
          />
        </div>
      </div>
      {showDeleteSiteModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_site_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_site_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
            onYesClick={() => {
              handleSiteDelete()
              setShowDeleteSiteModal(false)
            }}
            onNoClick={() => setShowDeleteSiteModal(false)}
            isVisible={showDeleteSiteModal}
            mode="danger"
          />,
          document.body,
        )}
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
    </div>
  )
}

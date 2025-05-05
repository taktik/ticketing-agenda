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
  editItem: HealthcareParty | undefined
  setEditItem: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
}

const ListHeader = React.memo(({ site, editItem, setEditItem }: ListHeaderProps) => {
  const { newService, setNewService, selectedKeyId } = useContext(SettingContext)
  const { t, i18n } = useTranslation()

  const handleAddService = useCallback(() => {
    if (!newService && selectedKeyId) {
      const addedService = new HealthcareParty({ name: 'New Service', parentId: selectedKeyId, id: v4() })
      setNewService(addedService)
      if (!editItem) {
        setEditItem(addedService)
      }
    } else {
      // selectedkeyId undefined ? => error
    }
  }, [newService, setNewService, editItem, selectedKeyId])
  return (
    <div className="list-header">
      <div>Services :</div>
      <Tooltip title={!site?.rev ? 'You must first save the site before adding Services' : 'Add a new service'}>
        <Button
          icon={<PlusOutlined />}
          disabled={!!newService || !site?.rev}
          onClick={handleAddService}
          style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
        />
      </Tooltip>
    </div>
  )
})

interface SiteSettingProps {
  site: HealthcareParty | undefined
}

export const SiteSetting = ({ site }: SiteSettingProps): ReactElement => {
  const { newSite, setNewSite, setSelectedKey, newService, setNewService } = useContext(SettingContext)
  const { t, i18n } = useTranslation()
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const siteIsNew = useMemo(() => (newSite ? newSite.id === site?.id : false), [newSite, site]) // Easier to use that condition
  const [editItem, setEditItem] = useState<HealthcareParty | undefined>(undefined) // The service being edited in the list
  const [inputValue, setInputValue] = useState<string>('New service') // Input value of the service being edited

  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: !site, parentId: site?.id ?? '' })
  const servicesList = useMemo(() => {
    // Sorting the services alphabetically
    const combined = [...(services ?? []), ...(newService ? [newService] : [])]
    return combined.sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services, newService])

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
      if (newSite && siteIsNew) setNewSite(undefined)
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
    if (site && !siteIsNew) {
      deleteSite(site)
      setSelectedKey('default')
    }
  }

  const handleServiceDelete = () => {
    if (editItem) {
      deleteService(editItem)
      setEditItem(undefined)
    }
  }

  const handleSaveServiceClick = useCallback(
    (item: HealthcareParty) => {
      createUpdateService({ ...item, name: inputValue })
      setInputValue('New service')
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
      setNewService(undefined)
    } else {
      setShowDeleteServiceModal(true)
    }
  }

  const cancelEditService = () => {
    setEditItem(undefined)
    setInputValue('New service')
  }

  // If we successfully created the service, then we create the associated agenda. Error is handled in the useEffects below
  useEffect(() => {
    if (editItem && isCreateUpdateServiceSuccess) {
      if (!editItem.rev) {
        // If service has no rev, it's a new object and thus we create an associated agenda
        createUpdateAgendaMutation(new Agenda({ author: editItem.id }))
      }
      setEditItem(undefined)
      if (editItem.id === newService?.id) setNewService(undefined)
    }
  }, [isCreateUpdateServiceSuccess])

  // We have two same mutations with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  useEffect(() => {
    if (isDeleteSiteSuccess) showMessageFeedback('success', 'The site was deleted!')
    if (isDeleteSiteError) openNotification('error', 'We could not delete the site!', `An error occurred while deleting the site.`)
  }, [isDeleteSiteSuccess, isDeleteSiteError])

  useEffect(() => {
    if (isCreateUpdateSiteSuccess) showMessageFeedback('success', 'The site was saved!')
    if (isCreateUpdateSiteError) openNotification('error', 'We could not save the site!', `An error occurred while saving the site.`)
  }, [isCreateUpdateSiteSuccess, isCreateUpdateSiteError])

  // We have two same mutations with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  useEffect(() => {
    if (isDeleteServiceSuccess) showMessageFeedback('success', 'The service was deleted!')
    if (isDeleteServiceError) openNotification('error', 'We could not delete the service!', `An error occurred while deleting the service.`)
  }, [isDeleteServiceSuccess, isDeleteServiceError])

  useEffect(() => {
    if (isCreateUpdateServiceSuccess) showMessageFeedback('success', 'The service was saved!')
    if (isCreateUpdateServiceError) openNotification('error', 'We could not save the service!', `An error occurred while saving the service.`)
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
    setNewService(undefined)
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
                suffix={<CloseOutlined disabled={nameValue === site?.name} onClick={handleCancel} />}
                value={site ? site.name : 'New site'}
                size="large"
                style={{ fontSize: 13, borderRadius: 0, width: '100%' }}
              />
            </Form.Item>
          </Form>
          <Tooltip title="Save the site">
            <Button
              icon={<SaveOutlined />}
              style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
              disabled={nameValue === site?.name && !!site?.rev}
              onClick={handleSubmit}
            />
          </Tooltip>
          <Tooltip title="Delete the site">
            <Button
              icon={<DeleteOutlined />}
              disabled={siteIsNew || !site}
              onClick={() => setShowDeleteSiteModal(true)}
              style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
            />
          </Tooltip>
        </div>
        <div className="services-list">
          <List
            header={<ListHeader site={site} editItem={editItem} setEditItem={setEditItem} />}
            dataSource={servicesList}
            locale={{ emptyText: <Empty description="No service yet" /> }}
            renderItem={(item) => (
              <List.Item>
                {editItem?.id === item.id ? (
                  <Input defaultValue={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveServiceClick(item)} autoFocus />
                ) : (
                  item.name
                )}
                {editItem?.id !== item.id && (
                  <Tooltip title="Edit the service">
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
                    <Tooltip title="Save the service">
                      <Button
                        icon={<SaveOutlined />}
                        style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                        onClick={() => handleSaveServiceClick(item)}
                      />
                    </Tooltip>
                    <Tooltip title="Delete the service">
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
            title="Are you sure you want to delete this site?"
            description=""
            content={
              <>
                <p>This action will delete the services, demarches and all schedules associated with that site</p>
                <p>Once deleted, their information can&rsquo;t be recovered, so it&rsquo;s a permanent action.</p>
              </>
            }
            yesBtnTitle="Delete"
            noBtnTitle="Close"
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
            title="Are you sure you want to delete this service?"
            description=""
            content={
              <>
                <p>This action will delete the demarches and all schedules associated with that service.</p>
                <p>Once deleted, their information can&rsquo;t be recovered, so it&rsquo;s a permanent action.</p>
              </>
            }
            yesBtnTitle="Delete"
            noBtnTitle="Close"
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

import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons'
import { SettingContext } from '../../../contexts/SettingContext'
import { HealthcareParty, CalendarItemType, Agenda } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col, notification, message } from 'antd'
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

const ListHeader = React.memo(() => {
  const { newService, setNewService, selectedKeyId } = useContext(SettingContext)
  const handleAddService = useCallback(() => {
    if (!newService && selectedKeyId) {
      setNewService(new HealthcareParty({ name: 'New Service', parentId: selectedKeyId, id: v4() }))
    } else {
      // selectedkeyId undefined ? => error
    }
  }, [newService, setNewService])
  return (
    <div className="list-header">
      <div>Services :</div>
      <Tooltip title="Add a new service">
        <Button icon={<PlusOutlined />} disabled={!!newService} onClick={handleAddService} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
      </Tooltip>
    </div>
  )
})

interface SiteSettingProps {
  site: HealthcareParty | undefined
}

export const SiteSetting = ({ site }: SiteSettingProps): ReactElement => {
  const { newSite, setNewSite, setSelectedKey, newService, setNewService } = useContext(SettingContext)
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const siteIsNew = useMemo(() => (newSite ? newSite.id === site?.id : false), [newSite, site]) // Easier to use that condition
  const [editItem, setEditItem] = useState<HealthcareParty | undefined>(undefined) // The demarche being edited in the list
  const [inputValue, setInputValue] = useState<string>('') // Input value of the demarche being edited

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

  const { data: agenda } = useGetAgendaByAuthorId({ skip: !editItem, authorId: editItem?.id ?? '' })
  const [deleteAgenda, { isError: isDeleteAgendaError, isSuccess: isDeleteAgendaSuccess, isLoading: isDeleteAgendaLoading }] = useDeleteAgendaMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const [createUpdateSite, { isError: isCreateUpdateSiteError, isSuccess: isCreateUpdateSiteSuccess, isLoading: isCreateUpdateSiteLoading }] =
    useCreateUpdateHealthcarePartyMutation()
  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] =
    useCreateUpdateHealthcarePartyMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  // const [deleteSite, { isError: isDeleteSiteError, isSuccess: isDeleteSiteSuccess, isLoading: isDeleteSiteLoading }] = useDeleteHealthcarePartyMutation()  OLD WAY
  const { deleteHcpRecursively, isLoading: isDeleteSiteLoading, isSuccess: isDeleteSiteSuccess, error: isDeleteSiteError } = useRecursiveHcpDeletion()
  const [deleteService, { isError: isDeleteServiceError, isSuccess: isDeleteServiceSuccess, isLoading: isDeleteServiceLoading }] = useDeleteHealthcarePartyMutation()

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
      deleteHcpRecursively(site)
      setSelectedKey('default')
    }
  }

  const handleServiceDelete = () => {
    if (editItem && agenda) {
      deleteAgenda(agenda)
    }
  }

  const handleSaveServiceClick = useCallback(
    (item: HealthcareParty) => {
      createUpdateService({ ...item, name: inputValue })
    },
    [inputValue],
  )

  const handleEditServiceClick = (item: HealthcareParty) => {
    setEditItem(item)
    setInputValue(item.name ?? '')
  }

  const cancelEditService = () => {
    setEditItem(undefined)
  }

  // If we successfully crated the service, then we create the associated agenda. Error is handled in the useEffects below
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

  // If we successfully deleted the agenda, then we delete the associated service. Error is handled in the useEffects below
  useEffect(() => {
    if (editItem && isDeleteAgendaSuccess) {
      deleteService(editItem)
      setEditItem(undefined)
    }
  }, [isDeleteAgendaSuccess])

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
    if (isDeleteServiceSuccess) showMessageFeedback('success', 'The service te was deleted!')
    if (isDeleteServiceError || isDeleteAgendaError) openNotification('error', 'We could not delete the service!', `An error occurred while deleting the service.`)
  }, [isDeleteServiceSuccess, isDeleteServiceError, isDeleteAgendaError])

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
              <Input value={site ? site.name : "Site's name"} size="large" style={{ fontSize: 13, borderRadius: 0 }} />
            </Form.Item>
          </Form>
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
            header={<ListHeader />}
            dataSource={servicesList}
            renderItem={(item) => (
              <List.Item>
                {editItem?.id === item.id ? (
                  <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveServiceClick(item)} autoFocus />
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
                        disabled={item.id === newService?.id}
                        onClick={() => setShowDeleteServiceModal(true)}
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
      <div className="button-list">
        <Button variant="filled" color="primary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save</Button>
      </div>
      {showDeleteSiteModal &&
        createPortal(
          <ModalConfirmAction
            title="Delete site"
            description="Are you sure you want to delete this site? Once deleted, their information can't be recovered, so it's a permanent action."
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
            title="Delete service"
            description="Are you sure you want to delete this service? Once deleted, their information can't be recovered, so it's a permanent action."
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

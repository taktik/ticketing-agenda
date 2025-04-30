import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons'
import { SettingContext } from '../../../contexts/SettingContext'
import { HealthcareParty, CalendarItemType, Agenda } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col, notification, message } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './index.css'
import { useCreateUpdateHealthcarePartyMutation, useDeleteHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery } from '../../../core/api/healthcarePartyApi'
import { useDeleteCalendarItemTypeMutation } from '../../../core/api/calendarItemTypeApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { createPortal } from 'react-dom'
import { v4 } from 'uuid'
import { useCreateUpdateAgendaMutation } from '../../../core/api/agendaApi'

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
  const siteIsNew = useMemo(() => (newSite ? newSite.id === site?.id : false), [newSite, site])
  const [editItem, setEditItem] = useState<HealthcareParty | undefined>(undefined)
  const [inputValue, setInputValue] = useState<string>('')

  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: !site, parentId: site?.id ?? '' })
  const servicesList = useMemo(() => {
    const combined = [...(services ?? []), ...(newService ? [newService] : [])]
    return combined.sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [services, newService])

  const [form] = Form.useForm()

  const [createUpdateAgendaMutation, { isError: isCreateAgendaError, isSuccess: isCreateAgendaSuccess, isLoading: isCreateAgendaLoading }] = useCreateUpdateAgendaMutation()
  const [createUpdateHealthcareParty, { isError: isUpdateError, isSuccess: isUpdateSuccess, isLoading: isUpdateLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [deleteHealthcareParty, { isError: isDeleteError, isSuccess: isDeleteSuccess, isLoading: isDeleteLoading }] = useDeleteHealthcarePartyMutation()

  const handleSubmit = () => {
    const { name } = form.getFieldsValue()
    createUpdateHealthcareParty(new HealthcareParty({ ...site, ...form.getFieldsValue() }))
    if (newSite && siteIsNew) setNewSite(undefined)

    form.submit()
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
      deleteHealthcareParty(site)
      setSelectedKey('default')
    }
  }

  const handleServiceDelete = () => {
    if (editItem) {
      deleteHealthcareParty(editItem)
      setEditItem(undefined)
    }
  }

  useEffect(() => {
    if (isDeleteSuccess) showMessageFeedback('success', 'The site was deleted!')
    if (isDeleteError) openNotification('error', 'We could not delete the site!', `An error occurred while deleting the site.`)
  }, [isDeleteSuccess, isDeleteError])

  useEffect(() => {
    if (isUpdateSuccess) showMessageFeedback('success', 'The site was saved!')
    if (isUpdateError) openNotification('error', 'We could not save the site!', `An error occurred while saving the site.`)
  }, [isUpdateSuccess, isUpdateError])

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

  const handleEditClick = (item: HealthcareParty) => {
    setEditItem(item)
    setInputValue(item.name ?? '')
  }

  const handleSaveClick = useCallback(
    (item: HealthcareParty) => {
      createUpdateHealthcareParty(new HealthcareParty({ ...item, name: inputValue }))
      createUpdateAgendaMutation(new Agenda({ author: item.id }))
      setEditItem(undefined)
      if (item.id === newService?.id) setNewService(undefined)
    },
    [services, editItem, inputValue, newService],
  )

  const cancelEdit = () => {
    setEditItem(undefined)
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
                  <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveClick(item)} autoFocus />
                ) : (
                  item.name
                )}
                {editItem?.id !== item.id && (
                  <Tooltip title="Edit the service">
                    <Button
                      className="edit-button"
                      icon={<EditOutlined />}
                      style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                      onClick={() => handleEditClick(item)}
                    />
                  </Tooltip>
                )}
                {editItem?.id === item.id && (
                  <div className="action-buttons">
                    <Tooltip title="Cancel">
                      <Button icon={<RollbackOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={cancelEdit} />
                    </Tooltip>
                    <Tooltip title="Save the service">
                      <Button
                        icon={<SaveOutlined />}
                        style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                        onClick={() => handleSaveClick(item)}
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

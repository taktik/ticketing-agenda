import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { SettingContext } from '../../../contexts/SettingContext'
import { HealthcareParty, CalendarItemType } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col, notification, message } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './index.css'
import { useCreateUpdateHealthcarePartyMutation, useDeleteHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery } from '../../../core/api/healthcarePartyApi'
import { useDeleteCalendarItemTypeMutation } from '../../../core/api/calendarItemTypeApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { createPortal } from 'react-dom'
import { v4 } from 'uuid'

const ListHeader = React.memo(() => {
  const { newService, setNewService, selectedKeyId } = useContext(SettingContext)
  const handleAddService = useCallback(() => {
    if (!newService && selectedKeyId) {
      setNewService(new HealthcareParty({ name: 'New Demarche', parentId: selectedKeyId, id: v4() }))
    } else {
      // selectedkeyId undefined ? => error
    }
  }, [newService, setNewService])
  return (
    <div className="list-header">
      <div>Services</div>
      <Tooltip title="Add a new site">
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
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const siteIsNew = useMemo(() => (newSite ? newSite.id === site?.id : false), [newSite, site])
  const [editItem, setEditItem] = useState<string | undefined>(undefined)
  const [inputValue, setInputValue] = useState<string>('')

  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: !site, parentId: site?.id ?? '' })
  const servicesList = useMemo(() => [...(services ?? []), ...(newService ? [newService] : [])], [services, newService])

  const [form] = Form.useForm()

  const [createUpdateHealthcareParty, { data, error, isError: isUpdateError, isSuccess: isUpdateSuccess, isLoading: isUpdateLoading }] = useCreateUpdateHealthcarePartyMutation()
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

  const handleDelete = () => {
    if (site && !siteIsNew) {
      deleteHealthcareParty(site)
      setSelectedKey('default')
    }
  }

  useEffect(() => {
    if (isDeleteLoading) showMessageFeedback('loading', 'The site is deleting...')
    if (isDeleteSuccess) showMessageFeedback('success', 'The site was deleted!')
    if (isDeleteError) openNotification('error', 'We could not delete the site!', `An error occurred while deleting the site.`)
  }, [isDeleteLoading, isDeleteSuccess, isDeleteError])

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

  const handleClose = () => {
    form.resetFields()
  }

  const handleEditClick = (item: HealthcareParty) => {
    setEditItem(item.id)
    setInputValue(item.name ?? '')
  }

  const handleSaveClick = useCallback(
    (item: HealthcareParty) => {
      const updatedItems = (services ?? []).map((item) => (item.id === editItem ? { ...item, name: inputValue } : item))
      console.log('Updated Items:', updatedItems)
      setEditItem(undefined)
    },
    [services, editItem, inputValue],
  )

  return (
    <div className="root">
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
              onClick={() => setShowDeleteModal(true)}
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
                {editItem === item.id ? (
                  <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveClick(item)} autoFocus />
                ) : (
                  item.name
                )}
                {editItem !== item.id && (
                  <Button icon={<EditOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={() => handleEditClick(item)} />
                )}
                {editItem === item.id && (
                  <Button icon={<SaveOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={() => handleSaveClick(item)} />
                )}
              </List.Item>
            )}
          />
        </div>
      </div>
      <div className="button-list">
        <Button variant="filled" color="primary" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save</Button>
      </div>
      {showDeleteModal &&
        createPortal(
          <ModalConfirmAction
            title="Delete site"
            description="Are you sure you want to delete this site? Once deleted, their information can't be recovered, so it's a permanent action."
            yesBtnTitle="Delete"
            noBtnTitle="Close"
            onYesClick={() => {
              handleDelete()
              setShowDeleteModal(false)
            }}
            onNoClick={() => setShowDeleteModal(false)}
            isVisible={showDeleteModal}
            mode="danger"
          />,
          document.body,
        )}
    </div>
  )
}

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

interface ListHeaderProps {
  service: HealthcareParty | undefined
  editItem: CalendarItemType | undefined
  setEditItem: React.Dispatch<React.SetStateAction<CalendarItemType | undefined>>
  agenda: Agenda | undefined
}

const ListHeader = React.memo(({ service, agenda, editItem, setEditItem }: ListHeaderProps) => {
  const { selectedKeyId, newDemarche, setNewDemarche } = useContext(SettingContext)
  const handleAddDemarche = useCallback(() => {
    if (!newDemarche && selectedKeyId) {
      const addedDemarche = new CalendarItemType({ name: 'New Demarche', healthcarePartyId: service?.id, agendaId: agenda?.id, id: v4() })
      setNewDemarche(addedDemarche)
      console.log('addedDemarche', addedDemarche)
      if (!editItem) {
        setEditItem(addedDemarche)
      }
    } else {
      // selectedkeyId undefined ? => error
    }
  }, [newDemarche, setNewDemarche, editItem, service, agenda])
  return (
    <div className="list-header">
      <div>Demarches :</div>
      <Tooltip title="Add a new demarche">
        <Button
          icon={<PlusOutlined />}
          disabled={!!newDemarche}
          onClick={handleAddDemarche}
          style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
        />
      </Tooltip>
    </div>
  )
})

interface ServiceSettingProps {
  service: HealthcareParty | undefined
}

export const ServiceSetting = ({ service }: ServiceSettingProps): ReactElement => {
  const { setSelectedKey, newDemarche, setNewDemarche } = useContext(SettingContext)
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState<boolean>(false)
  const [showDeleteDemarcheModal, setShowDeleteDemarcheModal] = useState<boolean>(false)
  const [editItem, setEditItem] = useState<CalendarItemType | undefined>(undefined) // The demarche being edited in the list
  const [inputValue, setInputValue] = useState<string>('New Demarche') // Input value of the demarche being edited

  const { data: agenda } = useGetAgendaByAuthorId({ skip: !service, authorId: service?.id ?? '' })

  const { data: demarches } = useGetCalendarItemTypesQuery({ skip: !service || !agenda, agendaId: agenda?.id ?? '' })

  useEffect(() => console.log('service', service), [service])
  useEffect(() => console.log('agenda', agenda), [agenda])
  useEffect(() => console.log('demarches', demarches), [demarches])

  const servicesList = useMemo(() => {
    // Sorting the services alphabetically
    const combined = [...(demarches ?? []), ...(newDemarche ? [newDemarche] : [])]
    return combined.sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [demarches, newDemarche])

  const [form] = Form.useForm()

  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] =
    useCreateUpdateHealthcarePartyMutation()
  const [
    createUpdateDemarche,
    { data: createdUpdatedCalendarItemTypeData, isError: isCreateUpdateDemarcheError, isSuccess: isCreateUpdateDemarcheSuccess, isLoading: isCreateUpdateDemarcheLoading },
  ] = useCreateUpdateCalendarItemTypeMutation()

  useEffect(() => console.log('createdUpdatedCalendarItemTypeData', createdUpdatedCalendarItemTypeData), [createdUpdatedCalendarItemTypeData])

  const [deleteDemarche, { isError: isDeleteDemarcheError, isSuccess: isDeleteDemarcheSuccess, isLoading: isDeleteDemarcheLoading }] = useDeleteCalendarItemTypeMutation()
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
    if (service) {
      deleteService(service)
      setSelectedKey('default')
    }
  }

  const handleDemarcheDelete = () => {
    if (editItem) {
      deleteDemarche([editItem.id])
      setEditItem(undefined)
    }
  }

  const handleSaveServiceClick = useCallback(
    (item: CalendarItemType) => {
      // Create/Update the demarche
      createUpdateDemarche({ ...item, name: inputValue })
      // Set back to default
      setInputValue('New Demarche')
      setEditItem(undefined)
      // If this was a new demarche, set newDemarche value back to default as well
      if (item.id === newDemarche?.id) setNewDemarche(undefined)
    },
    [inputValue, newDemarche],
  )

  const handleEditServiceClick = (item: CalendarItemType) => {
    setEditItem(item)
    setInputValue(item.name ?? '')
  }

  const cancelEditService = () => {
    setEditItem(undefined)
  }

  /*
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
  */

  //  Two pairs of useffects : First pair handles the delete and create/update of demarches
  useEffect(() => {
    if (isDeleteDemarcheSuccess) showMessageFeedback('success', 'The demarche was deleted!')
    if (isDeleteDemarcheError) openNotification('error', 'We could not delete the demarche!', `An error occurred while deleting the demarche.`)
  }, [isDeleteDemarcheSuccess, isDeleteDemarcheError])

  useEffect(() => {
    if (isCreateUpdateDemarcheSuccess) showMessageFeedback('success', 'The demarche was saved!')
    if (isCreateUpdateDemarcheError) openNotification('error', 'We could not save the demarche!', `An error occurred while saving the demarche.`)
  }, [isCreateUpdateDemarcheSuccess, isCreateUpdateDemarcheError])

  // Second pair handles the delete and create/update of services
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
    setNewDemarche(undefined)
  }

  const nameValue = Form.useWatch('name', form)

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="top-part">
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
                suffix={<CloseOutlined disabled={nameValue === service?.name} onClick={handleCancel} />}
                value={service ? service.name : 'New service'}
                size="large"
                style={{ fontSize: 13, borderRadius: 0, width: '100%' }}
              />
            </Form.Item>
          </Form>
          <Tooltip title="Save the service">
            <Button
              icon={<SaveOutlined />}
              style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
              disabled={nameValue === service?.name && !!service?.rev}
              onClick={handleSubmit}
            />
          </Tooltip>
          <Tooltip title="Delete the service">
            <Button
              icon={<DeleteOutlined />}
              disabled={!service}
              onClick={() => setShowDeleteServiceModal(true)}
              style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
            />
          </Tooltip>
        </div>
        <div className="demarches-list">
          <List
            header={<ListHeader service={service} agenda={agenda} editItem={editItem} setEditItem={setEditItem} />}
            dataSource={servicesList}
            locale={{ emptyText: <Empty description="No demarche yet" /> }}
            renderItem={(item) => (
              <List.Item>
                {editItem?.id === item.id ? (
                  <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveServiceClick(item)} autoFocus />
                ) : (
                  item.name
                )}
                {editItem?.id !== item.id && (
                  <Tooltip title="Edit the demarche">
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
                    <Tooltip title="Save the demarche">
                      <Button
                        icon={<SaveOutlined />}
                        style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }}
                        onClick={() => handleSaveServiceClick(item)}
                      />
                    </Tooltip>
                    <Tooltip title="Delete the demarche">
                      <Button
                        icon={<DeleteOutlined />}
                        disabled={item.id === newDemarche?.id}
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
      {showDeleteDemarcheModal &&
        createPortal(
          <ModalConfirmAction
            title="Are you sure you want to delete this demarche?"
            description=""
            content={
              <>
                <p>This action will delete all schedules associated with that demarche.</p>
                <p>Once deleted, their information can&rsquo;t be recovered, so it&rsquo;s a permanent action.</p>
              </>
            }
            yesBtnTitle="Delete"
            noBtnTitle="Close"
            onYesClick={() => {
              handleDemarcheDelete()
              setShowDeleteDemarcheModal(false)
            }}
            onNoClick={() => setShowDeleteDemarcheModal(false)}
            isVisible={showDeleteDemarcheModal}
            mode="danger"
          />,
          document.body,
        )}
    </div>
  )
}

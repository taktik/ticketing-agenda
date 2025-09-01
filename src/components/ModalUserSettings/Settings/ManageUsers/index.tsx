import { ExclamationCircleOutlined } from '@ant-design/icons'
import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, Space, Table, Tag, message, notification } from 'antd'
import Column from 'antd/es/table/Column'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import {
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartiesByIdsQuery,
  useSilentDeleteHealthcarePartyMutation,
  useSilentUnDeleteHealthcarePartyMutation,
} from '../../../../core/api/healthcarePartyApi'
import { useCreateUpdateUserMutation, useDeleteUserMutation, useGetUsersQuery } from '../../../../core/api/userApi'
import { ModalConfirmAction } from '../../../common/ModalConfirmAction'

interface UserRow {
  rowId: string
  user: User | undefined
  hcp: HealthcareParty | undefined
  firstName: string | undefined
  lastName: string | undefined
  email: string | undefined
}

interface FormValues {
  firstName: string
  lastName: string
  email: string
}

export const ManagerUsers = (): ReactElement => {
  const { t } = useTranslation()
  const [tableRows, setTableRows] = useState<UserRow[]>([])
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false)
  const [userRowToBeDeleted, setUserRowToBeDeleted] = useState<UserRow | undefined>(undefined)
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: UserRow) => record.rowId === editingKey, [editingKey])
  const [form] = Form.useForm<FormValues>()

  const [createUpdateUser, { isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [createUpdateHcp, { isLoading: isCreateUpdateHcpLoading }] = useCreateUpdateHealthcarePartyMutation()

  const [deleteUser, { isLoading: isDeleteUserLoading }] = useDeleteUserMutation()
  const [deleteHcp, { isLoading: isDeleteHcpLoading }] = useDeleteHealthcarePartyMutation()

  const [deleteSilentHcp, { isLoading: isSilentDeleteHcpLading }] = useSilentDeleteHealthcarePartyMutation()
  const [unDeleteHcp, { isLoading: isSilentUndeleteHcpLoading }] = useSilentUnDeleteHealthcarePartyMutation()

  const { data: users, isLoading: isUsersLoading } = useGetUsersQuery(undefined)
  const usersHcpIds = useMemo(() => {
    if (!users) return []
    return users.map((user) => user.healthcarePartyId).filter((id): id is string => id !== undefined)
  }, [users])

  const { data: hcps, isLoading: isHcpsLoading } = useGetHealthcarePartiesByIdsQuery(usersHcpIds)

  const isFetching = useMemo(() => isUsersLoading || isHcpsLoading, [isUsersLoading, isHcpsLoading])
  const isMutating = useMemo(
    () => isCreateUpdateUserLoading || isCreateUpdateHcpLoading || isDeleteUserLoading || isDeleteHcpLoading || isSilentDeleteHcpLading || isSilentUndeleteHcpLoading,
    [isCreateUpdateUserLoading, isCreateUpdateHcpLoading, isDeleteUserLoading, isDeleteHcpLoading, isSilentDeleteHcpLading, isSilentUndeleteHcpLoading],
  )
  const isLoading = useMemo(() => isFetching || isMutating, [isFetching, isMutating])

  const mergedList = useMemo(() => {
    if (!users || !hcps) return []

    const hcpMap = new Map(hcps.map((hcp) => [hcp.id, hcp]))

    const mergedPairs: Array<[User, HealthcareParty]> = users.flatMap((user) => {
      if (!user.healthcarePartyId) return []
      const hcp = hcpMap.get(user.healthcarePartyId)
      return hcp ? [[user, hcp]] : []
    })

    return mergedPairs
  }, [users, hcps])

  useEffect(() => {
    const tableRowsList: UserRow[] = mergedList.map((pair) => {
      const user = pair[0]
      const hcp = pair[1]
      return {
        rowId: v4(),
        user: user,
        hcp: hcp,
        firstName: hcp.firstName,
        lastName: hcp.lastName,
        email: user.email,
      } as UserRow
    })

    tableRowsList.sort((a, b) => {
      const nameA = a.firstName ?? ''
      const nameB = b.firstName ?? ''
      return nameA.localeCompare(nameB)
    })
    setTableRows(tableRowsList)
  }, [mergedList])

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

  const addUser = useCallback(() => {
    const hcpId = v4()
    const newHcp = new HealthcareParty({ id: hcpId, firstName: undefined, lastName: undefined, name: undefined })
    const newUser = new User({ id: v4(), email: undefined, name: undefined, healthcarePartyId: hcpId })

    const newUserRow: UserRow = {
      rowId: v4(),
      user: newUser,
      hcp: newHcp,
      firstName: undefined,
      lastName: undefined,
      email: undefined,
    }

    setTableRows((prev) => [...prev, newUserRow])
  }, [setTableRows])

  const tableRowDelete = useCallback(async () => {
    try {
      if (!userRowToBeDeleted?.hcp || !userRowToBeDeleted.user) throw new Error('No user selected')

      if (userRowToBeDeleted.hcp.rev && userRowToBeDeleted.user.rev) {
        // Step 1: Delete HealthcareParty
        const deletedHcpResult = await deleteHcp(userRowToBeDeleted.hcp).unwrap()
        try {
          // Step 2: If HCP deletion was successful, try to delete User
          await deleteUser(userRowToBeDeleted.user).unwrap()
          showMessageFeedback('success', t('notification.user_deleted'))
        } catch (userError) {
          // User deletion failed, attempt to roll back the HCP deletion
          console.error('Failed to delete user:', userError)
          openNotification('error', t('notification.user_delete_failed'), t('notification.user_delete_error'))

          if (deletedHcpResult) {
            console.warn(`Attempting to roll back HCP deletion for ID: ${deletedHcpResult}`)
            try {
              await unDeleteHcp(userRowToBeDeleted.hcp).unwrap()
            } catch (rollbackError) {
              console.error(`Failed to roll back HCP deletion (ID: ${deletedHcpResult}):`, rollbackError)
            }
          }
        }
      } else {
        // This is a non-persisted user, just remove from local state
        setTableRows((prev) => prev.filter((user) => user.rowId !== userRowToBeDeleted.rowId))
      }
    } catch (hcpError) {
      // HealthcareParty deletion failed, so User deletion was not attempted.
      console.error('Failed to delete HealthcareParty:', hcpError)
      openNotification('error', t('notification.user_delete_failed'), t('notification.user_delete_error'))
    }
  }, [userRowToBeDeleted, deleteHcp, deleteUser, unDeleteHcp, setTableRows, showMessageFeedback, openNotification, t])

  const createUser = useCallback(
    async (record: UserRow) => {
      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        // Step 1: Create HealthcareParty
        const createdHcpResult = await createUpdateHcp({ ...record.hcp, firstName: rowValues.firstName, lastName: rowValues.lastName }).unwrap()
        try {
          // Step 2: If HCP creation was successful, try to create User
          await createUpdateUser({ ...record.user, email: rowValues.email }).unwrap()
          showMessageFeedback('success', t('notification.user_saved'))
        } catch (userError) {
          // User creation failed, roll back the HCP creation
          console.error('Failed to create user:', userError)
          openNotification('error', t('notification.user_save_failed'), t('notification.user_save_error'))

          if (createdHcpResult && createdHcpResult.id) {
            console.warn(`Attempting to roll back HCP creation for ID: ${createdHcpResult.id}`)
            try {
              await deleteSilentHcp(createdHcpResult).unwrap()
            } catch (rollbackError) {
              console.error(`Failed to roll back HCP creation (ID: ${createdHcpResult.id}):`, rollbackError)
            }
          }
        }
      } catch (hcpError) {
        // HealthcareParty creation failed, so User creation was not attempted.
        console.error('Failed to create HealthcareParty:', hcpError)
        openNotification('error', t('notification.user_save_failed'), t('notification.user_save_error'))
      }
    },
    [form, createUpdateHcp, createUpdateUser, deleteSilentHcp, showMessageFeedback, openNotification, t],
  )

  const updateUser = useCallback(
    async (record: UserRow) => {
      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        // Step 1: Update HealthcareParty
        await createUpdateHcp({ ...record.hcp, firstName: rowValues.firstName, lastName: rowValues.lastName }).unwrap()
        try {
          // Step 2: If HCP update was successful, try to update User
          await createUpdateUser({ ...record.user, email: rowValues.email }).unwrap()
          showMessageFeedback('success', t('notification.user_saved'))
        } catch (userError) {
          // User update failed, but HCP was updated.
          console.error('Failed to update user:', userError)
          openNotification('error', t('notification.user_modify_failed'), t('notification.user_modify_error'))
        }
      } catch (hcpError) {
        // HealthcareParty update failed, so User update was not attempted.
        console.error('Failed to update HealthcareParty:', hcpError)
        openNotification('error', t('notification.user_modify_failed'), t('notification.user_modify_error'))
      }
    },
    [form, createUpdateHcp, createUpdateUser, showMessageFeedback, openNotification, t],
  )

  const tableRowUpdate = useCallback(
    async (record: UserRow) => {
      const isNew = record.hcp && record.user && !record.user.rev && !record.hcp.rev
      const isExisting = record.hcp && record.user && record.user.rev && record.hcp.rev

      if (isNew) {
        createUser(record)
      } else if (isExisting) {
        updateUser(record)
      } else {
        // This single block now handles all invalid states (missing data, inconsistent data, etc.)
        console.error('Failed to save user due to inconsistent or missing data', { record })
        openNotification('error', t('notification.user_save_failed'), t('notification.user_save_error'))
      }
    },
    [createUser, updateUser, openNotification, t],
  )

  const tableRowCancel = useCallback(() => {
    setEditingKey('')
  }, [setEditingKey])

  const tableRowEdit = useCallback(
    (record: UserRow) => {
      try {
        if (!record.rowId) throw new Error('No user selected')
        form.setFieldsValue({
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
        })
        setEditingKey(record.rowId)
      } catch (error) {
        openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
      }
    },
    [form, setEditingKey],
  )

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="table-add-entry">
        <Button style={{ width: '100%' }} onClick={addUser} loading={isMutating} disabled={isLoading || !!editingKey}>
          {t('content.add_user')}
        </Button>
      </div>
      <Form layout="vertical" form={form}>
        <div className="ant-table-custom">
          <Table<UserRow>
            className="custom-table"
            pagination={false}
            dataSource={tableRows}
            rowKey="rowId"
            locale={{ emptyText: <Empty description={t('content.no_user_yet')} /> }}
            loading={isLoading}
            scroll={{ y: 'calc(800px - 300px)', x: 'max-content' }}
          >
            <Column
              title={t('content.firstname')}
              dataIndex="firstName"
              key="firstName"
              width="15%"
              sorter={(a, b) => (a.firstName ?? '').localeCompare(b.firstName ?? '')}
              render={(currentValue: string | undefined, record: UserRow) => {
                const editable = isEditing(record)
                if (editable) {
                  return (
                    <>
                      <Form.Item name="firstName" rules={[{ required: true, message: t('validation.firstname_required') }]}>
                        <Input autoFocus />
                      </Form.Item>
                    </>
                  )
                } else {
                  return currentValue ? (
                    currentValue
                  ) : (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                }
              }}
            />
            <Column
              title={t('content.lastname')}
              dataIndex="lastName"
              key="lastName"
              width="15%"
              sorter={(a, b) => (a.lastName ?? '').localeCompare(b.lastName ?? '')}
              render={(currentValue: string | undefined, record: UserRow) => {
                const editable = isEditing(record)
                if (editable) {
                  return (
                    <>
                      <Form.Item name="lastName" rules={[{ required: true, message: t('validation.lastname_required') }]}>
                        <Input autoFocus />
                      </Form.Item>
                    </>
                  )
                } else {
                  return currentValue ? (
                    currentValue
                  ) : (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                }
              }}
            />
            <Column
              title={t('content.email')}
              dataIndex="email"
              key="email"
              width="20%"
              sorter={(a, b) => (a.email ?? '').localeCompare(b.email ?? '')}
              render={(currentValue: string | undefined, record: UserRow) => {
                const editable = isEditing(record)
                if (editable) {
                  return (
                    <>
                      <Form.Item
                        name="email"
                        rules={[
                          { required: true, message: t('validation.email_required') },
                          { type: 'email', message: t('validation.invalid_email') },
                        ]}
                      >
                        <Input autoFocus />
                      </Form.Item>
                    </>
                  )
                } else {
                  return currentValue ? (
                    currentValue
                  ) : (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                }
              }}
            />
            <Column
              title={t('content.roles')}
              dataIndex="email"
              key="email"
              width="30%"
              render={(currentValue: string, record: UserRow) => {
                const editable = isEditing(record)
                if (editable) {
                  return (
                    <>
                      <Form.Item name="email">
                        <Tag icon={<ExclamationCircleOutlined />} color="warning">
                          {t('content.not_set')}
                        </Tag>
                      </Form.Item>
                    </>
                  )
                } else {
                  return (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                }
              }}
            />
            <Column
              title={t('content.actions')}
              key="action"
              fixed="right"
              width={'20%'}
              render={(_: unknown, record: UserRow) => {
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
                          setUserRowToBeDeleted(record)
                          setShowDeleteUserModal(true)
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
      </Form>
      {showDeleteUserModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_user_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_user_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
            onYesClick={() => {
              tableRowDelete()
              setShowDeleteUserModal(false)
            }}
            onNoClick={() => setShowDeleteUserModal(false)}
            isVisible={showDeleteUserModal}
            mode="danger"
          />,
          document.body,
        )}
    </div>
  )
}

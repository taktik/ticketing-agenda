import { ExclamationCircleOutlined } from '@ant-design/icons'
import { HealthcareParty, ListOfIds, User } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, Select, Space, Table, Tag, message, notification } from 'antd'
import Column from 'antd/es/table/Column'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { RESERVED_WORDS } from '../../../../constants'
import { useGetAllAgendaByAuthorIds } from '../../../../core/api/agendaApi'
import { RootHcpType } from '../../../../core/api/fetchType'
import {
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartiesByIdsQuery,
  useGetHealthcarePartiesByParentQuery,
  useGetRootHealthcareParty,
  useSilentDeleteHealthcarePartyMutation,
  useSilentUnDeleteHealthcarePartyMutation,
} from '../../../../core/api/healthcarePartyApi'
import { useCreateUpdateUserMutation, useDeleteUserMutation, useGetUsersQuery, useSetUserRolesMutation, useSilentDeleteUserMutation } from '../../../../core/api/userApi'
import { ModalConfirmAction } from '../../../common/ModalConfirmAction'

interface Assignment {
  siteId: string | undefined
  agendaId: string | undefined
}

enum UserRole {
  ADMIN = 'admin',
  CITY_WORKER = 'city_worker',
}
const CityWorkerRoles = new ListOfIds({ ids: ['BASIC_USER', 'BASIC_DATA_OWNER', 'CALENDAR_ITEM_MANAGER', 'PATIENT_USER_MANAGER'] })
const AdminRoles = new ListOfIds({ ids: ['BASIC_USER', 'BASIC_DATA_OWNER', 'CALENDAR_ITEM_MANAGER', 'PATIENT_USER_MANAGER', 'HIERARCHICAL_DATA_OWNER', 'HCP_USER_MANAGER'] })

interface UserRow {
  rowId: string
  user: User | undefined
  hcp: HealthcareParty | undefined
  firstName: string | undefined
  lastName: string | undefined
  email: string | undefined
  role: UserRole | undefined
  assignment: Assignment | undefined
}

interface FormValues {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  assignment: Assignment | undefined
}

export const ManagerUsers = (): ReactElement => {
  const { t } = useTranslation()
  const [tableRows, setTableRows] = useState<UserRow[]>([])
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false)
  const [userRowToBeDeleted, setUserRowToBeDeleted] = useState<UserRow | undefined>(undefined)
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: UserRow) => record.rowId === editingKey, [editingKey])
  const [form] = Form.useForm<FormValues>()

  const watchedRole = Form.useWatch('role', form)

  const [createUpdateUser, { isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [createUpdateHcp, { isLoading: isCreateUpdateHcpLoading }] = useCreateUpdateHealthcarePartyMutation()

  const [deleteUser, { isLoading: isDeleteUserLoading }] = useDeleteUserMutation()
  const [deleteHcp, { isLoading: isDeleteHcpLoading }] = useDeleteHealthcarePartyMutation()

  const [deleteSilentUser, { isLoading: isSilentDeleteUserLoading }] = useSilentDeleteUserMutation()
  const [deleteSilentHcp, { isLoading: isSilentDeleteHcpLoading }] = useSilentDeleteHealthcarePartyMutation()
  const [unDeleteHcp, { isLoading: isSilentUndeleteHcpLoading }] = useSilentUnDeleteHealthcarePartyMutation()

  const [setUserRoles, { isLoading: isSetUserRolesLoading }] = useSetUserRolesMutation()

  const { data: adminRoot, isLoading: isAdminRootLoading } = useGetRootHealthcareParty({ skip: false, rootType: RootHcpType.ADMIN_ROOT })
  const { data: siteRoot, isLoading: isSiteRootLoading } = useGetRootHealthcareParty({ skip: false, rootType: RootHcpType.SITE_ROOT })
  const { data: sites, isLoading: isSitesLoading } = useGetHealthcarePartiesByParentQuery({ parentId: siteRoot?.id ?? '' }, { skip: !siteRoot })
  const siteIds = useMemo(() => (sites ?? []).map((site) => site.id), [sites])
  const { data: agendas, isLoading: isAgendasLoading } = useGetAllAgendaByAuthorIds({ skip: !siteIds, authorIds: siteIds ?? [] })

  const siteAndAgendaOptions = useMemo(() => {
    if (!sites) return []

    const siteNameMap = new Map(sites.map((site) => [site.id, site.name]))

    return agendas.map((agenda) => {
      const siteName = agenda.author ? siteNameMap.get(agenda.author) || 'Site Inconnu' : 'Site Inconnu'
      const serviceLabel = agenda.name ?? 'Service Inconnu'

      return {
        label: `${siteName} - ${serviceLabel}`,
        value: `${agenda.author}:${agenda.id}`,
      }
    })
  }, [agendas, sites])

  const { data: users, isLoading: isUsersLoading } = useGetUsersQuery()

  const usersHcpIds = useMemo(() => {
    if (!users) return []
    return users.map((user) => user.healthcarePartyId).filter((id): id is string => id !== undefined)
  }, [users])

  const { data: hcps, isLoading: isHcpsLoading } = useGetHealthcarePartiesByIdsQuery(usersHcpIds, { skip: usersHcpIds.length === 0 || !users })

  const isFetching = useMemo(
    () => isUsersLoading || isHcpsLoading || isAdminRootLoading || isSiteRootLoading || isSitesLoading || isAgendasLoading,
    [isUsersLoading, isHcpsLoading, isAdminRootLoading, isSiteRootLoading, isSitesLoading, isAgendasLoading],
  )
  const isMutating = useMemo(
    () =>
      isCreateUpdateUserLoading || isCreateUpdateHcpLoading || isDeleteUserLoading || isDeleteHcpLoading || isSilentDeleteHcpLoading || isSilentUndeleteHcpLoading || isSetUserRolesLoading || isSilentDeleteUserLoading,
    [isCreateUpdateUserLoading, isCreateUpdateHcpLoading, isDeleteUserLoading, isDeleteHcpLoading, isSilentDeleteHcpLoading, isSilentUndeleteHcpLoading, isSetUserRolesLoading, isSilentDeleteUserLoading],
  )
  const isLoading = useMemo(() => isFetching || isMutating, [isFetching, isMutating])

  const hcpMap = useMemo(() => {
    return new Map((hcps ?? []).filter((hcp) => !(hcp.parentId === siteRoot?.id || hcp.firstName === 'admin-root' || hcp.firstName === 'site-root')).map((hcp) => [hcp.id, hcp]))
  }, [hcps])

  const userMap = useMemo(() => {
    return new Map((users ?? []).map((user) => [user.id, user]))
  }, [users])

  const mergedList = useMemo(() => {
    if (!users || !hcps) return []

    const mergedPairs: Array<[User, HealthcareParty]> = users.flatMap((user) => {
      if (!user.healthcarePartyId) return []
      const hcp = hcpMap.get(user.healthcarePartyId)
      return hcp ? [[user, hcp]] : []
    })

    return mergedPairs
  }, [users, hcpMap])

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
        role: hcp?.parentId === adminRoot?.id ? UserRole.ADMIN : hcp?.parentId && siteIds.includes(hcp.parentId) ? UserRole.CITY_WORKER : undefined,
        assignment: { agendaId: hcp.supervisorId, siteId: hcp.parentId },
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

  const parentIdMap = useMemo(() => {
    return {
      [UserRole.ADMIN]: adminRoot?.id,
      [UserRole.CITY_WORKER]: siteRoot?.id,
    }
  }, [adminRoot, siteRoot])

  const roleConfig = useMemo(() => {
    return {
      [UserRole.ADMIN]: { label: t('content.role_administrator'), color: 'gold' },
      [UserRole.CITY_WORKER]: { label: t('content.role_city_worker'), color: 'blue' },
    }
  }, [])

  const roleOptions = useMemo(
    () =>
      Object.entries(roleConfig).map(([value, { label }]) => ({
        value,
        label,
      })),
    [roleConfig],
  )

  const addUser = useCallback(() => {
    const hcpId = v4()
    const userId = v4()
    const newHcp = new HealthcareParty({ id: hcpId, firstName: undefined, lastName: undefined, name: undefined, userId: userId })
    const newUser = new User({ id: userId, email: undefined, name: undefined, healthcarePartyId: hcpId })

    const newUserRow: UserRow = {
      rowId: v4(),
      user: newUser,
      hcp: newHcp,
      firstName: undefined,
      lastName: undefined,
      email: undefined,
      role: undefined,
      assignment: undefined,
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
      let createdHcp: HealthcareParty | undefined = undefined
      let createdUser: User | undefined = undefined

      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        // --- Step 1: Create HealthcareParty ---
        createdHcp = await createUpdateHcp({
          ...record.hcp,
          firstName: rowValues.firstName,
          lastName: rowValues.lastName,
          name: `${rowValues.firstName} ${rowValues.lastName}`,
          parentId: rowValues.role ? parentIdMap[rowValues.role] : undefined,
          supervisorId: rowValues.assignment?.agendaId,
        }).unwrap()

        try {
          // --- Step 2: Create User ---
          createdUser = await createUpdateUser({ ...record.user, email: rowValues.email }).unwrap()

          try {
            // --- Step 3: Set User Roles ---
            if (createdUser && createdUser.id && rowValues.role) {
              await setUserRoles({
                userId: createdUser.id,
                roleIds: rowValues.role === UserRole.ADMIN ? AdminRoles : CityWorkerRoles,
              }).unwrap()
            }
            showMessageFeedback('success', t('notification.user_saved'))
          } catch (rolesError) {
            console.error('Failed to set user roles:', rolesError)
            openNotification('error', t('notification.user_save_failed'), t('notification.roles_save_error'))

            // ROLES FAILED: Roll back Userand HCP
            if (createdUser) await deleteSilentUser(createdUser).unwrap()
            if (createdHcp) await deleteSilentHcp(createdHcp).unwrap()
          }
        } catch (userError) {
          console.error('Failed to create user:', userError)
          openNotification('error', t('notification.user_save_failed'), t('notification.user_save_error'))

          // USER FAILED: Roll back HCP
          if (createdHcp) await deleteSilentHcp(createdHcp).unwrap()
        }
      } catch (hcpError) {
        console.error('Failed to create HealthcareParty:', hcpError)
        openNotification('error', t('notification.user_save_failed'), t('notification.hcp_save_error'))
      }
    },
    [form, createUpdateHcp, createUpdateUser, setUserRoles, deleteSilentHcp, deleteSilentUser, showMessageFeedback, openNotification, t, parentIdMap],
  )

  const updateUser = useCallback(
    async (record: UserRow) => {
      // The 'record' parameter holds the original state, which we'll use for rollbacks.
      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        // --- Step 1: Update HealthcareParty ---
        await createUpdateHcp({
          ...record.hcp,
          firstName: rowValues.firstName,
          lastName: rowValues.lastName,
          name: `${rowValues.firstName} ${rowValues.lastName}`,
          parentId: rowValues.role ? parentIdMap[rowValues.role] : undefined,
          supervisorId: rowValues.assignment?.agendaId,
        }).unwrap()

        try {
          // --- Step 2: Update User ---
          await createUpdateUser({ ...record.user, email: rowValues.email }).unwrap()

          try {
            // --- Step 3: Set User Roles ---
            if (record.user.id && rowValues.role) {
              await setUserRoles({
                userId: record.user.id,
                roleIds: rowValues.role === UserRole.ADMIN ? AdminRoles : CityWorkerRoles,
              }).unwrap()
            }

            showMessageFeedback('success', t('notification.user_saved'))
          } catch (rolesError) {
            console.error('Failed to set user roles:', rolesError)
            openNotification('error', t('notification.user_modify_failed'), t('notification.roles_modify_error'))

            // ROLES FAILED: Revert User and HCP
            console.warn('Attempting to roll back User and HCP updates...')
            await createUpdateUser(record.user).unwrap()
            await createUpdateHcp(record.hcp).unwrap()
          }
        } catch (userError) {
          console.error('Failed to update user:', userError)
          openNotification('error', t('notification.user_modify_failed'), t('notification.user_modify_error'))

          console.warn('Attempting to roll back HCP update...')
          await createUpdateHcp(record.hcp).unwrap()
        }
      } catch (hcpError) {
        console.error('Failed to update HealthcareParty:', hcpError)
        openNotification('error', t('notification.user_modify_failed'), t('notification.hcp_modify_error'))
      }
    },
    [form, createUpdateHcp, createUpdateUser, setUserRoles, showMessageFeedback, openNotification, t, parentIdMap],
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
          role: record.role,
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
                      <Form.Item
                        name="firstName"
                        rules={[
                          { required: true, message: t('validation.firstname_required') },
                          {
                            validator: (_, value) => {
                              const cleanedValue = value ? value.toLowerCase().trim() : undefined
                              if (cleanedValue && RESERVED_WORDS.includes(cleanedValue)) {
                                return Promise.reject(new Error(t('validation.name_is_reserved', { word: cleanedValue })))
                              }
                              return Promise.resolve()
                            },
                          },
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
                      <Form.Item
                        name="lastName"
                        rules={[
                          { required: true, message: t('validation.lastname_required') },
                          {
                            validator: (_, value) => {
                              const cleanedValue = value ? value.toLowerCase().trim() : undefined
                              if (cleanedValue && RESERVED_WORDS.includes(cleanedValue)) {
                                return Promise.reject(new Error(t('validation.name_is_reserved', { word: cleanedValue })))
                              }
                              return Promise.resolve()
                            },
                          },
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
              dataIndex="role"
              key="role"
              width="30%"
              render={(currentValue: string, record: UserRow) => {
                const editable = isEditing(record)
                if (editable) {
                  return (
                    <div className="role-column">
                      <Form.Item name="role" style={{ margin: 0 }} rules={[{ required: true, message: t('validation.role_is_required') }]}>
                        <Select placeholder={t('content.select_a_role')} options={roleOptions} />
                      </Form.Item>
                      {watchedRole === UserRole.CITY_WORKER && (
                        <Form.Item name="assignment" style={{ margin: 0 }} rules={[{ required: true, message: t('validation.assignment_is_required') }]}>
                          <Select
                            style={{ width: '100%' }}
                            options={siteAndAgendaOptions}
                            placeholder={t('content.select_an_assignment')}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            loading={isSitesLoading || isAgendasLoading}
                          />
                        </Form.Item>
                      )}
                    </div>
                  )
                }
                const roleInfo = record.role ? roleConfig[record.role] : undefined

                if (roleInfo) {
                  return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
                }

                return (
                  <Tag icon={<ExclamationCircleOutlined />} color="warning">
                    {t('content.not_set')}
                  </Tag>
                )
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

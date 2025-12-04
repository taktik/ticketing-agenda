import { ExclamationCircleOutlined } from '@ant-design/icons'
import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, message, notification, Select, Space, Table, Tag } from 'antd'
import Column from 'antd/es/table/Column'
import { ReactElement, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { RESERVED_WORDS } from '../../../../constants'
import { useGetAgendasByAuthorIds } from '../../../../core/api/agendaApi'
import {
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartyUsers,
  useSilentDeleteHealthcarePartyMutation,
  useSilentUnDeleteHealthcarePartyMutation,
} from '../../../../core/api/healthcarePartyApi'
import { administratorTag, cityWorkerTag, headOfServiceTag, rolesMap, roleTypeMap, tagMap, UserRole } from '../../../../core/api/roleApi'
import { useCreateUpdateUserMutation, useDeleteUserMutation, useGetUsersByIdsQuery, useSetUserRolesMutation, useSilentDeleteUserMutation } from '../../../../core/api/userApi'
import { usePermissions } from '../../../../core/hooks/usePermissions'
import { useRoot } from '../../../../core/hooks/useRoot'
import { useSites } from '../../../../core/hooks/useSites'
import { AssignmentSelector } from '../../../AssignmentSelector/AssignmentSelector'
import { ModalConfirmAction } from '../../../common/ModalConfirmAction'
import { createStringProperty } from '../../../common/helpers'

export interface Assignment {
  siteId: string | undefined
  agendaId: string | undefined
}

interface UserRow {
  rowId: string
  user: User | undefined
  hcp: HealthcareParty | undefined
  firstName: string | undefined
  lastName: string | undefined
  email: string | undefined
  role: UserRole | undefined
  assignment: Assignment[] | undefined
}

interface FormValues {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  assignment: Assignment[] | undefined
}

export const ManagerUsers = (): ReactElement => {
  const { t } = useTranslation()
  const [newUsers, setNewUsers] = useState<UserRow[]>([])
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false)
  const [userRowToBeDeleted, setUserRowToBeDeleted] = useState<UserRow | undefined>(undefined)
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: UserRow) => record.rowId === editingKey, [editingKey])
  const [form] = Form.useForm<FormValues>()

  const { isAdministrator } = usePermissions()
  if (!isAdministrator) {
    return <div></div>
  }
  const watchedRole = Form.useWatch('role', form)

  const [createUpdateUser, { isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [createUpdateHcp, { isLoading: isCreateUpdateHcpLoading }] = useCreateUpdateHealthcarePartyMutation()

  const [deleteUser, { isLoading: isDeleteUserLoading }] = useDeleteUserMutation()
  const [deleteHcp, { isLoading: isDeleteHcpLoading }] = useDeleteHealthcarePartyMutation()

  const [deleteSilentUser, { isLoading: isSilentDeleteUserLoading }] = useSilentDeleteUserMutation()
  const [deleteSilentHcp, { isLoading: isSilentDeleteHcpLoading }] = useSilentDeleteHealthcarePartyMutation()
  const [unDeleteHcp, { isLoading: isSilentUndeleteHcpLoading }] = useSilentUnDeleteHealthcarePartyMutation()

  const [setUserRoles, { isLoading: isSetUserRolesLoading }] = useSetUserRolesMutation()

  const { adminRoot, siteRoot, isAdminRootLoading, isSiteRootLoading } = useRoot()
  const { sites = [], isSitesLoading } = useSites()

  const siteIds = useMemo(() => sites.map((site) => site.id), [sites])

  const { data: agendas, isLoading: isAgendasLoading } = useGetAgendasByAuthorIds({
    skip: siteIds.length === 0,
    authorIds: siteIds,
  })
  const agendaMap = useMemo(() => new Map(agendas.map((a) => [a.id, a])), [agendas])

  const { data: hcps, isLoading: isHcpsLoading } = useGetHealthcarePartyUsers()

  const userIds = useMemo(() => hcps.map((hcp) => hcp.userId).filter((id): id is string => !!id), [hcps])

  const { data: users, isLoading: isUsersLoading } = useGetUsersByIdsQuery(userIds, {
    skip: userIds.length === 0,
  })

  const isFetching = useMemo(
    () => isUsersLoading || isHcpsLoading || isAdminRootLoading || isSiteRootLoading || isSitesLoading || isAgendasLoading,
    [isUsersLoading, isHcpsLoading, isAdminRootLoading, isSiteRootLoading, isSitesLoading, isAgendasLoading],
  )

  const isMutating = useMemo(
    () =>
      isCreateUpdateUserLoading || isCreateUpdateHcpLoading || isDeleteUserLoading || isDeleteHcpLoading || isSilentDeleteHcpLoading || isSilentUndeleteHcpLoading || isSetUserRolesLoading || isSilentDeleteUserLoading,
    [isCreateUpdateUserLoading, isCreateUpdateHcpLoading, isDeleteUserLoading, isDeleteHcpLoading, isSilentDeleteHcpLoading, isSetUserRolesLoading, isSilentDeleteUserLoading],
  )

  const isLoading = useMemo(() => isFetching || isMutating, [isFetching, isMutating])

  const allowedRoleIds = useMemo(() => new Set([administratorTag[0].id, headOfServiceTag[0].id, cityWorkerTag[0].id]), [administratorTag, headOfServiceTag, cityWorkerTag])

  const serverRows = useMemo(() => {
    if (!users || !hcps) return []
    const hcpLookup = new Map(hcps.map((h) => [h.id, h]))
    return users.flatMap((user) => {
      if (!user.healthcarePartyId) return []

      const hcp = hcpLookup.get(user.healthcarePartyId)
      if (!hcp) return []

      const hasAllowedRole = hcp.tags?.some((tag) => allowedRoleIds.has(tag.id))
      if (!hasAllowedRole) return []

      const hcpTag = hcp.tags.find((tag) => tag.type && roleTypeMap[tag.type])

      const assignments = hcp.properties.reduce<Assignment[]>((acc, property) => {
        if (!property?.id?.startsWith('ASSIGNMENT|')) {
          return acc
        }
        const targetId = property.typedValue?.stringValue
        if (!targetId) {
          return acc
        }
        const agenda = agendaMap.get(targetId)
        if (agenda?.author) {
          acc.push({ agendaId: agenda.id, siteId: agenda.author })
        }
        return acc
      }, [])

      return [
        {
          rowId: `${user.id}-${hcp.id}`,
          user: user,
          hcp: hcp,
          firstName: hcp.firstName,
          lastName: hcp.lastName,
          email: user.email,
          role: hcpTag && hcpTag.type ? roleTypeMap[hcpTag.type] : undefined,
          assignment: assignments,
        } as UserRow,
      ]
    })
  }, [users, hcps, allowedRoleIds, roleTypeMap])

  const tableRows = useMemo(() => {
    const uniqueNewUsers = newUsers.filter((n) => !serverRows.some((s) => s.hcp?.id === n.hcp?.id))

    const combined = [...uniqueNewUsers, ...serverRows]

    return combined.sort((a, b) => {
      const nameA = a.firstName ?? ''
      const nameB = b.firstName ?? ''
      if (nameA === '' && nameB !== '') return -1
      if (nameA !== '' && nameB === '') return 1
      return nameA.localeCompare(nameB)
    })
  }, [newUsers, serverRows])

  const allRoleTypes = useMemo(() => new Set(Object.keys(tagMap)), [tagMap])

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
    setTimeout(messageApi.destroy, 2500)
  }

  const roleConfig = useMemo(() => {
    return {
      [UserRole.ADMINISTRATOR]: { label: t('content.role_administrator'), color: 'gold' },
      [UserRole.HEAD_OF_SERVICE]: { label: t('content.head_of_service'), color: 'purple' },
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
      rowId: `${newUser.id}-${newHcp.id}`,
      user: newUser,
      hcp: newHcp,
      firstName: undefined,
      lastName: undefined,
      email: undefined,
      role: undefined,
      assignment: undefined,
    }

    setNewUsers((prev) => [newUserRow, ...prev])
  }, [setNewUsers])

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
        setNewUsers((prev) => prev.filter((user) => user.rowId !== userRowToBeDeleted.rowId))
      }
    } catch (hcpError) {
      console.error('Failed to delete HealthcareParty:', hcpError)
      openNotification('error', t('notification.user_delete_failed'), t('notification.user_delete_error'))
    }
  }, [userRowToBeDeleted, deleteHcp, deleteUser, unDeleteHcp, setNewUsers, showMessageFeedback, openNotification, t])

  const createUser = useCallback(
    async (record: UserRow) => {
      let createdHcp: HealthcareParty | undefined = undefined
      let createdUser: User | undefined = undefined

      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        const assignmentProperties = rowValues.assignment?.filter((assignment) => assignment.agendaId !== undefined).map((assignment) => createStringProperty(`ASSIGNMENT|${assignment.agendaId}`, assignment.agendaId!))
        const assignmentParentId =
          rowValues.role === UserRole.ADMINISTRATOR
            ? adminRoot?.id
            : rowValues.role === UserRole.HEAD_OF_SERVICE || rowValues.role === UserRole.CITY_WORKER
              ? rowValues.assignment && rowValues.assignment.length > 1
                ? siteRoot?.id
                : rowValues.assignment?.[0]?.siteId
              : undefined

        if (!assignmentParentId || !assignmentProperties) throw new Error('Missing critical information')

        // --- Step 1: Create HealthcareParty ---
        createdHcp = await createUpdateHcp(
          new HealthcareParty({
            ...record.hcp,
            firstName: rowValues.firstName,
            lastName: rowValues.lastName,
            name: `${rowValues.firstName} ${rowValues.lastName}`,
            parentId: assignmentParentId,
            tags: rowValues.role ? tagMap[rowValues.role] : [],
            properties: assignmentProperties,
            public: false,
          }),
        ).unwrap()

        try {
          // --- Step 2: Create User ---
          createdUser = await createUpdateUser(new User({ ...record.user, email: rowValues.email })).unwrap()

          try {
            // --- Step 3: Set User Roles ---
            if (createdUser && createdUser.id && rowValues.role) {
              const updatedUserRole = await setUserRoles({
                userId: createdUser.id,
                roleIds: rolesMap[rowValues.role],
              }).unwrap()
              if (updatedUserRole) createdUser = updatedUserRole
            }
            showMessageFeedback('success', t('notification.user_saved'))
          } catch (rolesError) {
            console.error('Failed to set user roles:', rolesError)
            openNotification('error', t('notification.user_save_failed'), t('notification.role_save_error'))

            // ROLES FAILED: Roll back User and HCP
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
      } finally {
        setEditingKey('')
      }
    },
    [form, createUpdateHcp, createUpdateUser, setUserRoles, deleteSilentHcp, deleteSilentUser, showMessageFeedback, openNotification, setEditingKey, t, adminRoot, siteRoot],
  )

  const updateUser = useCallback(
    async (record: UserRow) => {
      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        const nonRoleTags = record.hcp.tags.filter((tag) => !allRoleTypes.has(tag.type ?? ''))
        const newRoleTag = rowValues.role ? tagMap[rowValues.role] : []
        const finalTags = [...nonRoleTags, ...newRoleTag]

        const otherProperties = record.hcp.properties?.filter((prop) => !prop?.id?.startsWith('ASSIGNMENT|')) ?? []
        const assignmentProperties = rowValues.assignment?.filter((assignment) => assignment.agendaId !== undefined).map((assignment) => createStringProperty(`ASSIGNMENT|${assignment.agendaId}`, assignment.agendaId!))
        const assignmentParentId =
          rowValues.role === UserRole.ADMINISTRATOR
            ? adminRoot?.id
            : rowValues.role === UserRole.HEAD_OF_SERVICE || rowValues.role === UserRole.CITY_WORKER
              ? rowValues.assignment && rowValues.assignment.length > 1
                ? siteRoot?.id
                : rowValues.assignment?.[0]?.siteId
              : undefined

        if (!assignmentParentId || !assignmentProperties) throw new Error('Missing critical information')

        // --- Step 1: Update HealthcareParty ---
        const updatedHcp = await createUpdateHcp(
          new HealthcareParty({
            ...record.hcp,
            firstName: rowValues.firstName,
            lastName: rowValues.lastName,
            name: `${rowValues.firstName} ${rowValues.lastName}`,
            parentId: assignmentParentId,
            properties: [...otherProperties, ...assignmentProperties],
            tags: finalTags,
          }),
        ).unwrap()

        try {
          // --- Step 2: Update User ---
          let updatedUser = await createUpdateUser(new User({ ...record.user, email: rowValues.email })).unwrap()

          try {
            // --- Step 3: Set User Roles ---
            if (record.user.id && rowValues.role && record.role !== rowValues.role) {
              const updatedUserRole = await setUserRoles({
                userId: record.user.id,
                roleIds: rolesMap[rowValues.role],
              }).unwrap()
              if (updatedUserRole) updatedUser = updatedUserRole
            }

            setEditingKey('')
            showMessageFeedback('success', t('notification.user_saved'))
          } catch (rolesError) {
            console.error('Failed to set user roles:', rolesError)
            openNotification('error', t('notification.user_modify_failed'), t('notification.role_modify_error'))

            // ROLES FAILED: Revert User and HCP
            console.warn('Attempting to roll back User and HCP updates...')
            if (updatedUser) {
              await createUpdateUser(updatedUser).unwrap()
            }
            if (updatedHcp) {
              await createUpdateHcp(updatedHcp).unwrap()
            }
          }
        } catch (userError) {
          console.error('Failed to update user:', userError)
          openNotification('error', t('notification.user_modify_failed'), t('notification.user_modify_error'))

          console.warn('Attempting to roll back HCP update...')
          if (updatedHcp) {
            await createUpdateHcp(updatedHcp).unwrap()
          }
        }
      } catch (hcpError) {
        console.error('Failed to update HealthcareParty:', hcpError)
        openNotification('error', t('notification.user_modify_failed'), t('notification.hcp_modify_error'))
      }
    },
    [form, createUpdateHcp, createUpdateUser, setUserRoles, showMessageFeedback, openNotification, t, adminRoot, siteRoot],
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
        console.error('Failed to save user due to inconsistent or missing data', { record })
        openNotification('error', t('notification.user_save_failed'), t('notification.user_save_error'))
      }
    },
    [setEditingKey, createUser, updateUser, openNotification, t],
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
          assignment: record.assignment,
        })
        setEditingKey(record.rowId)
      } catch (error) {
        openNotification('error', 'Update failed', error instanceof Error ? error.message : t('validation.unexpected_error'))
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
              width="25%"
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
              width="20%"
              render={(currentValue: string, record: UserRow) => {
                const editable = isEditing(record)
                if (editable) {
                  return (
                    <div className="role-column">
                      <Form.Item name="role" style={{ margin: 0 }} rules={[{ required: true, message: t('validation.role_is_required') }]}>
                        <Select placeholder={t('content.select_a_role')} options={roleOptions} />
                      </Form.Item>
                      {(watchedRole === UserRole.CITY_WORKER || watchedRole === UserRole.HEAD_OF_SERVICE) && (
                        <Form.Item name="assignment" style={{ margin: 0 }} rules={[{ required: true, message: t('validation.assignment_is_required') }]}>
                          <AssignmentSelector sites={sites ?? []} agendas={agendas} isSitesLoading={isSitesLoading} isAgendasLoading={isAgendasLoading} />
                        </Form.Item>
                      )}
                    </div>
                  )
                }
                const roleInfo = record.role && roleConfig[record.role]

                return roleInfo ? (
                  <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
                ) : (
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

import { ExclamationCircleOutlined } from '@ant-design/icons'
import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, message, Select, Space, Table, Tag } from 'antd'
import Column from 'antd/es/table/Column'
import { ReactElement, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { assignmentPropertyId, ASSIGNMENT_PROPERTY_PREFIX, RESERVED_WORDS } from '../../../../constants'
import { useNotificationHelper } from '../../../../core/hooks/useNotificationHelper'
import {
  useCreateUpdateHealthcarePartyMutation,
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartyUsers,
  useSilentDeleteHealthcarePartyMutation,
  useSilentUnDeleteHealthcarePartyMutation,
} from '../../../../core/api/healthcarePartyApi'
import { administratorTag, cityWorkerTag, headOfServiceTag, rolesMap, roleTypeMap, tagMap, UserRole } from '../../../../core/api/roleApi'
import { useCreateUpdateUserMutation, useDeleteUserMutation, useGetUsersByIdsQuery, useSetUserRolesMutation, useSilentDeleteUserMutation } from '../../../../core/api/userApi'
import { useHierarchyContext } from '../../../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../../../core/contexts/PermissionContext'
import { AssignmentSelector } from '../../../AssignmentSelector/AssignmentSelector'
import { createStringProperty } from '../../../common/helpers'
import { ModalConfirmAction } from '../../../common/ModalConfirmAction'

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
  const [form] = Form.useForm<FormValues>()
  const watchedRole = Form.useWatch('role', form)
  const { allSites, allAgendas, agendaMap, siteRoot, adminRoot, isLoading: isDataLoading } = useHierarchyContext()
  const { isAdministrator } = usePermissionContext()

  const [newUsers, setNewUsers] = useState<UserRow[]>([])
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false)
  const [userRowToBeDeleted, setUserRowToBeDeleted] = useState<UserRow | undefined>(undefined)
  const [editingKey, setEditingKey] = useState<string>('')

  const { data: hcps, isLoading: isHcpsLoading } = useGetHealthcarePartyUsers()
  const userIds = useMemo(() => hcps?.map((hcp) => hcp.userId).filter((id): id is string => !!id) ?? [], [hcps])

  const { data: users, isLoading: isUsersLoading } = useGetUsersByIdsQuery(userIds, {
    skip: userIds.length === 0,
  })

  const [createUpdateUser, { isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()
  const [createUpdateHcp, { isLoading: isCreateUpdateHcpLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [deleteUser, { isLoading: isDeleteUserLoading }] = useDeleteUserMutation()
  const [deleteHcp, { isLoading: isDeleteHcpLoading }] = useDeleteHealthcarePartyMutation()
  const [deleteSilentUser, { isLoading: isSilentDeleteUserLoading }] = useSilentDeleteUserMutation()
  const [deleteSilentHcp, { isLoading: isSilentDeleteHcpLoading }] = useSilentDeleteHealthcarePartyMutation()
  const [unDeleteHcp, { isLoading: isSilentUndeleteHcpLoading }] = useSilentUnDeleteHealthcarePartyMutation()
  const [setUserRoles, { isLoading: isSetUserRolesLoading }] = useSetUserRolesMutation()

  const isLoading =
    isDataLoading ||
    isUsersLoading ||
    isHcpsLoading ||
    isCreateUpdateUserLoading ||
    isCreateUpdateHcpLoading ||
    isDeleteUserLoading ||
    isDeleteHcpLoading ||
    isSetUserRolesLoading ||
    isSilentDeleteUserLoading ||
    isSilentDeleteHcpLoading ||
    isSilentUndeleteHcpLoading

  const { openNotification, notificationContextHolder } = useNotificationHelper()
  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = useCallback(
    (type: 'loading' | 'success' | 'error', content: string) => {
      messageApi.open({ type, content, duration: 0 })
      setTimeout(messageApi.destroy, 2500)
    },
    [messageApi],
  )

  const allowedRoleIds = useMemo(() => new Set([administratorTag[0].id, headOfServiceTag[0].id, cityWorkerTag[0].id]), [])

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

      const assignments = hcp.properties.flatMap((property) => {
        if (!property?.id?.startsWith(ASSIGNMENT_PROPERTY_PREFIX)) return []

        const targetId = property.typedValue?.stringValue
        if (!targetId) return []

        const agenda = agendaMap.get(targetId)
        if (agenda?.author) {
          return [{ agendaId: agenda.id, siteId: agenda.author }]
        }
        return []
      })

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
  }, [users, hcps, allowedRoleIds, agendaMap])

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

  const roleOptions = useMemo(
    () => [
      { value: UserRole.ADMINISTRATOR, label: t('content.role_administrator') },
      { value: UserRole.HEAD_OF_SERVICE, label: t('content.head_of_service') },
      { value: UserRole.CITY_WORKER, label: t('content.role_city_worker') },
    ],
    [t],
  )

  const roleConfig = useMemo(
    () => ({
      [UserRole.ADMINISTRATOR]: { label: t('content.role_administrator'), color: 'gold' },
      [UserRole.HEAD_OF_SERVICE]: { label: t('content.head_of_service'), color: 'purple' },
      [UserRole.CITY_WORKER]: { label: t('content.role_city_worker'), color: 'blue' },
    }),
    [t],
  )
  const isEditing = useCallback((record: UserRow) => record.rowId === editingKey, [editingKey])

  const addUser = useCallback(() => {
    const hcpId = v4()
    const userId = v4()
    const newHcp = new HealthcareParty({ id: hcpId, userId: userId })
    const newUser = new User({ id: userId, healthcarePartyId: hcpId })

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
  }, [])

  const tableRowCancel = useCallback(() => {
    setEditingKey('')
  }, [])

  const tableRowEdit = useCallback(
    (record: UserRow) => {
      try {
        if (!record.rowId) throw new Error('No user selected')
        form.setFieldsValue({
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
          role: record.role ?? UserRole.CITY_WORKER,
          assignment: record.assignment ?? [],
        })
        setEditingKey(record.rowId)
      } catch (error) {
        openNotification('error', 'Update failed', '')
      }
    },
    [form, openNotification],
  )

  const handleDelete = useCallback(async () => {
    try {
      if (!userRowToBeDeleted?.hcp || !userRowToBeDeleted.user) throw new Error('No user selected')

      if (userRowToBeDeleted.hcp.rev && userRowToBeDeleted.user.rev) {
        const deletedHcpResult = await deleteHcp(userRowToBeDeleted.hcp).unwrap()

        try {
          await deleteUser(userRowToBeDeleted.user).unwrap()
          showMessageFeedback('success', t('notification.user_deleted'))
        } catch (userError) {
          console.error('Failed to delete user:', userError)
          openNotification('error', t('notification.user_delete_failed'), t('notification.user_delete_error'))

          if (deletedHcpResult) {
            try {
              await unDeleteHcp(userRowToBeDeleted.hcp).unwrap()
            } catch (rollbackError) {
              console.error(`Failed to roll back HCP deletion`, rollbackError)
            }
          }
        }
      } else {
        setNewUsers((prev) => prev.filter((user) => user.rowId !== userRowToBeDeleted.rowId))
      }
    } catch (hcpError) {
      console.error('Failed to delete HCP:', hcpError)
      openNotification('error', t('notification.user_delete_failed'), t('notification.user_delete_error'))
    } finally {
      setShowDeleteUserModal(false)
    }
  }, [userRowToBeDeleted, deleteHcp, deleteUser, unDeleteHcp, showMessageFeedback, openNotification, t])

  const handleCreateOrUpdate = useCallback(
    async (record: UserRow, isNew: boolean) => {
      let createdHcp: HealthcareParty | undefined
      let createdUser: User | undefined

      try {
        if (!record.hcp || !record.user) throw new Error('No user selected')
        const rowValues = await form.validateFields()

        const assignmentProperties = rowValues.assignment?.filter((a) => a.agendaId !== undefined).map((a) => createStringProperty(assignmentPropertyId(a.agendaId!), a.agendaId!)) || []

        let assignmentParentId: string | undefined
        if (rowValues.role === UserRole.ADMINISTRATOR) {
          assignmentParentId = adminRoot?.id
        } else if ([UserRole.HEAD_OF_SERVICE, UserRole.CITY_WORKER].includes(rowValues.role)) {
          if (rowValues.assignment && rowValues.assignment.length > 1) {
            assignmentParentId = siteRoot?.id
          } else {
            assignmentParentId = rowValues.assignment?.[0]?.siteId
          }
        }

        if (!assignmentParentId) throw new Error('Missing assignment parent ID')

        const roleTags = rowValues.role ? tagMap[rowValues.role] : []
        const otherTags = isNew ? [] : record.hcp.tags.filter((t) => !roleTypeMap[t.type ?? ''])
        const finalTags = [...otherTags, ...roleTags]

        const otherProps = isNew ? [] : (record.hcp.properties?.filter((p) => !p.id?.startsWith(ASSIGNMENT_PROPERTY_PREFIX)) ?? [])
        const finalProps = [...otherProps, ...assignmentProperties]

        const hcpPayload = new HealthcareParty({
          ...record.hcp,
          firstName: rowValues.firstName,
          lastName: rowValues.lastName,
          name: `${rowValues.firstName} ${rowValues.lastName}`,
          parentId: assignmentParentId,
          tags: finalTags,
          properties: finalProps,
          public: false,
        })

        const resultHcp = await createUpdateHcp(hcpPayload).unwrap()
        createdHcp = resultHcp

        const userPayload = new User({ ...record.user, email: rowValues.email })
        const resultUser = await createUpdateUser(userPayload).unwrap()
        createdUser = resultUser

        if (resultUser && resultUser.id && rowValues.role) {
          if (isNew || record.role !== rowValues.role) {
            await setUserRoles({
              userId: resultUser.id,
              roleIds: rolesMap[rowValues.role],
            }).unwrap()
          }
        }

        showMessageFeedback('success', t('notification.user_saved'))

        if (isNew) {
          setNewUsers((prev) => prev.filter((u) => u.rowId !== record.rowId))
        }
        setEditingKey('')
      } catch (error) {
        console.error('Save failed:', error)
        openNotification('error', t('notification.user_save_failed'), String(error))

        if (isNew) {
          if (createdUser) await deleteSilentUser(createdUser).unwrap()
          if (createdHcp) await deleteSilentHcp(createdHcp).unwrap()
        }
      }
    },
    [form, adminRoot, siteRoot, createUpdateHcp, createUpdateUser, setUserRoles, deleteSilentHcp, deleteSilentUser, showMessageFeedback, openNotification, t],
  )

  const onSaveRow = useCallback(
    (record: UserRow) => {
      const isNew = !record.hcp?.rev
      handleCreateOrUpdate(record, isNew)
    },
    [handleCreateOrUpdate],
  )

  if (!isAdministrator) return <div></div>

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}

      <div className="table-add-entry">
        <Button style={{ width: '100%' }} onClick={addUser} loading={isLoading} disabled={isLoading || !!editingKey}>
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
              sorter={(a: UserRow, b: UserRow) => (a.firstName ?? '').localeCompare(b.firstName ?? '')}
              render={(val: string, record: UserRow) => {
                if (isEditing(record)) {
                  return (
                    <Form.Item
                      name="firstName"
                      rules={[
                        { required: true, message: t('validation.firstname_required') },
                        {
                          validator: (_, v) => {
                            const clean = v?.toLowerCase().trim()
                            if (clean && RESERVED_WORDS.includes(clean)) return Promise.reject(t('validation.name_is_reserved'))
                            return Promise.resolve()
                          },
                        },
                      ]}
                    >
                      <Input autoFocus />
                    </Form.Item>
                  )
                }
                return (
                  val || (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                )
              }}
            />

            <Column
              title={t('content.lastname')}
              dataIndex="lastName"
              key="lastName"
              width="15%"
              sorter={(a: UserRow, b: UserRow) => (a.lastName ?? '').localeCompare(b.lastName ?? '')}
              render={(val: string, record: UserRow) => {
                if (isEditing(record)) {
                  return (
                    <Form.Item name="lastName" rules={[{ required: true, message: t('validation.lastname_required') }]}>
                      <Input />
                    </Form.Item>
                  )
                }
                return (
                  val || (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                )
              }}
            />

            <Column
              title={t('content.email')}
              dataIndex="email"
              key="email"
              width="25%"
              sorter={(a: UserRow, b: UserRow) => (a.email ?? '').localeCompare(b.email ?? '')}
              render={(val: string, record: UserRow) => {
                if (isEditing(record)) {
                  return (
                    <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('validation.invalid_email') }]}>
                      <Input />
                    </Form.Item>
                  )
                }
                return (
                  val || (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">
                      {t('content.not_set')}
                    </Tag>
                  )
                )
              }}
            />

            <Column
              title={t('content.roles')}
              dataIndex="role"
              key="role"
              width="25%"
              render={(val: UserRole, record: UserRow) => {
                if (isEditing(record)) {
                  return (
                    <div className="role-column">
                      <Form.Item name="role" style={{ margin: 0 }} rules={[{ required: true, message: t('validation.role_is_required') }]}>
                        <Select placeholder={t('content.select_a_role')} options={roleOptions} />
                      </Form.Item>

                      {(watchedRole === UserRole.CITY_WORKER || watchedRole === UserRole.HEAD_OF_SERVICE) && (
                        <Form.Item name="assignment" style={{ margin: 0, marginTop: 8 }} rules={[{ required: true, message: t('validation.assignment_is_required') }]}>
                          <AssignmentSelector sites={allSites} agendas={allAgendas} isSitesLoading={isDataLoading} isAgendasLoading={isDataLoading} />
                        </Form.Item>
                      )}
                    </div>
                  )
                }
                const roleInfo = val && roleConfig[val]
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
              width="20%"
              render={(_: unknown, record: UserRow) => {
                if (isEditing(record)) {
                  return (
                    <Space size="middle">
                      <Button onClick={() => onSaveRow(record)}>{t('content.update')}</Button>
                      <Button onClick={tableRowCancel}>{t('content.cancel')}</Button>
                    </Space>
                  )
                }
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
            onYesClick={handleDelete}
            onNoClick={() => setShowDeleteUserModal(false)}
            isVisible={showDeleteUserModal}
            mode="danger"
          />,
          document.body,
        )}
    </div>
  )
}

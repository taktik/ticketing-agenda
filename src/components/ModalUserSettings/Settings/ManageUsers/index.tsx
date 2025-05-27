import { HealthcareParty, User, UserFilters } from '@icure/cardinal-sdk'
import React, { ReactElement, useEffect, useMemo, useState } from 'react'
import { useCreateUserMutation, useGetUsersQuery } from '../../../../core/api/userApi'
import { useCreateUpdateHealthcarePartyMutation, useGetHealthcarePartiesByIdsQuery, useGetHealthcarePartiesQuery } from '../../../../core/api/healthcarePartyApi'
import { Button, Empty, Form, Input, Table, message, notification } from 'antd'
import { useTranslation } from 'react-i18next'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import Column from 'antd/es/table/Column'
import { v4 } from 'uuid'

interface UserRow {
  rowId: string
  firstName: string
  lastName: string
  email: string
}

interface FormValues {
  firstName: string
  lastName: string
  email: string
}

interface ManagerUsersProps {
  onClose: () => void
  currentUser?: HealthcareParty
}

export const ManagerUsers = ({ onClose, currentUser }: ManagerUsersProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const [tableRows, setTableRows] = useState<UserRow[]>([])
  const [usersList, setUsersList] = useState<User[]>([])
  const [editingKey, setEditingKey] = useState<string>('')
  const isEditing = useMemo(() => (record: UserRow) => record.rowId === editingKey, [editingKey])
  const [form] = Form.useForm<FormValues>()

  const [createUser, { isError: isUserError, isSuccess: isUserSuccess, isLoading: isUserLoading }] = useCreateUserMutation()
  const [createUpdateHcp, { isError: isHcpError, isSuccess: isHcpSuccessfull, isLoading: isHcpLoading }] = useCreateUpdateHealthcarePartyMutation()

  const { data: users } = useGetUsersQuery(undefined)
  const usersHcpIds = useMemo(() => {
    if (!users) return []
    return users.map((user) => user.healthcarePartyId).filter((id): id is string => id !== undefined)
  }, [users])

  const { data: hcps } = useGetHealthcarePartiesByIdsQuery(usersHcpIds)

  const sortedUsers = useMemo(() => {
    return [...(users ?? [])].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [users])

  const mergedList = useMemo(() => {
    if (!users || !hcps) return []

    const hcpMap = new Map(hcps.map((hcp) => [hcp.id, hcp]))

    const pairs = users.flatMap((user) => {
      if (!user.healthcarePartyId) return []
      const hcp = hcpMap.get(user.healthcarePartyId)
      return hcp ? [[user, hcp]] : []
    })

    const sortedPairs = [...pairs].sort((pairA, pairB) => {
      // pairA and pairB are [User, HealthcareParty]
      const hcpA = pairA[1] // This is the HealthcareParty object
      const hcpB = pairB[1] // This is the HealthcareParty object

      // Access firstName for sorting
      const nameA = hcpA.name?.toLowerCase() ?? '' // Use optional chaining and nullish coalescing
      const nameB = hcpB.name?.toLowerCase() ?? ''

      return nameA.localeCompare(nameB)
    })

    return sortedPairs
  }, [users, hcps])

  useEffect(() => console.log('mergedList', mergedList), [mergedList])

  useEffect(() => {
    setUsersList(sortedUsers)
    setEditingKey('')
  }, [sortedUsers, form])

  useEffect(() => {
    const tableRowsList: UserRow[] = usersList.map((user) => {
      return {
        rowId: v4(),
        firstName: user.name,
        lastName: user.name,
        email: user.email,
      } as UserRow
    })
    setTableRows(tableRowsList)
  }, [usersList])

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

  useEffect(() => console.log('users', users), [users])

  const addUser = () => {}

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
      <Form layout="vertical" colon={false} form={form} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between' }}>
        <div className="ant-table-custom">
          <Table<UserRow>
            className="custom-table"
            pagination={{
              pageSize: 4,
              simple: true,
            }}
            scroll={{ y: 390, x: 'max-content' }}
            dataSource={tableRows}
            rowKey="rowId"
            locale={{ emptyText: <Empty description={t('content.no_user_yet')} /> }}
          >
            <ColumnGroup
              title={
                <Button style={{ width: '100%' }} onClick={addUser}>
                  {t('content.new_user')}
                </Button>
              }
            >
              <Column
                title={t('content.firstName')}
                dataIndex="firstName"
                key="firstName"
                width="auto"
                sorter={(a, b) => a.firstName.localeCompare(b.firstName)}
                render={(currentValue: string, record: UserRow) => {
                  const editable = isEditing(record)
                  if (editable) {
                    return (
                      <>
                        <Form.Item name="firstName" style={{ margin: 0 }} rules={[{ required: true, message: t('content.procedure_name_required') }]}>
                          <Input autoFocus />
                        </Form.Item>
                      </>
                    )
                  } else {
                    return currentValue
                  }
                }}
              />
              <Column
                title={t('content.email')}
                dataIndex="email"
                key="email"
                width="auto"
                render={(currentValue: string, record: UserRow) => {
                  const editable = isEditing(record)
                  if (editable) {
                    return (
                      <>
                        <Form.Item name="email" style={{ margin: 0 }} rules={[{ required: true, message: t('content.procedure_name_required') }]}>
                          <Input autoFocus />
                        </Form.Item>
                      </>
                    )
                  } else {
                    return currentValue
                  }
                }}
              />
            </ColumnGroup>
          </Table>
        </div>
      </Form>
    </div>
  )
}

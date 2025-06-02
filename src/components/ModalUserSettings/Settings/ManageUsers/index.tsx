import { HealthcareParty, User } from '@icure/cardinal-sdk'
import { Button, Empty, Form, Input, Space, Table, message, notification } from 'antd'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useCreateUpdateHealthcarePartyMutation, useGetHealthcarePartiesByIdsQuery } from '../../../../core/api/healthcarePartyApi'
import { useCreateUserMutation, useGetUsersQuery } from '../../../../core/api/userApi'
import { ModalConfirmAction } from '../../../common/ModalConfirmAction'

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
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false)
  const [userRowToBeDeleted, setUserRowToBeDeleted] = useState<UserRow | undefined>(undefined)
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
      return {
        rowId: v4(),
        firstName: pair[1].firstName,
        lastName: pair[1].lastName,
        email: pair[0].email,
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

  const addUser = () => {
    try {
      const newUser: UserRow = {
        rowId: v4(),
        firstName: t('content.firstname'),
        lastName: t('content.lastname'),
        email: t('content.email'),
      }
      setTableRows((prev) => [...prev, newUser])
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const tableRowDelete = () => {}

  const tableRowUpdate = (record: UserRow) => {}

  const tableRowCancel = (record: UserRow) => {}

  const tableRowEdit = (record: UserRow) => {}

  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
      <Form layout="vertical" colon={false} form={form} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between' }}>
        <div className="ant-table-custom">
          <Table<UserRow>
            className="custom-table"
            pagination={{
              pageSize: 10,
              simple: true,
            }}
            scroll={{ y: 'calc(100vh - 450px)', x: 'max-content' }}
            dataSource={tableRows}
            rowKey="rowId"
            locale={{ emptyText: <Empty description={t('content.no_user_yet')} /> }}
          >
            <ColumnGroup
              title={
                <Button style={{ width: '100%' }} onClick={addUser}>
                  {t('content.add_user')}
                </Button>
              }
            >
              <Column
                title={t('content.firstname')}
                dataIndex="firstName"
                key="firstName"
                width="15%"
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
                title={t('content.lastname')}
                dataIndex="lastName"
                key="lastName"
                width="15%"
                sorter={(a, b) => a.lastName.localeCompare(b.lastName)}
                render={(currentValue: string, record: UserRow) => {
                  const editable = isEditing(record)
                  if (editable) {
                    return (
                      <>
                        <Form.Item name="lastName" style={{ margin: 0 }} rules={[{ required: true, message: t('content.procedure_name_required') }]}>
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
                width="20%"
                sorter={(a, b) => a.email.localeCompare(b.email)}
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
                        <Button onClick={() => tableRowCancel(record)}>{t('content.cancel')}</Button>
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
            </ColumnGroup>
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

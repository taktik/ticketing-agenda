import { DeleteOutlined } from '@ant-design/icons'
import { HealthcareParty, CalendarItemType } from '@icure/cardinal-sdk'
import { Button, Form, Input, Tooltip, List, Row, Col } from 'antd'
import React, { ReactElement, useCallback, useState } from 'react'
import './index.css'
import { useCreateUpdateHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery } from '../../../core/api/healthcarePartyApi'

interface SiteSettingProps {
  site: HealthcareParty | undefined
}

export const SiteSetting = ({ site }: SiteSettingProps): ReactElement => {
  const [form] = Form.useForm()

  const [createUpdateHealthcareParty, { data, error, isError, isSuccess, isLoading }] = useCreateUpdateHealthcarePartyMutation()

  const handleSubmit = () => {
    const { name } = form.getFieldsValue()
    createUpdateHealthcareParty(new HealthcareParty({ ...site, ...form.getFieldsValue() }))

    form.submit()
  }

  const handleDelete = () => {
    console.log('site', site)
  }

  const handleClose = () => {
    form.resetFields()
  }

  const { data: services } = useGetHealthcarePartiesByParentQuery({ skip: !site, parentId: site?.id ?? '' })

  const [editItem, setEditItem] = useState<string | undefined>(undefined)
  const [inputValue, setInputValue] = useState<string>('')

  const handleEditClick = (item: HealthcareParty) => {
    setEditItem(item.id)
    setInputValue(item.name ?? '')
  }

  const handleSaveClick = useCallback(() => {
    const updatedItems = (services ?? []).map((item) => (item.id === editItem ? { ...item, name: inputValue } : item))
    console.log('Updated Items:', updatedItems)
    setEditItem(undefined)
  }, [services, editItem, inputValue])

  return (
    <div className="root">
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
          <Button icon={<DeleteOutlined />} onClick={handleDelete} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
        </Tooltip>
      </div>
      <div className="demarches-list">
        <List
          dataSource={services}
          renderItem={(item) => (
            <List.Item
              style={{ position: 'relative', padding: '10px' }}
              actions={[
                <Button onClick={() => handleEditClick(item)} style={{ display: editItem === item.id ? 'none' : 'inline' }} key={item.id + 'edit'}>
                  Edit
                </Button>,
                <Button onClick={handleSaveClick} style={{ display: editItem === item.id ? 'inline' : 'none' }} key={item.id + 'save'}>
                  Save
                </Button>,
              ]}
            >
              <Row style={{ width: '100%' }}>
                <Col span={20}>
                  {editItem === item.id ? <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={handleSaveClick} /> : item.name}
                </Col>
              </Row>
            </List.Item>
          )}
        />
      </div>
      <div className="button-list">
        <Button variant="filled" color="primary" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  )
}

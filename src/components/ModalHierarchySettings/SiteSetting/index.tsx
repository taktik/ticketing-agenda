import { CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons'
import { Agenda, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Empty, Form, Input, List, message, notification, Tooltip, Typography } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { SettingContext } from '../../../contexts/SettingContext'
import { useCreateUpdateAgendaMutation } from '../../../core/api/agendaApi'
import { useCreateUpdateHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery, useRecursiveHcpDeletion } from '../../../core/api/healthcarePartyApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import './index.css'
import { ButtonStyleType, StyledButton } from '../../common/StyledButton'

interface ListHeaderProps {
  site: HealthcareParty | undefined
  handleCreateNewService: (item: HealthcareParty) => void
}

const ListHeader = React.memo(({ site, handleCreateNewService }: ListHeaderProps) => {
  const { selectedKeyId } = useContext(SettingContext)
  const { t } = useTranslation()

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

  const handleAddService = useCallback(() => {
    try {
      if (!selectedKeyId) throw new Error('No selected Site')
      const serviceHcp = new HealthcareParty({ name: t('content.new_service'), parentId: selectedKeyId, id: v4() })
      handleCreateNewService(serviceHcp)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }, [selectedKeyId])

  return (
    <div className="list-header">
      {notificationContextHolder}
      <div>{t('content.services')} :</div>
      <Tooltip title={t('content.add_new_service')}>
        <Button icon={<PlusOutlined />} onClick={handleAddService} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
      </Tooltip>
    </div>
  )
})

interface SiteSettingProps {
  site: HealthcareParty
  services: HealthcareParty[]
}

export const SiteSetting = ({ site, services }: SiteSettingProps): ReactElement => {
  const { selectedKeyId, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)

  const [createUpdateAgendaMutation, { isError: isCreateUpdateAgendaError, isSuccess: isCreateUpdateAgendaSuccess, isLoading: isCreateUpdateAgendaLoading }] = useCreateUpdateAgendaMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const [createUpdateSite, { isError: isCreateUpdateSiteError, isSuccess: isCreateUpdateSiteSuccess, isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] = useCreateUpdateHealthcarePartyMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const { deleteHcpRecursively: deleteSite, isLoading: isDeleteSiteLoading, isSuccess: isDeleteSiteSuccess, error: isDeleteSiteError } = useRecursiveHcpDeletion()
  const { deleteHcpRecursively: deleteService, isLoading: isDeleteServiceLoading, isSuccess: isDeleteServiceSuccess, error: isDeleteServiceError } = useRecursiveHcpDeletion()

  const handleSiteDelete = () => {
    try {
      if (!site) throw new Error('No site selected')
      deleteSite(site)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setSelectedKey('default')
    }
  }

  const handleCreateNewService = async () => {
    try {
      const serviceHcp = new HealthcareParty({ name: t('content.new_service'), parentId: selectedKeyId, id: v4() })
      await createUpdateService({ ...serviceHcp })
      createUpdateAgendaMutation(new Agenda({ author: serviceHcp.id }))
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  // We have two same mutations with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  useEffect(() => {
    if (isDeleteSiteSuccess) showMessageFeedback('success', t('notification.site_deleted'))
    if (isDeleteSiteError) openNotification('error', t('notification.site_delete_failed'), t('notification.site_delete_error'))
  }, [isDeleteSiteSuccess, isDeleteSiteError])

  useEffect(() => {
    if (isCreateUpdateSiteSuccess) showMessageFeedback('success', t('notification.site_saved'))
    if (isCreateUpdateSiteError) openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
  }, [isCreateUpdateSiteSuccess, isCreateUpdateSiteError])

  // We have two same mutations with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  useEffect(() => {
    if (isDeleteServiceSuccess) showMessageFeedback('success', t('notification.service_deleted'))
    if (isDeleteServiceError) openNotification('error', t('notification.service_delete_failed'), t('notification.service_delete_error'))
  }, [isDeleteServiceSuccess, isDeleteServiceError])

  useEffect(() => {
    if (isCreateUpdateServiceSuccess) showMessageFeedback('success', t('notification.service_saved'))
    if (isCreateUpdateServiceError) openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
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

  return (
    <div className="site-root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="site-header">
        <div className="site-title">
          <Typography.Title level={2}>{site.name}</Typography.Title>
          <Typography.Text type="secondary">Sélectionnez un service ci-dessous pour configurer ses démarches.</Typography.Text>
        </div>
        <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={() => handleCreateNewService()} style={{ alignSelf: 'baseline' }}>
          {t('actions.add_service', 'Ajouter un service')}
        </StyledButton>
      </div>

      <div className="site-grid">
        {services.map((service) => (
          <Card key={service.id} hoverable onClick={() => setSelectedKey(`service-${service.id}`)} className="site-card">
            <Card.Meta title={service.name} description={`${0} démarche(s)`} />
          </Card>
        ))}
      </div>
      {showDeleteSiteModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_site_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_site_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
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
    </div>
  )
}

/*



  return (
    <div className="root">
      {notificationContextHolder}
      {messageContextHolder}
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
            <Input
              suffix={
                <Tooltip title={t('content.reset_name')}>
                  <span
                    style={{
                      color: nameValue === site?.name ? 'gray' : 'black',
                      cursor: nameValue === site?.name ? 'not-allowed' : 'pointer',
                      pointerEvents: 'auto',
                    }}
                    onClick={handleCancel}
                  >
                    <CloseOutlined />
                  </span>
                </Tooltip>
              }
              value={site ? site.name : t('content.new_site')}
              style={{ fontSize: 13, borderRadius: 0, width: '100%' }}
            />
          </Form.Item>
        </Form>
        <Tooltip title={t('content.save_site')}>
          <Button icon={<SaveOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} disabled={nameValue === site?.name} onClick={handleSubmit} />
        </Tooltip>
        <Tooltip title={t('content.delete_site')}>
          <Button icon={<DeleteOutlined />} disabled={!site} danger onClick={() => setShowDeleteSiteModal(true)} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
        </Tooltip>
      </div>
      <div className="services-list">
        <List
          header={<ListHeader site={site} handleCreateNewService={handleCreateNewService} />}
          dataSource={servicesList}
          locale={{ emptyText: <Empty description={t('content.no_service_yet')} /> }}
          renderItem={(item) => (
            <List.Item>
              {editItem?.id === item.id ? <Input defaultValue={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSaveService(item)} autoFocus /> : item.name}
              {editItem?.id !== item.id && (
                <Tooltip title={t('content.edit_service')}>
                  <Button className="edit-button" icon={<EditOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={() => handleEditService(item)} />
                </Tooltip>
              )}
              {editItem?.id === item.id && (
                <div className="action-buttons">
                  <Tooltip title="Cancel">
                    <Button icon={<RollbackOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={cancelEditService} />
                  </Tooltip>
                  <Tooltip title={t('content.save_service')}>
                    <Button icon={<SaveOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} onClick={() => handleSaveService(item)} />
                  </Tooltip>
                  <Tooltip title={t('content.delete_service')}>
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteService(item)} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
                  </Tooltip>
                </div>
              )}
            </List.Item>
          )}
        />
      </div>
     
      {showDeleteServiceModal &&
        createPortal(
          <ModalConfirmAction
            title={t('delete_modal.confirm_delete_service_prompt')}
            description=""
            content={
              <>
                <p>{t('delete_modal.delete_service_warning_details')}</p>
                <p>{t('delete_modal.delete_permanent_warning')}</p>
              </>
            }
            yesBtnTitle={t('content.delete')}
            noBtnTitle={t('content.close')}
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


  */

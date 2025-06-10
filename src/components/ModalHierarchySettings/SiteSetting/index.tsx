import { CloseOutlined, DeleteOutlined, EditOutlined, EllipsisOutlined, PlusOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons'
import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Dropdown, Empty, Form, Input, List, MenuProps, message, notification, Space, Tooltip, Typography } from 'antd'
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { SettingContext } from '../../../contexts/SettingContext'
import { useCreateUpdateAgendaMutation, useGetAllAgendaByAuthorIds } from '../../../core/api/agendaApi'
import { useCreateUpdateHealthcarePartyMutation, useGetHealthcarePartiesByParentQuery, useRecursiveHcpDeletion } from '../../../core/api/healthcarePartyApi'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import './index.css'
import { ButtonStyleType, StyledButton } from '../../common/StyledButton'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'

type FormValues = {
  name: string
}
interface renameSiteProps {
  site: HealthcareParty
  setShowRenameSiteInput: React.Dispatch<React.SetStateAction<boolean>>
  renameSite: (name: string) => void
}

const RenameSite = React.memo(({ site, setShowRenameSiteInput, renameSite }: renameSiteProps) => {
  const { t } = useTranslation()

  const [form] = Form.useForm<FormValues>()
  const watchName = Form.useWatch('name', form)

  useEffect(() => {
    form.setFieldValue('name', site.name)
  }, [site, form])

  const handleRename = (newName: string) => {
    renameSite(newName)
    form.resetFields()
  }

  return (
    <div className="site-rename-root">
      <Form form={form} className="site-rename-form">
        <Form.Item name="name" rules={[{ required: true, message: 'Name of the site' }]}>
          <Input autoFocus />
        </Form.Item>
        <Tooltip title={t('content.cancel')}>
          <Button icon={<RollbackOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} disabled={watchName !== site.name} onClick={() => setShowRenameSiteInput(false)} />
        </Tooltip>
        <Tooltip title={t('content.save_site')}>
          <Button icon={<SaveOutlined />} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} disabled={watchName === site.name} onClick={() => handleRename(watchName)} />
        </Tooltip>
      </Form>
    </div>
  )
})

interface SiteSettingProps {
  site: HealthcareParty
  services: HealthcareParty[]
}

type ServiceWithProceduresTuple = [HealthcareParty, CalendarItemType[]]

export const SiteSetting = ({ site, services }: SiteSettingProps): ReactElement => {
  const { selectedKeyId, setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showRenameSiteInput, setShowRenameSiteInput] = useState<boolean>(false)

  const [createUpdateAgendaMutation, { isError: isCreateUpdateAgendaError, isSuccess: isCreateUpdateAgendaSuccess, isLoading: isCreateUpdateAgendaLoading }] = useCreateUpdateAgendaMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const [createUpdateSite, { isError: isCreateUpdateSiteError, isSuccess: isCreateUpdateSiteSuccess, isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()
  const [createUpdateService, { isError: isCreateUpdateServiceError, isSuccess: isCreateUpdateServiceSuccess, isLoading: isCreateUpdateServiceLoading }] = useCreateUpdateHealthcarePartyMutation()

  // Creating a pair of the same mutation with renamed states and callback. Goal is to have better visibility : One is for site, the other is for service
  const { deleteHcpRecursively: deleteSite, isLoading: isDeleteSiteLoading, isSuccess: isDeleteSiteSuccess, error: isDeleteSiteError } = useRecursiveHcpDeletion()

  const siteActionItems: MenuProps['items'] = [
    {
      key: 'rename',
      label: t('actions.rename_site', 'Renommer'),
      icon: <EditOutlined />,
      onClick: () => setShowRenameSiteInput(true),
    },
    {
      key: 'delete',
      label: t('actions.delete_site', 'Supprimer'),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => setShowDeleteSiteModal(true),
    },
  ]

  const renameSite = (newName: string) => {
    try {
      if (!site) throw new Error('No site selected')
      createUpdateSite(new HealthcareParty({ ...site, name: newName }))
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setShowRenameSiteInput(false)
    }
  }

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

  const servicesIds = useMemo(() => services?.map((service) => service.id), [services])
  const { data: allAgendas } = useGetAllAgendaByAuthorIds({ skip: !site || !services, authorIds: servicesIds })
  const agendaIds = useMemo(() => allAgendas?.map((agenda) => agenda.id), [allAgendas])

  const { data: allProcedures } = useGetCalendarItemTypesForMultipleAgendasQuery({ skip: !site || !agendaIds, agendaIds: agendaIds })
  const flatProceduresArray = useMemo(() => (allProcedures ?? []).flat(), [allProcedures])

  const serviceAndProcedures: ServiceWithProceduresTuple[] = services.map((service): ServiceWithProceduresTuple => {
    const serviceProcedures = flatProceduresArray.filter((procedure) => procedure.healthcarePartyId === service.id && procedure.defaultCalendarItemType === true)
    return [service, serviceProcedures]
  })

  return (
    <div className="site-root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="site-header">
        <div className="site-title">
          <Space align="center">
            {showRenameSiteInput ? <RenameSite site={site} setShowRenameSiteInput={setShowRenameSiteInput} renameSite={renameSite} /> : <Typography.Title level={2}>{site.name}</Typography.Title>}
            {showRenameSiteInput ? null : (
              <Dropdown menu={{ items: siteActionItems }} trigger={['click']}>
                <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px', fontWeight: 'bold' }} />} shape="circle" size="large" />
              </Dropdown>
            )}
          </Space>
          <Typography.Text type="secondary">Sélectionnez un service ci-dessous pour configurer ses démarches.</Typography.Text>
        </div>
        <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={() => handleCreateNewService()} style={{ alignSelf: 'baseline' }}>
          {t('actions.add_service', 'Ajouter un service')}
        </StyledButton>
      </div>

      <div className="site-grid">
        {serviceAndProcedures.map((service) => (
          <Card key={service[0].id} hoverable onClick={() => setSelectedKey(`service-${service[0].id}`)} className="site-card">
            <Card.Meta title={service[0].name} description={`${service[1].length} démarche(s)`} />
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

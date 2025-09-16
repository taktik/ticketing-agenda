import { DeleteOutlined, EditOutlined, EllipsisOutlined } from '@ant-design/icons'
import { AddressType, Agenda, AgendaSlottingAlgorithm, CalendarItemType, CodeStub, DecryptedAddress, DecryptedPropertyStub, DecryptedTypedValue, HealthcareParty, TypedValuesType } from '@icure/cardinal-sdk'
import { Button, Card, Dropdown, MenuProps, message, notification, Space, Typography } from 'antd'
import { ReactElement, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { SettingContext } from '../../../contexts/SettingContext'
import { useCreateUpdateAgendaMutation } from '../../../core/api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { useCreateUpdateHealthcarePartyMutation } from '../../../core/api/healthcarePartyApi'
import { EditableSiteInfo, SiteInfoFormValues } from '../../common/EditableSiteInfo'
import { ModalConfirmAction } from '../../common/ModalConfirmAction'
import { ButtonStyleType, StyledButton } from '../../common/StyledButton'
import './index.css'

interface SiteSettingProps {
  site: HealthcareParty
  services: Agenda[]
  handleSiteDelete: (site: HealthcareParty) => Promise<void>
  isSitesLoading: boolean
}

type ServiceWithProceduresTuple = [Agenda, CalendarItemType[]]

export const SiteSetting = ({ site, services, handleSiteDelete, isSitesLoading }: SiteSettingProps): ReactElement => {
  const { setSelectedKey } = useContext(SettingContext)
  const { t } = useTranslation()
  const [showDeleteSiteModal, setShowDeleteSiteModal] = useState<boolean>(false)
  const [showEditableSite, setShowEditableSite] = useState<boolean>(false)

  const agendaIds = useMemo(() => services?.map((agenda) => agenda.id), [services])

  const { data: allProcedures, isLoading: isCalendarItemTypesLoading } = useGetCalendarItemTypesForMultipleAgendasQuery(agendaIds, { skip: !site || !agendaIds })
  const flatProceduresArray = useMemo(() => (allProcedures ?? []).flat(), [allProcedures])

  const serviceAndProcedures: ServiceWithProceduresTuple[] = useMemo(() => {
    const proceduresByAgendaId = flatProceduresArray.reduce((acc, procedure) => {
      if (procedure.agendaId && procedure.defaultCalendarItemType === true) {
        const existingProcedures = acc.get(procedure.agendaId) || []
        acc.set(procedure.agendaId, [...existingProcedures, procedure])
      }
      return acc
    }, new Map<string, CalendarItemType[]>())

    return services.map((service): ServiceWithProceduresTuple => {
      const serviceProcedures = proceduresByAgendaId.get(service.id) || []
      return [service, serviceProcedures]
    })
  }, [flatProceduresArray, services])

  const [createUpdateAgendaMutation, { isLoading: isCreateUpdateAgendaLoading }] = useCreateUpdateAgendaMutation()
  const [createUpdateSite, { isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()

  const fetchIsLoading = useMemo(() => isSitesLoading || isCalendarItemTypesLoading, [isSitesLoading, isCalendarItemTypesLoading])
  const mutationIsLoading = useMemo(() => isCreateUpdateAgendaLoading || isCreateUpdateSiteLoading, [isCreateUpdateAgendaLoading, isCreateUpdateSiteLoading])

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

  const siteActionItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: t('content.edit'),
      icon: <EditOutlined />,
      onClick: () => setShowEditableSite(true),
    },
    {
      key: 'delete',
      label: t('content.delete'),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => setShowDeleteSiteModal(true),
    },
  ]

  const onSiteInfoSave = useCallback(
    async (formValues: SiteInfoFormValues) => {
      try {
        if (!site) throw new Error()
        await createUpdateSite(new HealthcareParty({ ...site, name: formValues.name, addresses: [new DecryptedAddress({ street: formValues.location, addressType: AddressType.Hq })] })).unwrap()
        showMessageFeedback('success', t('notification.site_saved'))
      } catch (error) {
        openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
      } finally {
        setShowEditableSite(false)
      }
    },
    [site, createUpdateSite, showMessageFeedback, openNotification, setShowEditableSite, t],
  )

  const handleCreateNewService = useCallback(async () => {
    try {
      const parentProperty = new DecryptedPropertyStub({
        id: 'parentSite',
        typedValue: new DecryptedTypedValue({
          type: TypedValuesType.String,
          stringValue: site.id,
        }),
      })
      const algorithm = new AgendaSlottingAlgorithm.FixedIntervals({
        intervalMinutes: 5,
      })

      const tagType = 'SERVICE'
      const tagVersion = '1'

      await createUpdateAgendaMutation(
        new Agenda({
          author: site.id,
          zoneId: 'Europe/Brussels',
          slottingAlgorithm: algorithm,
          name: t('content.new_service'),
          tags: [
            new CodeStub({
              id: `${tagType}|${tagVersion}`,
              code: tagType,
              type: tagType,
              version: tagVersion,
              label: {
                FR: t('content.new_service'),
                NL: '',
                EN: '',
                DE: '',
              },
            }),
          ],
          properties: [parentProperty],
        }),
      ).unwrap()
      showMessageFeedback('success', t('notification.service_saved'))
    } catch (error) {
      openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
    }
  }, [site, createUpdateAgendaMutation, showMessageFeedback, openNotification, t])

  return (
    <div className="site-root">
      {notificationContextHolder}
      {messageContextHolder}
      <div className="site-header">
        <div className="site-title">
          <Space align="center">
            {showEditableSite ? <EditableSiteInfo hcp={site} setShowEditableSite={setShowEditableSite} onSave={onSiteInfoSave} /> : <Typography.Title level={2}>{site.name}</Typography.Title>}
            {showEditableSite ? null : (
              <Dropdown menu={{ items: siteActionItems }} trigger={['click']}>
                <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px' }} />} shape="circle" size="large" />
              </Dropdown>
            )}
          </Space>
          <Typography.Text type="secondary">{t('content.select_service_to_configure_procedures')}</Typography.Text>
        </div>
        <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={handleCreateNewService} style={{ alignSelf: 'baseline' }} loading={mutationIsLoading} disabled={fetchIsLoading || mutationIsLoading}>
          {t('content.add_service')}
        </StyledButton>
      </div>

      <div className="site-grid">
        {serviceAndProcedures.map(([service, procedures]) => (
          <Card key={service.id} hoverable onClick={() => setSelectedKey(`service-${service.id}`)} className="site-card">
            <Card.Meta title={service.name} description={procedures.length !== 1 ? `${procedures.length} ${t('content.procedures')}` : `${procedures.length} ${t('content.procedure')}`} />
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
              handleSiteDelete(site)
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

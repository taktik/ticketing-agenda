import { EditOutlined, EllipsisOutlined } from '@ant-design/icons'
import { AddressType, Agenda, AgendaSlottingAlgorithm, CalendarItemType, DecryptedAddress, HealthcareParty } from '@icure/cardinal-sdk'
import { Button, Card, Dropdown, MenuProps, message, Space, Typography } from 'antd'
import { ReactElement, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateUpdateAgendaMutation } from '../../../core/api/agendaApi'
import { useCreateUpdateHealthcarePartyMutation } from '../../../core/api/healthcarePartyApi'
import { useHierarchyContext } from '../../../core/contexts/HierarchyContext'
import { EditableSiteInfo, SiteInfoFormValues } from '../../common/EditableSiteInfo'
import { createStringProperty, translationPropertyId } from '../../common/helpers'
import { EntityType, PropertyId } from '../../../core/api/fetchType'
import { useNotificationHelper } from '../../../core/hooks/useNotificationHelper'
import { ButtonStyleType, StyledButton } from '../../common/StyledButton'
import './index.css'

interface SiteSettingProps {
  site: HealthcareParty
  services: Agenda[]
  isSitesLoading: boolean
  onSelectService: (serviceId: string) => void
}

type ServiceWithProceduresTuple = [Agenda, CalendarItemType[]]

export const SiteSetting = ({ site, services, isSitesLoading, onSelectService }: SiteSettingProps): ReactElement => {
  const { t } = useTranslation()
  const { calendarItemTypesByAgendaId } = useHierarchyContext()

  const [showEditableSite, setShowEditableSite] = useState<boolean>(false)

  const serviceAndProcedures: ServiceWithProceduresTuple[] = useMemo(() => {
    return services.map((service): ServiceWithProceduresTuple => {
      const allProcedures = calendarItemTypesByAgendaId.get(service.id) || []

      const defaultProcedures = allProcedures.filter((p) => p.defaultCalendarItemType === true)

      return [service, defaultProcedures]
    })
  }, [services, calendarItemTypesByAgendaId])

  const [createUpdateAgendaMutation, { isLoading: isCreateUpdateAgendaLoading }] = useCreateUpdateAgendaMutation()
  const [createUpdateSite, { isLoading: isCreateUpdateSiteLoading }] = useCreateUpdateHealthcarePartyMutation()

  const mutationIsLoading = isCreateUpdateAgendaLoading || isCreateUpdateSiteLoading

  const { openNotification, notificationContextHolder } = useNotificationHelper()
  const [messageApi, messageContextHolder] = message.useMessage()

  const onSiteInfoSave = useCallback(
    async (formValues: SiteInfoFormValues) => {
      try {
        const updatedPublicProperties = [
          ...(site.publicProperties || []).filter((p) => p.id !== PropertyId.SITE_LOCATION && p.id !== PropertyId.SITE_QBETTER_LOCATION_ID),
          createStringProperty(PropertyId.SITE_LOCATION, formValues.location),
          createStringProperty(PropertyId.SITE_QBETTER_LOCATION_ID, formValues.qBetterLocationId),
        ]

        await createUpdateSite(
          new HealthcareParty({
            ...site,
            name: formValues.name,
            firstName: formValues.name,
            lastName: formValues.name,
            publicProperties: updatedPublicProperties,
            addresses: [new DecryptedAddress({ street: formValues.location, addressType: AddressType.Hq })],
          }),
        ).unwrap()

        messageApi.success(t('notification.site_saved'))
      } catch (error) {
        openNotification('error', t('notification.site_save_failed'), t('notification.site_save_error'))
      } finally {
        setShowEditableSite(false)
      }
    },
    [site, createUpdateSite, messageApi, openNotification, t],
  )

  const handleCreateNewService = useCallback(async () => {
    try {
      const properties = [
        createStringProperty(PropertyId.SERVICE_PARENTID, site.id),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'FR'), t('content.new_service')),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'NL'), ''),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'EN'), ''),
        createStringProperty(translationPropertyId(EntityType.SERVICE, 'DE'), ''),
      ]

      const algorithm = new AgendaSlottingAlgorithm.FixedIntervals({ intervalMinutes: 5 })

      await createUpdateAgendaMutation(
        new Agenda({
          author: site.id,
          zoneId: 'Europe/Brussels',
          slottingAlgorithm: algorithm,
          name: t('content.new_service'),
          properties: properties,
        }),
      ).unwrap()

      messageApi.success(t('notification.service_saved'))
    } catch (error) {
      openNotification('error', t('notification.service_save_failed'), t('notification.service_save_error'))
    }
  }, [site, createUpdateAgendaMutation, messageApi, openNotification, t])

  const siteActionItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: t('content.edit'),
      icon: <EditOutlined />,
      onClick: () => setShowEditableSite(true),
    },
  ]

  return (
    <div className="site-root">
      {notificationContextHolder}
      {messageContextHolder}

      <div className="site-header">
        <div className="site-title">
          {showEditableSite ? (
            <EditableSiteInfo hcp={site} setShowEditableSite={setShowEditableSite} onSave={onSiteInfoSave} />
          ) : (
            <Space align="center">
              <Typography.Title level={2}>{site.name}</Typography.Title>
              <Dropdown menu={{ items: siteActionItems }} trigger={['click']}>
                <Button type="text" icon={<EllipsisOutlined style={{ fontSize: '20px' }} />} shape="circle" size="large" />
              </Dropdown>
            </Space>
          )}
          <Typography.Text type="secondary">{t('content.select_service_to_configure_procedures')}</Typography.Text>
        </div>

        <StyledButton stylingType={ButtonStyleType.BlackThemeActive} onClick={handleCreateNewService} style={{ alignSelf: 'baseline' }} loading={mutationIsLoading} disabled={isSitesLoading || mutationIsLoading}>
          {t('content.add_service')}
        </StyledButton>
      </div>

      <div className="site-grid">
        {serviceAndProcedures.map(([service, procedures]) => (
          <Card key={service.id} hoverable onClick={() => onSelectService(service.id)} className="site-card">
            <Card.Meta title={service.name} description={procedures.length !== 1 ? `${procedures.length} ${t('content.procedures')}` : `${procedures.length} ${t('content.procedure')}`} />
          </Card>
        ))}
      </div>
    </div>
  )
}

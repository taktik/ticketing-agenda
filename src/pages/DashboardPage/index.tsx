import { ApartmentOutlined, ScheduleOutlined } from '@ant-design/icons'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import FullCalendar from '@fullcalendar/react'
import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Calendar as AntCalendar, Button, Card, Space, Tooltip } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from '../../components/Calendar'
import { Header } from '../../components/common/Header'
import { ItemSelector } from '../../components/ItemSelector/ItemSelector'
import { ModalHierarchySettings } from '../../components/ModalHierarchySettings'
import { ModalScheduling } from '../../components/ModalScheduling'
import { SiteSelector } from '../../components/SiteSelector'
import { SettingContextProvider } from '../../contexts/SettingContext'
import { useGetAgendasByStringPropertyQuery } from '../../core/api/agendaApi'
import { useGetCalendarItemTypesQuery } from '../../core/api/calendarItemTypeApi'
import { useAppSelector } from '../../core/hooks'
import { usePermissions } from '../../core/hooks/usePermissions'
import { useSites } from '../../core/hooks/useSites'
import './index.css'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [schedulingModalOpen, setSchedulingModalOpen] = useState<boolean>(false)
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState<boolean>(false)
  const calendarRef = useRef<FullCalendar | null>(null)
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const { t } = useTranslation()

  const { isAdminLevel, attachedService, attachedSite } = usePermissions(skip)
  const { sites, isSitesLoading } = useSites(skip)

  const dispayableSites = useMemo(() => (attachedSite ? (sites?.filter((site) => site.id === attachedSite) ?? []) : (sites ?? [])), [sites, attachedSite])

  const [selectedSite, setSelectedSite] = useState<HealthcareParty | undefined>(dispayableSites[0])

  const { data: services, isLoading: isServicesLoading } = useGetAgendasByStringPropertyQuery({ propertyId: 'SERVICE|PARENTID', propertyValue: selectedSite?.id ?? '' }, { skip: skip || !selectedSite })
  const filteredServices = useMemo(() => (services && selectedSite ? (attachedService ? services.filter((service) => service.id === attachedService) : services) : []), [services, selectedSite, attachedService])
  const [selectedService, setSelectedService] = useState<Agenda | undefined>(undefined)

  const { data: procedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesQuery(selectedService?.id ?? '', { skip: skip || !selectedService })
  const filteredProcedures = useMemo(() => (procedures && selectedService ? procedures : []), [procedures, selectedService])
  const [selectedProcedure, setSelectedProcedure] = useState<CalendarItemType | undefined>(undefined)

  const isSitesRelatedLoading = useMemo(() => isSitesLoading, [isSitesLoading])
  const isServicesRelatedLoading = useMemo(() => isSitesRelatedLoading || isServicesLoading, [isSitesRelatedLoading, isServicesLoading])
  const isProceduresRelatedLoading = useMemo(() => isServicesRelatedLoading || isProceduresLoading, [isServicesRelatedLoading, isProceduresLoading])

  useEffect(() => setSelectedService(undefined), [services])
  useEffect(() => setSelectedProcedure(undefined), [procedures])

  useEffect(() => {
    if (!selectedSite && dispayableSites) {
      setSelectedSite(dispayableSites[0])
    }
  }, [dispayableSites])

  const handleAntCalendarDateChange = useCallback(
    (value: Dayjs) => {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi && value) {
        setCalendarDate(value.toDate())
        calendarApi.gotoDate(value.toDate())
      }
    },
    [calendarRef, setCalendarDate],
  )

  const handleFullCalendarDateChange = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      const currentDate = calendarApi.getDate()
      setCalendarDate(currentDate)
    }
  }, [setCalendarDate])

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        <div className="left-panel">
          <Card className="card">
            <div className="SiteSelectorRow">
              <SiteSelector sites={dispayableSites} isSitesLoading={isSitesRelatedLoading} setSelectedSite={setSelectedSite} selectedSite={selectedSite} />
              {isAdminLevel && (
                <Space>
                  <Tooltip title={t('content.organize_hierarchy')}>
                    <Button icon={<ApartmentOutlined />} onClick={() => setHierarchyModalOpen(true)} aria-label={t('content.organize_hierarchy')} />
                  </Tooltip>
                  <Tooltip title={t('content.manage_planning')}>
                    <Button icon={<ScheduleOutlined />} onClick={() => setSchedulingModalOpen(true)} aria-label={t('content.manage_planning')} />
                  </Tooltip>
                </Space>
              )}
            </div>
          </Card>
          <div className="ant-calendar-wrapper">
            <AntCalendar fullscreen={false} value={dayjs(calendarDate)} onChange={handleAntCalendarDateChange} />
          </div>
          <ItemSelector<Agenda> titleKey="content.services" items={filteredServices} isLoading={isServicesRelatedLoading} selectedItem={selectedService} setSelectedItem={setSelectedService} />
          <ItemSelector<CalendarItemType>
            titleKey="content.procedures"
            items={filteredProcedures}
            isLoading={isProceduresRelatedLoading}
            selectedItem={selectedProcedure}
            setSelectedItem={setSelectedProcedure}
            filterPredicate={(item) => item.defaultCalendarItemType === true}
          />
        </div>
        <div className="right-panel">
          <Calendar
            calendarRef={calendarRef}
            handleFullCalendarDateChange={handleFullCalendarDateChange}
            selectedAgenda={selectedService}
            procedures={filteredProcedures}
            selectedProcedure={selectedProcedure}
            calendarDate={calendarDate}
            sites={dispayableSites}
          />
        </div>
      </div>
      {hierarchyModalOpen &&
        createPortal(
          <SettingContextProvider selectedSite={selectedSite}>
            <ModalHierarchySettings isVisible={hierarchyModalOpen} onClose={() => setHierarchyModalOpen(false)} />
          </SettingContextProvider>,
          document.body,
        )}
      {schedulingModalOpen && createPortal(<ModalScheduling isVisible={schedulingModalOpen} onClose={() => setSchedulingModalOpen(false)} services={filteredServices} />, document.body)}
    </div>
  )
}

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
import { useHierarchyContext } from '../../core/contexts/HierarchyContext'
import { usePermissionContext } from '../../core/contexts/PermissionContext'
import './index.css'

export default function DashboardPage() {
  const { t } = useTranslation()

  const { allSites, agendasBySiteId, calendarItemTypesByAgendaId, isLoading: isDataLoading } = useHierarchyContext()
  const { isAdminLevel, attachedSites, attachedServices } = usePermissionContext()

  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [schedulingModalOpen, setSchedulingModalOpen] = useState<boolean>(false)
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState<boolean>(false)

  const [selectedSite, setSelectedSite] = useState<HealthcareParty | undefined>()
  const [selectedService, setSelectedService] = useState<Agenda | undefined>()
  const [selectedProcedure, setSelectedProcedure] = useState<CalendarItemType | undefined>()

  const calendarRef = useRef<FullCalendar | null>(null)

  const displayableSites = useMemo(() => {
    if (attachedSites && attachedSites.length > 0) {
      return allSites.filter((site) => attachedSites.includes(site.id))
    }
    return allSites
  }, [allSites, attachedSites])

  const filteredServices = useMemo(() => {
    if (!selectedSite) return []

    const siteAgendas = agendasBySiteId.get(selectedSite.id) || []

    if (attachedServices && attachedServices.length > 0) {
      return siteAgendas.filter((service) => attachedServices.includes(service.id))
    }
    return siteAgendas
  }, [selectedSite, agendasBySiteId, attachedServices])

  const filteredProcedures = useMemo(() => {
    if (!selectedService) return []
    return calendarItemTypesByAgendaId.get(selectedService.id) || []
  }, [selectedService, calendarItemTypesByAgendaId])

  useEffect(() => {
    if (!selectedSite && displayableSites.length > 0) {
      setSelectedSite(displayableSites[0])
    }
  }, [displayableSites, selectedSite])

  useEffect(() => {
    setSelectedService(undefined)
  }, [selectedSite?.id])

  useEffect(() => {
    setSelectedProcedure(undefined)
  }, [selectedService?.id])

  const handleAntCalendarDateChange = useCallback(
    (value: Dayjs) => {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi && value) {
        setCalendarDate(value.toDate())
        calendarApi.gotoDate(value.toDate())
      }
    },
    [calendarRef],
  )

  const handleFullCalendarDateChange = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      setCalendarDate(calendarApi.getDate())
    }
  }, [])

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        <div className="left-panel">
          <Card className="card">
            <div className="SiteSelectorRow">
              <SiteSelector sites={displayableSites} isSitesLoading={isDataLoading} setSelectedSite={setSelectedSite} selectedSite={selectedSite} />
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
          <div className="itemselectors-wrapper">
            <ItemSelector<Agenda> titleKey="content.services" items={filteredServices} isLoading={isDataLoading} selectedItem={selectedService} setSelectedItem={setSelectedService} />
            <ItemSelector<CalendarItemType>
              titleKey="content.procedures"
              items={filteredProcedures}
              isLoading={isDataLoading}
              selectedItem={selectedProcedure}
              setSelectedItem={setSelectedProcedure}
              filterPredicate={(item) => item.defaultCalendarItemType === true}
            />
          </div>
        </div>
        <div className="right-panel">
          <Calendar
            calendarRef={calendarRef}
            handleFullCalendarDateChange={handleFullCalendarDateChange}
            selectedAgenda={selectedService}
            procedures={filteredProcedures}
            selectedProcedure={selectedProcedure}
            calendarDate={calendarDate}
            sites={displayableSites}
          />
        </div>
      </div>

      {hierarchyModalOpen && createPortal(<ModalHierarchySettings isVisible={hierarchyModalOpen} onClose={() => setHierarchyModalOpen(false)} initialSiteId={selectedSite?.id} />, document.body)}
      {schedulingModalOpen && createPortal(<ModalScheduling isVisible={schedulingModalOpen} onClose={() => setSchedulingModalOpen(false)} services={filteredServices} />, document.body)}
    </div>
  )
}

import { ApartmentOutlined, ScheduleOutlined } from '@ant-design/icons'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import FullCalendar from '@fullcalendar/react'
import { CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Calendar as AntCalendar, Button, Card, Space, Tooltip } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from '../../components/Calendar'
import { Header } from '../../components/common/Header'
import { ModalHierarchySettings } from '../../components/ModalHierarchySettings'
import { ModalScheduling } from '../../components/ModalScheduling'
import { ProcedureSelector } from '../../components/ProcedureSelector'
import { ServiceSelector } from '../../components/ServiceSelector'
import { SiteSelector } from '../../components/SiteSelector'
import { SettingContextProvider } from '../../contexts/SettingContext'
import { useGetAgendaByAuthorId } from '../../core/api/agendaApi'
import { useGetCalendarItemTypesQuery } from '../../core/api/calendarItemTypeApi'
import { useGetHealthcarePartiesByParentQuery, useGetHealthcarePartiesQuery, useGetRootHealthcareParty } from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import './index.css'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [schedulingModalOpen, setSchedulingModalOpen] = useState<boolean>(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const calendarRef = useRef<FullCalendar | null>(null)
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const { t } = useTranslation()

  const { data: rootHcp, isLoading: isRootHcpLoading } = useGetRootHealthcareParty({ skip: skip })

  const { data: sites, isLoading: isSitesLoading } = useGetHealthcarePartiesByParentQuery({ parentId: rootHcp?.id ?? '' }, { skip: skip || !rootHcp })

  const [selectedSite, setSelectedSite] = useState<HealthcareParty | undefined>(sites?.[0])

  const { data: services, isLoading: isServicesLoading } = useGetHealthcarePartiesByParentQuery({ parentId: selectedSite?.id ?? '' }, { skip: skip || !selectedSite })
  const filteredServices = useMemo(() => (services && selectedSite ? services : []), [services, selectedSite])

  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(undefined)

  const { data: agenda, isLoading: isAgendaLoading } = useGetAgendaByAuthorId({ skip: !selectedService, authorId: selectedService?.id ?? '' })
  const filteredAgenda = useMemo(() => (agenda && selectedService ? agenda : undefined), [agenda, selectedService])

  const { data: procedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesQuery({ agendaId: filteredAgenda?.id ?? '' }, { skip: skip || !filteredAgenda || !selectedService })
  const filteredProcedures = useMemo(() => (procedures && filteredAgenda ? procedures : []), [procedures, filteredAgenda])

  const isSitesRelatedLoading = useMemo(() => isSitesLoading || isRootHcpLoading, [isSitesLoading, isRootHcpLoading])
  const isServicesRelatedLoading = useMemo(() => isSitesRelatedLoading || isServicesLoading, [isSitesRelatedLoading, isServicesLoading])
  const isProceduresRelatedLoading = useMemo(() => isServicesRelatedLoading || isProceduresLoading, [isServicesRelatedLoading, isProceduresLoading])

  const [selectedProcedure, setSelectedProcedure] = useState<CalendarItemType | undefined>(undefined)

  const { data: allHcps } = useGetHealthcarePartiesQuery(undefined, {
    skip: !user,
  })
  useEffect(() => console.log('allHcps', allHcps), [allHcps])

  useEffect(() => setSelectedService(undefined), [services])
  useEffect(() => setSelectedProcedure(undefined), [procedures])

  useEffect(() => {
    if (!selectedSite && sites?.length) {
      setSelectedSite(sites[0])
    }
  }, [sites])

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
  }, [calendarRef, setCalendarDate])

  const wrapperStyle: React.CSSProperties = {
    width: 400,
    border: `1px solid #D9D9D9`,
    borderRadius: 0,
  }

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        {/* <div className="svg-background" /> */}
        <div className="left-panel">
          <Card className="card">
            <div className="SiteSelectorRow">
              <SiteSelector sites={sites ?? []} isSitesLoading={isSitesRelatedLoading} setSelectedSite={setSelectedSite} selectedSite={selectedSite} />
              <Space>
                <Tooltip title={t('content.organize_hierarchy')}>
                  <Button icon={<ApartmentOutlined />} onClick={() => setSettingsModalOpen(true)} aria-label="Organize Hierarchy" />
                </Tooltip>
                <Tooltip title={t('content.manage_planning')}>
                  <Button icon={<ScheduleOutlined />} onClick={() => setSchedulingModalOpen(true)} aria-label="Manage Planning" />
                </Tooltip>
              </Space>
            </div>
          </Card>
          <div style={{ ...wrapperStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', zIndex: '1' }}>
            <AntCalendar fullscreen={false} value={dayjs(calendarDate)} onChange={handleAntCalendarDateChange} />
          </div>
          <ServiceSelector services={filteredServices} isServicesLoading={isServicesRelatedLoading} selectedService={selectedService} setSelectedService={setSelectedService} />
          <ProcedureSelector procedures={filteredProcedures} isProceduresLoading={isProceduresRelatedLoading} selectedProcedure={selectedProcedure} setSelectedProcedure={setSelectedProcedure} />
        </div>
        <div className="right-panel">
          <Calendar
            calendarRef={calendarRef}
            handleFullCalendarDateChange={handleFullCalendarDateChange}
            selectedAgenda={agenda}
            procedures={procedures}
            selectedProcedure={selectedProcedure}
            calendarDate={calendarDate}
            sites={sites}
          />
        </div>
      </div>
      {settingsModalOpen &&
        createPortal(
          <SettingContextProvider selectedSite={selectedSite} rootHcp={rootHcp}>
            <ModalHierarchySettings isVisible={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
          </SettingContextProvider>,
          document.body,
        )}
      {schedulingModalOpen && createPortal(<ModalScheduling isVisible={schedulingModalOpen} onClose={() => setSchedulingModalOpen(false)} services={filteredServices} />, document.body)}
    </div>
  )
}

import { SettingOutlined } from '@ant-design/icons'
import { DatesSetArg } from '@fullcalendar/core'
import '@fullcalendar/core/locales/de'
import '@fullcalendar/core/locales/fr'
import '@fullcalendar/core/locales/nl'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { Calendar as AntCalendar, Button, Tooltip } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/common/Header'
import { ProcedureSelector } from '../../components/DemarcheSelector'
import { ModalScheduling } from '../../components/ModalScheduling'
import { ModalSettings } from '../../components/ModalSettings'
import { ServiceSelector } from '../../components/ServiceSelector'
import { SiteSelector } from '../../components/SiteSelector'
import { SettingContextProvider } from '../../contexts/SettingContext'
import { useGetAgendaByAuthorId } from '../../core/api/agendaApi'
import { useGetCalendarItemTypesQuery } from '../../core/api/calendarItemTypeApi'
import {
  useDeleteHealthcarePartyMutation,
  useGetHealthcarePartiesByIdsQuery,
  useGetHealthcarePartiesByParentQuery,
  useGetHealthcarePartiesQuery,
  useGetRootHealthcareParty,
  useSilentUnDeleteHealthcarePartyMutation,
  useUnDeleteHealthcarePartyByIdMutation,
} from '../../core/api/healthcarePartyApi'
import { useAppSelector } from '../../core/hooks'
import './index.css'
import { useCreateUpdateUserMutation, useGetUserByEmailQuery } from '../../core/api/userApi'

export default function DashboardPage() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [schedulingModalOpen, setSchedulingModalOpen] = useState<boolean>(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const calendarRef = useRef<FullCalendar | null>(null)
  const user = useAppSelector((state) => state.cardinalApi.user)
  const skip = !user
  const { t, i18n } = useTranslation()

  const { data: hcps } = useGetHealthcarePartiesByIdsQuery([user?.healthcarePartyId ?? '', 'd3927cfe-6a86-4dbe-a70c-12af9b8daa9e'])
  const [createUpdateUser, { isError: isCreateUpdateUserError, isSuccess: isCreateUpdateUserSuccess, isLoading: isCreateUpdateUserLoading }] = useCreateUpdateUserMutation()

  useEffect(() => console.log('current user', user), [user])
  useEffect(() => console.log('current hcp', hcps), [hcps])

  const { data: rootHcp, isLoading: isRootHcpLoading } = useGetRootHealthcareParty({ skip: skip })

  const { data: allHcps } = useGetHealthcarePartiesQuery(undefined, {
    skip: !user,
  })

  useEffect(() => console.log('rootHcp', rootHcp), [rootHcp])
  useEffect(() => console.log('allHcps', allHcps), [allHcps])

  const { data: sites, isLoading: isSitesLoading } = useGetHealthcarePartiesByParentQuery({ skip: skip || !rootHcp, parentId: rootHcp?.id ?? '' })

  const [selectedSite, setSelectedSite] = useState<HealthcareParty | undefined>(sites?.[0])

  const { data: services, isLoading: isServicesLoading } = useGetHealthcarePartiesByParentQuery({ skip: skip || !selectedSite, parentId: selectedSite?.id ?? '' })
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(services?.[0])

  const { data: agenda, isLoading: isAgendaLoading } = useGetAgendaByAuthorId({ skip: !selectedService, authorId: selectedService?.id ?? '' })

  const { data: procedures, isLoading: isProceduresLoading } = useGetCalendarItemTypesQuery({ skip: skip || !agenda || !selectedService, agendaId: agenda?.id ?? '' })

  const isSitesRelatedLoading = useMemo(() => isSitesLoading || isRootHcpLoading, [isSitesLoading, isRootHcpLoading])
  const isServicesRelatedLoading = useMemo(() => isSitesRelatedLoading || isServicesLoading, [isSitesRelatedLoading, isServicesLoading])
  const isProceduresRelatedLoading = useMemo(() => isServicesRelatedLoading || isProceduresLoading, [isServicesRelatedLoading, isProceduresLoading])

  const [selectedProcedure, setSelectedProcedure] = useState<CalendarItemType | undefined>(procedures?.[0])

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

  const handleFullCalendarDateChange = useCallback(
    (value: DatesSetArg) => {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi) {
        const currentDate = calendarApi.getDate()
        setCalendarDate(currentDate)
      }
    },
    [calendarRef, setCalendarDate],
  )

  const wrapperStyle: React.CSSProperties = {
    width: 400,
    border: `1px solid #D9D9D9`,
    borderRadius: 0,
  }

  return (
    <div className="Dashboard">
      <Header />
      <div className="Panel">
        <div className="svg-background" />
        <div className="LeftPanel">
          <div className="SiteSelectorRow">
            <SiteSelector sites={sites ?? []} isSitesLoading={isSitesRelatedLoading} setSelectedSite={setSelectedSite} selectedSite={selectedSite} />
            <Tooltip title={t('content.settings')}>
              <Button icon={<SettingOutlined />} onClick={() => setSettingsModalOpen(true)} style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 'x-large' }} />
            </Tooltip>
            <Button
              onClick={() => {
                console.log('clicked do things')
                if (user) {
                  console.log('user')
                  createUpdateUser({ ...user, healthcarePartyId: 'd3927cfe-6a86-4dbe-a70c-12af9b8daa9e' })
                }
              }}
            >
              Do things
            </Button>
          </div>
          <div style={{ ...wrapperStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', zIndex: '1' }}>
            <AntCalendar fullscreen={false} value={dayjs(calendarDate)} onChange={handleAntCalendarDateChange} />
          </div>
          <ServiceSelector services={services ?? []} isServicesLoading={isServicesRelatedLoading} selectedService={selectedService} setSelectedService={setSelectedService} />
          <ProcedureSelector procedures={procedures ?? []} isProceduresLoading={isProceduresRelatedLoading} selectedProcedure={selectedProcedure} setSelectedProcedure={setSelectedProcedure} />
        </div>
        <div className="RightPanel">
          <FullCalendar
            ref={calendarRef}
            locale={i18n.language}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek myCustomButton',
            }}
            buttonText={{
              today: t('content.today'),
              timeGridDay: t('content.day'),
              timeGridWeek: t('content.week'),
            }}
            customButtons={{
              myCustomButton: {
                text: t('content.scheduling'),
                hint: 'View the scheduling',
                click: () => {
                  setSchedulingModalOpen(true)
                },
              },
            }}
            initialView="timeGridWeek"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={false}
            height="90%"
            events={[
              { title: 'event 1', date: '2025-04-14' },
              { title: 'event 2', date: '2019-04-15' },
            ]}
            datesSet={handleFullCalendarDateChange}
          />
        </div>
      </div>
      {settingsModalOpen &&
        createPortal(
          <SettingContextProvider selectedSite={selectedSite} rootHcp={rootHcp}>
            <ModalSettings isVisible={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
          </SettingContextProvider>,
          document.body,
        )}
      {schedulingModalOpen && createPortal(<ModalScheduling isVisible={schedulingModalOpen} onClose={() => setSchedulingModalOpen(false)} services={services ?? []} />, document.body)}
    </div>
  )
}

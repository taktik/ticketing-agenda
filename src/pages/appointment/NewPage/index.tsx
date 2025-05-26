import './index.css'
import React, { useEffect, useMemo } from 'react'
import mouscronLogo from '../../../assets/mouscronLogo.png'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../../components/common/LanguageSelector'
import { Divider } from 'antd'
import { useGetAllServiceBySiteId, useGetHealthcarePartiesByParentQuery, useGetHealthcarePartiesQuery, useGetRootHealthcareParty } from '../../../core/api/healthcarePartyApi'
import { useGetAllAgendaByAuthorIds } from '../../../core/api/agendaApi'
import { useGetCalendarItemTypesForMultipleAgendasQuery } from '../../../core/api/calendarItemTypeApi'
import { useAppSelector } from '../../../core/hooks'

export default function NewPage() {
  const { t, i18n } = useTranslation()

  const appState = useAppSelector((state) => state.app)
  const { data: all } = useGetHealthcarePartiesQuery(undefined)
  const { data: rootHcp } = useGetRootHealthcareParty({ skip: !appState })
  const { data: sites } = useGetHealthcarePartiesByParentQuery({ skip: !rootHcp, parentId: rootHcp?.id ?? '' })
  const sitesIds = useMemo(() => (sites ?? []).map((site) => site.id), [sites])

  const { data: services } = useGetAllServiceBySiteId({ skip: !rootHcp || !sitesIds || sitesIds.length === 0, sitesIds: sitesIds ?? [] })
  const servicesIds = useMemo(() => (services ?? []).map((service) => service.id), [services])

  const { data: agendas } = useGetAllAgendaByAuthorIds({ skip: !rootHcp || !services || servicesIds.length === 0, authorIds: servicesIds })
  const agendaIds = useMemo(() => (services ?? []).map((service) => service.id), [services])

  const { data: procedures } = useGetCalendarItemTypesForMultipleAgendasQuery({ skip: !rootHcp || !services || !agendas || agendaIds.length === 0, agendaIds: agendaIds })

  return (
    <div className="new-appointment">
      <header className="header-appointment">
        <div className="logo">
          <img src={mouscronLogo} alt="mouscron logo" />
        </div>
        <p className="title-appointment">Demande de rendez-vous</p>
        <div className="language-selector">
          <LanguageSelector />
        </div>
      </header>
      <Divider style={{ borderTop: '2px solid #e30613', width: '80%', margin: 0 }} />

      <div className="content-appointment">
        Mon selecteur
        <Divider style={{ borderTop: '2px solid #e30613', width: '80%' }} />
      </div>
    </div>
  )
}

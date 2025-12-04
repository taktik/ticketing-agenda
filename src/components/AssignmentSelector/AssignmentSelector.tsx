import { Agenda, HealthcareParty } from '@icure/cardinal-sdk'
import { Select } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Assignment } from '../ModalGeneralSettings/Settings/ManageUsers'

interface AssignmentSelectProps {
  value?: Assignment[]
  onChange?: (value: Assignment[]) => void
  sites: HealthcareParty[]
  agendas: Agenda[]
  isSitesLoading: boolean
  isAgendasLoading: boolean
}

export const AssignmentSelector: React.FC<AssignmentSelectProps> = ({ value, onChange, sites, agendas, isSitesLoading, isAgendasLoading }: AssignmentSelectProps) => {
  const { t } = useTranslation()

  const siteAndAgendaOptions = useMemo(() => {
    if (!sites || !agendas) return []

    const siteNameMap = new Map(sites.map((site) => [site.id, site.name]))

    return agendas.map((agenda) => {
      const siteName = agenda.author ? siteNameMap.get(agenda.author) || 'Unknown Site' : 'Unknown Site'
      const serviceLabel = agenda.name ?? 'Unknown Service'

      return {
        label: `${siteName} - ${serviceLabel}`,
        value: `${agenda.author}:${agenda.id}`,
      }
    })
  }, [agendas, sites])

  const handleSelectChange = (selectedValues: string[]) => {
    if (onChange) {
      const newAssignments = selectedValues.map((val) => {
        const [siteId, agendaId] = val.split(':')
        return { siteId, agendaId }
      })
      onChange(newAssignments)
    }
  }

  const selectValue = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.filter((v) => v.siteId && v.agendaId).map((v) => `${v.siteId}:${v.agendaId}`)
    }
    return []
  }, [value])

  return (
    <Select
      value={selectValue}
      onChange={handleSelectChange}
      style={{ width: '100%' }}
      options={siteAndAgendaOptions}
      placeholder={t('content.select_an_assignment')}
      showSearch
      optionFilterProp="label"
      allowClear
      loading={isSitesLoading || isAgendasLoading}
      mode="multiple"
      maxTagCount="responsive"
    />
  )
}

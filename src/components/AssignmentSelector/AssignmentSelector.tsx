import { Agenda, HealthcareParty } from '@icure/cardinal-sdk'
import { Select } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export interface AssignmentValue {
  siteId: string | undefined
  agendaId: string | undefined
}

interface AssignmentSelectProps {
  value?: AssignmentValue[]
  onChange?: (value: AssignmentValue[]) => void
  sites: HealthcareParty[]
  agendas: Agenda[]
  isSitesLoading: boolean
  isAgendasLoading: boolean
}

export const AssignmentSelector: React.FC<AssignmentSelectProps> = ({ value, onChange, sites, agendas, isSitesLoading, isAgendasLoading }: AssignmentSelectProps) => {
  const { t } = useTranslation()

  const options = useMemo(() => {
    if (!sites || !agendas) return []

    const siteNameMap = new Map(sites.map((site) => [site.id, site.name]))

    return agendas
      .map((agenda) => {
        const siteName = (agenda.author ? siteNameMap.get(agenda.author) : null) || t('content.unknown_site')
        const serviceLabel = agenda.name ?? t('content.unknown_service')
        const label = `${siteName} - ${serviceLabel}`

        return {
          label: label,
          value: `${agenda.author ?? 'null'}:${agenda.id}`,
          sortLabel: label.toLowerCase(),
        }
      })
      .sort((a, b) => a.sortLabel.localeCompare(b.sortLabel))
  }, [agendas, sites, t])

  const handleSelectChange = useCallback(
    (selectedStrings: string[]) => {
      if (onChange) {
        const newAssignments = selectedStrings.map((val) => {
          const [siteIdRaw, agendaId] = val.split(':')
          const siteId = siteIdRaw === 'null' ? undefined : siteIdRaw
          return { siteId, agendaId }
        })
        onChange(newAssignments)
      }
    },
    [onChange],
  )

  const selectValue = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.filter((v) => v.agendaId).map((v) => `${v.siteId ?? 'null'}:${v.agendaId}`)
    }
    return []
  }, [value])

  return (
    <Select
      mode="multiple"
      style={{ width: '100%' }}
      placeholder={t('content.select_an_assignment')}
      value={selectValue}
      onChange={handleSelectChange}
      options={options}
      allowClear
      showSearch
      optionFilterProp="label"
      maxTagCount="responsive"
      loading={isSitesLoading || isAgendasLoading}
    />
  )
}

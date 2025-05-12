import { HealthcareParty } from '@icure/cardinal-sdk'
import { Select as AntSelect, message, notification } from 'antd'
import React, { ReactElement, useEffect, useMemo } from 'react'
import './index.css'
import { useTranslation } from 'react-i18next'

interface SiteSelectorProps {
  sites: HealthcareParty[]
  selectedSite: HealthcareParty | undefined
  setSelectedSite: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
}

export const SiteSelector = ({ sites, selectedSite, setSelectedSite }: SiteSelectorProps): ReactElement => {
  const { t } = useTranslation()

  const options = useMemo(
    () =>
      sites.map((site) => ({
        label: site.name,
        value: site.id,
      })),
    [sites],
  )

  useEffect(() => {
    if (selectedSite) {
      const selected = sites.find((site) => site.id === selectedSite.id)
      setSelectedSite(selected)
    }
  }, [sites])

  return (
    <div className="selectorRoot">
      <AntSelect
        allowClear
        showSearch
        style={{ width: '100%' }}
        placeholder={t('content.select_site')}
        optionFilterProp="label"
        labelInValue
        filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
        options={options}
        value={selectedSite ? { label: selectedSite.name, value: selectedSite.id } : undefined}
        onChange={(option) => {
          if (option && option.value) {
            const selected = sites.find((site) => site.id === option.value)
            setSelectedSite(selected)
          } else {
            setSelectedSite(undefined)
          }
        }}
      />
    </div>
  )
}

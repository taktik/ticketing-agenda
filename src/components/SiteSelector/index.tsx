import { HealthcareParty } from '@icure/cardinal-sdk'
import { Select as AntSelect } from 'antd'
import React, { ReactElement, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './index.less'

interface SiteSelectorProps {
  sites: HealthcareParty[]
  isSitesLoading: boolean
  selectedSite: HealthcareParty | undefined
  setSelectedSite: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
}

export const SiteSelector = ({ sites, isSitesLoading, selectedSite, setSelectedSite }: SiteSelectorProps): ReactElement => {
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
    if (selectedSite && sites) {
      const selected = sites.find((site) => site.id === selectedSite.id)
      if (selected && selected !== selectedSite) {
        setSelectedSite(selected)
      }
    }
  }, [sites, selectedSite, setSelectedSite])

  return (
    <div className="selector-root">
      <AntSelect
        allowClear
        showSearch
        placeholder={t('content.select_site')}
        optionFilterProp="label"
        labelInValue
        filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
        options={options}
        value={selectedSite ? { label: selectedSite.name, value: selectedSite.id } : undefined}
        onChange={(option) => {
          if (option && option.value && sites) {
            const selected = sites.find((site) => site.id === option.value)
            setSelectedSite(selected)
          } else {
            setSelectedSite(undefined)
          }
        }}
        loading={isSitesLoading}
      />
    </div>
  )
}

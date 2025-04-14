import React, { ReactElement } from 'react'
import { Select as AntSelect } from 'antd'

interface SiteSelectorProps {
  sites: string[]
  selectedSite: string
  setSelectedSite: React.Dispatch<React.SetStateAction<string>>
}

export const SiteSelector = ({ sites, selectedSite, setSelectedSite }: SiteSelectorProps): ReactElement => {
  const options = sites.map((opt) => ({ label: opt, value: opt }))

  return (
    <AntSelect
      showSearch
      style={{ width: '100%' }}
      placeholder="Search to Select"
      optionFilterProp="label"
      filterSort={(optionA, optionB) => (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())}
      options={options}
      onSelect={(value) => setSelectedSite(value)}
      value={selectedSite}
    />
  )
}

export default SiteSelector

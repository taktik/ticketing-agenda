import React, { ReactElement } from 'react'
import { Select as AntSelect, Button } from 'antd'
import { Agenda } from '@icure/cardinal-sdk'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import './index.css'

interface SiteSelectorProps {
  sites: Agenda[]
  selectedSite: Agenda | undefined
  setSelectedSite: React.Dispatch<React.SetStateAction<Agenda | undefined>>
}

export const SiteSelector = ({ sites, selectedSite, setSelectedSite }: SiteSelectorProps): ReactElement => {
  const options = sites.map((site) => ({
    label: site.name,
    value: site.id,
  }))

  return (
    <div className="selectorRoot">
      <AntSelect
        allowClear
        showSearch
        style={{ width: '100%' }}
        placeholder="Select a site"
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
      <Button type="primary" shape="circle" icon={<PlusOutlined />} />
      <Button type="primary" shape="circle" icon={<DeleteOutlined />} danger disabled={!selectedSite} />
    </div>
  )
}

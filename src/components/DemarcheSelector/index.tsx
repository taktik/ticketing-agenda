import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button } from 'antd'
import React, { ReactElement } from 'react'
import './index.css'

interface DemarcheSelectorProps {
  demarches: TimeTable[]
  selectedDemarche: TimeTable | undefined
  setSelectedDemarche: React.Dispatch<React.SetStateAction<TimeTable | undefined>>
}

export const DemarcheSelector = ({ demarches, selectedDemarche, setSelectedDemarche }: DemarcheSelectorProps): ReactElement => {
  const options = demarches.map((demarche) => ({
    label: demarche.name,
    value: demarche.id,
  }))

  return (
    <div className="selectorRoot">
      <AntSelect
        allowClear
        showSearch
        style={{ width: '100%' }}
        placeholder="Select a demarche"
        optionFilterProp="label"
        labelInValue
        filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
        options={options}
        value={selectedDemarche ? { label: selectedDemarche.name, value: selectedDemarche.id } : undefined}
        onChange={(option) => {
          if (option && option.value) {
            const selected = demarches.find((demarche) => demarche.id === option.value)
            setSelectedDemarche(selected)
          } else {
            setSelectedDemarche(undefined)
          }
        }}
      />
      <Button type="primary" shape="circle" icon={<PlusOutlined />} />
      <Button type="primary" shape="circle" icon={<DeleteOutlined />} danger disabled={!selectedDemarche} />
    </div>
  )
}

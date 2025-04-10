import Icon from '@ant-design/icons'
import { Button, Input } from 'antd'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { addIcn, uploadIcn } from '../../../../assets/CustomIcons'
import './index.css'
import { useDebounce } from '../../../../core/hooks'
import { breakpoints, getWindowSize } from '../../../../helpers/windowSize'
import { ModalImportPatients } from '../../modals/ModalImportPatients'
import { ModalPatientForm } from '../../modals/ModalPatientForm'

const { Search } = Input

interface ActionsPanelProps {
  onSearch: (value: string) => void
  onClear: () => void
}

export const ActionsPanel = ({ onSearch, onClear }: ActionsPanelProps) => {
  const [isPatientFormModalOpen, setPatientFormModalOpen] = useState(false)
  const [isImportPatientsModalOpen, setImportPatientsModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined)

  const debouncedSearchValue = useDebounce(searchValue, 300)

  useEffect(() => {
    if (debouncedSearchValue !== undefined) {
      onSearch(debouncedSearchValue)
    }
  }, [debouncedSearchValue])

  const { innerWidth } = getWindowSize()

  const getComponentsSize = () => {
    if (innerWidth < breakpoints.lg) {
      return 'middle'
    } else {
      return 'large'
    }
  }

  return (
    <>
      <div className="actionsPanel">
        <Search
          placeholder="Search by Name, postal code or tag"
          allowClear
          enterButton
          size={getComponentsSize()}
          onClear={onClear}
          onSearch={(value) => onSearch(value)}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Button type="primary" size={getComponentsSize()} onClick={() => setPatientFormModalOpen(true)}>
          <Icon component={addIcn} />
          {innerWidth > breakpoints.sm && <span>Add</span>}
        </Button>
        <Button type="primary" size={getComponentsSize()} onClick={() => setImportPatientsModalOpen(true)}>
          <Icon component={uploadIcn} />
          {innerWidth > breakpoints.sm && <span>Import</span>}
        </Button>
      </div>
      {isPatientFormModalOpen && createPortal(<ModalPatientForm mode="create" isVisible={isPatientFormModalOpen} onClose={() => setPatientFormModalOpen(false)} />, document.body)}
      {isImportPatientsModalOpen && createPortal(<ModalImportPatients isVisible={isImportPatientsModalOpen} onClose={() => setImportPatientsModalOpen(false)} />, document.body)}
    </>
  )
}

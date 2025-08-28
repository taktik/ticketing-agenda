import { Button, Divider, Spin, Typography } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'

interface SelectableItem {
  id?: string
  name?: string
}

interface ItemSelectorProps<T extends SelectableItem> {
  titleKey: string
  items: T[]
  isLoading: boolean
  selectedItem: T | undefined
  setSelectedItem: React.Dispatch<React.SetStateAction<T | undefined>>
  filterPredicate?: (item: T) => boolean
}

export const ItemSelector = <T extends SelectableItem>({ titleKey, items, isLoading, selectedItem, setSelectedItem, filterPredicate }: ItemSelectorProps<T>): React.ReactElement => {
  const { t } = useTranslation()

  const processedItems = useMemo(() => {
    const sourceItems = items ?? []
    const filteredItems = filterPredicate ? sourceItems.filter(filterPredicate) : sourceItems

    return [...filteredItems].sort((a, b) => {
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [items, filterPredicate])

  const handleSelectItemClick = useCallback(
    (item: T) => {
      const toSelect = item.id === selectedItem?.id ? undefined : item
      setSelectedItem(toSelect)
    },
    [selectedItem, setSelectedItem],
  )

  return (
    <div className="leftside-selector">
      <div className="leftside-selector-header">
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t(titleKey)}
        </Typography.Title>
      </div>

      <Divider style={{ margin: 0 }} />

      {isLoading ? (
        <div className="selector-spin">
          <Spin />
        </div>
      ) : (
        <div className="leftside-selector-content">
          {processedItems.map((item) => {
            const isSelected = selectedItem?.id === item.id
            return (
              <Button
                key={item.id}
                onClick={() => {
                  handleSelectItemClick(item)
                }}
                type={isSelected ? 'primary' : 'default'}
              >
                {item.name}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

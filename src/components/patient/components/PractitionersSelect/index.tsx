import { notification, Select, SelectProps, Spin } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { useFilterPractitionersByNameQuery } from '../../../../core/api/practitionerApi'

interface PractitionersSelectProps extends SelectProps<string | number> {
  value?: string | number
  onChange?: (value: string | number) => void
}

export const PractitionersSelect = ({ value, onChange }: PractitionersSelectProps) => {
  const [searchString, setSearchString] = useState<string>()
  const {
    data: practitioners,
    isFetching: practitionersListLoading,
    error,
  } = useFilterPractitionersByNameQuery(searchString ?? '', { skip: !searchString || searchString.length < 3 })
  const [api, contextHolder] = notification.useNotification()
  const notificationShown = useRef(false)

  useEffect(() => {
    if (error && !notificationShown.current) {
      openNotification()
      notificationShown.current = true // Mark notification as shown
    }
  }, [error])

  const openNotification = () => {
    api.open({
      type: 'error',
      message: 'Practitioners are not available.',
      description: 'Something went wrong',
      duration: 0,
    })
  }

  return (
    <>
      {contextHolder}
      <Select
        value={value}
        onChange={onChange}
        labelInValue
        filterOption={false}
        onSearch={(value) => setSearchString(value)}
        notFoundContent={practitionersListLoading ? <Spin size="small" /> : null}
        options={practitioners?.map((d) => ({ value: d.id, label: d.name ?? '' })) ?? []}
        mode="multiple"
        style={{ width: '100%' }}
        size="large"
        allowClear
        showSearch
        placeholder="Search by name"
        loading={practitionersListLoading}
      />
    </>
  )
}

import { notification, Select, SelectProps, Spin } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { useGetDevicesQuery } from '../../../../core/api/deviceApi'

interface DevicesSelectProps extends SelectProps<string | number> {
  value?: string | number
  onChange?: (value: string | number) => void
}

export const DevicesSelect = ({ value, onChange }: DevicesSelectProps) => {
  const { data: devices, isFetching: devicesListLoading, error, isError } = useGetDevicesQuery()
  const [displayedDevices, setDisplayedDevices] = useState<{ value: string; label: string }[]>([])
  const [searchString, setSearchString] = useState<string>()
  const [api, contextHolder] = notification.useNotification()
  const notificationShown = useRef(false)

  useEffect(() => {
    setDisplayedDevices(
      devices?.filter((x) => !searchString || x.name?.toLowerCase().includes(searchString.toLowerCase())).map((d) => ({ value: d.id, label: d.name ?? '' })) ?? [],
    )
    if (error && !notificationShown.current) {
      openNotification()
      notificationShown.current = true // Mark notification as shown
    }
  }, [devices, searchString, error])

  const openNotification = () => {
    api.open({
      type: 'error',
      message: 'Devices are not available.',
      description:
        "Please ensure you have the necessary permissions to manage devices. Go to the Cockpit and verify that the HCP user has the 'DEVICE_USER_MANAGER' role assigned.",
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
        notFoundContent={devicesListLoading ? <Spin size="small" /> : null}
        options={displayedDevices}
        mode="multiple"
        style={{ width: '100%' }}
        size="large"
        allowClear
        showSearch
        placeholder="All devices will be visible in the list"
        loading={devicesListLoading}
        disabled={isError}
      />
    </>
  )
}

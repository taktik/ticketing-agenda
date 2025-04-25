import React, { ReactElement, useCallback, useEffect, useMemo } from 'react'
import { Select as AntSelect, Button, notification, message, Tooltip, ConfigProvider } from 'antd'
import { Agenda } from '@icure/cardinal-sdk'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import './index.css'
import { useDeleteAgendaMutation } from '../../core/api/agendaApi'

interface SiteSelectorProps {
  sites: Agenda[]
  selectedSite: Agenda | undefined
  setSelectedSite: React.Dispatch<React.SetStateAction<Agenda | undefined>>
}

export const SiteSelector = ({ sites, selectedSite, setSelectedSite }: SiteSelectorProps): ReactElement => {
  const options = useMemo(
    () =>
      sites.map((site) => ({
        label: site.name,
        value: site.id,
      })),
    [sites],
  )

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  const [deleteAgenda, { isError, isSuccess, isLoading }] = useDeleteAgendaMutation()

  useEffect(() => {
    if (isLoading) showMessageFeedback('loading', 'The site is deleting...')
    if (isSuccess) showMessageFeedback('success', 'The site was deleted!')
    if (isError) openNotification('error', 'We could not delete the site!', `An error occurred while deleting the site.`)
  }, [isLoading, isSuccess, isError])

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
    </div>
  )
}

/*

 <Tooltip title="Delete the site">
        <Button
          type="primary"
          shape="circle"
          icon={<DeleteOutlined />}
          danger
          disabled={!selectedSite}
          onClick={() => {
            if (selectedSite) {
              deleteAgenda(selectedSite)
              setSelectedSite(undefined)
            }
          }}
        />
      </Tooltip>


*/

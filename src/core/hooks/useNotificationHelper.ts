import { notification } from 'antd'
import { useCallback } from 'react'

export const useNotificationHelper = (duration = 4) => {
  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = useCallback(
    (type: 'error' | 'success' | 'info' | 'warning', message: string, description = '') => {
      api.open({ type, message, description, duration })
    },
    [api, duration],
  )

  return { api, openNotification, notificationContextHolder }
}

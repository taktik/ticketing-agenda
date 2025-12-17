import { Space, Typography } from 'antd'
import { EventApi } from 'fullcalendar'
import { useMemo } from 'react'

interface EventContentProps {
  event: EventApi
  view: string
}

export const ListEventContent = ({ event }: EventContentProps) => {
  const qBetterConfirmationCode = useMemo(() => event.extendedProps?.qBetterConfirmationCode, [event])
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space direction="vertical" align="start" style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Typography.Text strong>{event.title}</Typography.Text>
        {qBetterConfirmationCode && <Typography.Text>{qBetterConfirmationCode}</Typography.Text>}
      </Space>
    </div>
  )
}

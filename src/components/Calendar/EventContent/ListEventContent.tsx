import { Space, Typography } from 'antd'
import { EventApi } from 'fullcalendar'

interface EventContentProps {
  event: EventApi
  view: string
}

export const ListEventContent = ({ event }: EventContentProps) => {
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space direction="vertical" align="start" style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Typography.Text strong>{event.title}</Typography.Text>
      </Space>
    </div>
  )
}

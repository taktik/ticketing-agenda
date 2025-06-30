import { Space, Typography } from 'antd'
import { EventApi } from 'fullcalendar'

interface EventContentProps {
  event: EventApi
  view: string
}

export const ListEventContent = ({ event, view }: EventContentProps) => {
  const email: string = event.extendedProps.email ?? ''
  const fullName: string = event.extendedProps.fullName ?? ''

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space direction="vertical" align="start" style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Typography.Text strong>{event.title}</Typography.Text>
        <Typography.Text strong>
          {fullName} - {email}
        </Typography.Text>
      </Space>
    </div>
  )
}

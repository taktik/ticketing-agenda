import { Typography } from 'antd'
import { EventApi } from 'fullcalendar'

interface EventContentProps {
  event: EventApi
}

export const GridEventContent = ({ event }: EventContentProps) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', gap: '4px' }}>
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          flexShrink: 0,
        }}
      />
      <Typography.Text ellipsis={true} style={{ fontSize: '12px' }}>
        {event.title}
      </Typography.Text>
    </div>
  )
}

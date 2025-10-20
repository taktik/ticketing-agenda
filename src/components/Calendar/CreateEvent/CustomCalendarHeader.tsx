import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Col, Row, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { Dispatch, SetStateAction, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
const { Title } = Typography

interface CustomHeaderProps {
  value: Dayjs
  onChange: (date: Dayjs) => void
  currentMonth: Dayjs
  setCurrentMonth: Dispatch<SetStateAction<dayjs.Dayjs>>
  minDate: dayjs.Dayjs
}

export const CustomCalendarHeader = ({ value, onChange, currentMonth, setCurrentMonth, minDate }: CustomHeaderProps) => {
  const { t } = useTranslation()
  const isPrevDisabled = useMemo(() => currentMonth.isSame(dayjs(), 'month'), [currentMonth])

  const handleMonthChange = useCallback(
    (proposedDate: Dayjs) => {
      if (proposedDate.isBefore(minDate)) {
        onChange(minDate)
        setCurrentMonth(minDate)
      } else {
        onChange(proposedDate)
        setCurrentMonth(proposedDate)
      }
    },
    [minDate, onChange, setCurrentMonth],
  )

  return (
    <div style={{ padding: '8px' }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {value.format('MMMM YYYY')}
          </Title>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => handleMonthChange(value.clone().subtract(1, 'month'))} disabled={isPrevDisabled}>
              <>
                {<LeftOutlined />} {t('content.previous')}
              </>
            </Button>
            <Button onClick={() => handleMonthChange(value.clone().add(1, 'month'))}>
              <>
                {t('content.next')} {<RightOutlined />}
              </>
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  )
}

import dayjs, { Dayjs } from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface OriginNodeProps {
  className: string
  children: React.ReactNode
}

interface CustomCellRenderProps {
  current: Dayjs
  info: { originNode: React.ReactElement }
  availabilities: dayjs.Dayjs[]
}

export const CustomCellRender = ({ current, info, availabilities }: CustomCellRenderProps) => {
  const { t } = useTranslation()
  const formattedDate = current.format('YYYY-MM-DD')
  const highlightedDates = useMemo(() => availabilities.map((d) => d.format('YYYY-MM-DD')), [availabilities])
  const defaultCellProps = info.originNode.props as OriginNodeProps

  if (highlightedDates.includes(formattedDate)) {
    return (
      <div
        className={defaultCellProps.className}
        style={{
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '6px',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {defaultCellProps.children}
      </div>
    )
  } else {
    return info.originNode
  }
}

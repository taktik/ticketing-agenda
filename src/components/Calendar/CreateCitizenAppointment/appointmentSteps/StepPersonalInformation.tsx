import { MailOutlined, UserOutlined } from '@ant-design/icons'
import { Form, Input, Select, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { FC, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './index.less'

const { Title } = Typography
const { Option } = Select

const flagPaths: Record<string, string> = {
  BE: 'M0,0h5v15H0zM5,0h5v15H5zM10,0h5v15H10z',
  FR: 'M0,0h5v15H0zM5,0h5v15H5zM10,0h5v15H10z',
  LU: 'M0,0h15v5H0zM0,5h15v5H0zM0,10h15v5H0z',
  NL: 'M0,0h15v5H0zM0,5h15v5H0zM0,10h15v5H0z',
  DE: 'M0,0h15v5H0zM0,5h15v5H0zM0,10h15v5H0z',
}

const flagColors: Record<string, string[]> = {
  BE: ['#000', '#FDDA24', '#EF3340'],
  FR: ['#002395', '#fff', '#ED2939'],
  LU: ['#EF3340', '#fff', '#00A1DE'],
  NL: ['#AE1C28', '#fff', '#21468B'],
  DE: ['#000', '#DD0000', '#FFCC00'],
}

const CountryFlag = ({ code }: { code: string }) => {
  const paths = (flagPaths[code] || '').split('z').filter(Boolean)
  const colors = flagColors[code] || []
  return (
    <svg width="20" height="15" viewBox="0 0 15 15" style={{ verticalAlign: 'middle', marginRight: 4 }}>
      {paths.map((d, i) => (
        <path key={i} d={d + 'z'} fill={colors[i] || '#ccc'} />
      ))}
    </svg>
  )
}

interface BirthdayInputProps {
  value?: Dayjs
  onChange?: (date: Dayjs | null) => void
}

const BirthdayInput: FC<BirthdayInputProps> = ({ value, onChange }) => {
  const { t } = useTranslation()
  const day = value?.date()
  const month = value?.month()
  const year = value?.year()

  const handleDayChange = useCallback(
    (newDay: number) => {
      const base = value ?? dayjs().month(0).date(1)
      const newDate = base.date(newDay)
      onChange?.(newDate.isValid() ? newDate : null)
    },
    [value, onChange],
  )

  const handleMonthChange = useCallback(
    (newMonth: number) => {
      const base = value ?? dayjs().month(0).date(1)
      let newDate = base.month(newMonth)
      const daysInNewMonth = newDate.daysInMonth()
      if (base.date() > daysInNewMonth) {
        newDate = newDate.date(daysInNewMonth)
      }
      onChange?.(newDate.isValid() ? newDate : null)
    },
    [value, onChange],
  )

  const handleYearChange = useCallback(
    (newYear: number) => {
      const base = value ?? dayjs().month(0).date(1)
      let newDate = base.year(newYear)
      const daysInNewMonth = newDate.daysInMonth()
      if (base.date() > daysInNewMonth) {
        newDate = newDate.date(daysInNewMonth)
      }
      onChange?.(newDate.isValid() ? newDate : null)
    },
    [value, onChange],
  )

  const daysInMonth = useMemo(() => (value ? value.daysInMonth() : 31), [value])
  const years = useMemo(() => Array.from({ length: 150 }, (_, i) => dayjs().year() - i), [])

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: dayjs().month(i).format('MMMM'),
      })),
    [],
  )

  return (
    <Space.Compact style={{ width: '50%' }}>
      <Select aria-label={t('content.day')} size="large" placeholder={t('content.day')} value={day} onChange={handleDayChange} style={{ width: '25%' }}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <Option key={d} value={d}>
            {d}
          </Option>
        ))}
      </Select>
      <Select aria-label={t('content.month')} size="large" placeholder={t('content.month')} value={month} onChange={handleMonthChange} style={{ width: '45%' }}>
        {months.map((m) => (
          <Option key={m.value} value={m.value}>
            {m.label}
          </Option>
        ))}
      </Select>
      <Select aria-label={t('content.year')} size="large" placeholder={t('content.year')} value={year} onChange={handleYearChange} style={{ width: '30%' }}>
        {years.map((y) => (
          <Option key={y} value={y}>
            {y}
          </Option>
        ))}
      </Select>
    </Space.Compact>
  )
}

export const StepPersonalInformation: FC = () => {
  const { t } = useTranslation()

  const formItemLayout = useMemo(
    () => ({
      labelCol: { style: { width: '175px' } },
      wrapperCol: { span: 24 },
    }),
    [],
  )

  const phoneValidator = useCallback(
    async (_: unknown, value: string | number | null) => {
      if (!value) return Promise.resolve()
      const length = String(value).length
      if (length < 8) return Promise.reject(new Error(t('content.phone_min_8_digits')))
      if (length > 11) return Promise.reject(new Error(t('content.phone_max_11_digits')))
      return Promise.resolve()
    },
    [t],
  )

  return (
    <>
      <Title level={4}>{t('content.your_information_title')}</Title>
      <div className="your-info">
        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'firstName']} label={t('content.firstname')} rules={[{ required: true, type: 'string' }]} layout="horizontal">
          <Input size="large" placeholder="Phil" prefix={<UserOutlined />} />
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'lastName']} label={t('content.lastname')} rules={[{ required: true, type: 'string' }]} layout="horizontal">
          <Input size="large" placeholder="Defer" prefix={<UserOutlined />} />
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" label={t('content.phone_number')} required layout="horizontal">
          <Space.Compact>
            <Form.Item name={['personalInfo', 'countryCode']} noStyle rules={[{ required: true, type: 'string' }]}>
              <Select aria-label="Country code" style={{ width: 120 }} size="large">
                <Option value="+32">
                  <CountryFlag code="BE" /> +32
                </Option>
                <Option value="+33">
                  <CountryFlag code="FR" /> +33
                </Option>
                <Option value="+352">
                  <CountryFlag code="LU" /> +352
                </Option>
                <Option value="+31">
                  <CountryFlag code="NL" /> +31
                </Option>
                <Option value="+49">
                  <CountryFlag code="DE" /> +49
                </Option>
              </Select>
            </Form.Item>
            <Form.Item
              name={['personalInfo', 'phoneNumber']}
              noStyle
              rules={[{ required: true, message: t('content.select_phone_number_prompt') }, { pattern: /^\d+$/, message: t('content.phone_must_be_number') }, { validator: phoneValidator }]}
            >
              <Input size="large" placeholder="470123456" style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'language']} label={t('content.language')} rules={[{ required: true, type: 'string' }]} layout="horizontal">
          <Select aria-label={t('content.language')} style={{ width: 120 }} size="large">
            <Option value="Français">Français</Option>
            <Option value="Nederlands">Nederlands</Option>
          </Select>
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'birthDate']} label={t('content.birth_date')} rules={[{ required: true }]} layout="horizontal">
          <BirthdayInput />
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'email']} label={t('content.email_address')} rules={[{ required: true, type: 'email' }]} layout="horizontal">
          <Input size="large" placeholder="email@example.com" prefix={<MailOutlined />} />
        </Form.Item>
      </div>
    </>
  )
}

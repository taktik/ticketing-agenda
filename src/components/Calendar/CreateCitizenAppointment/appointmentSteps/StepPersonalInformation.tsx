import { MailOutlined, UserOutlined } from '@ant-design/icons'
import { Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { FC, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'

const { Title } = Typography
const { Option } = Select

interface BirthdayInputProps {
  value?: Dayjs
  onChange?: (date: Dayjs | null) => void
}

const BirthdayInput: FC<BirthdayInputProps> = ({ value, onChange }) => {
  const day = value?.date()
  const month = value?.month()
  const year = value?.year()

  const handleDayChange = useCallback(
    (newDay: number) => {
      const newDate = (value || dayjs()).date(newDay)
      onChange?.(newDate.isValid() ? newDate : null)
    },
    [value, onChange],
  )

  const handleMonthChange = useCallback(
    (newMonth: number) => {
      const oldDate = value || dayjs()
      const daysInNewMonth = oldDate.month(newMonth).daysInMonth()
      let newDate = oldDate.month(newMonth)
      if ((oldDate.date() || 0) > daysInNewMonth) {
        newDate = newDate.date(daysInNewMonth)
      }
      onChange?.(newDate.isValid() ? newDate : null)
    },
    [value, onChange],
  )

  const handleYearChange = useCallback(
    (newYear: number) => {
      const oldDate = value || dayjs()
      let newDate = oldDate.year(newYear)
      if (!newDate.isSame(oldDate, 'month')) {
        newDate = newDate.date(1)
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
      <Select size="large" placeholder="Day" value={day} onChange={handleDayChange} style={{ width: '25%' }}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <Option key={d} value={d}>
            {d}
          </Option>
        ))}
      </Select>
      <Select size="large" placeholder="Month" value={month} onChange={handleMonthChange} style={{ width: '45%' }}>
        {months.map((m) => (
          <Option key={m.value} value={m.value}>
            {m.label}
          </Option>
        ))}
      </Select>
      <Select size="large" placeholder="Year" value={year} onChange={handleYearChange} style={{ width: '30%' }}>
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
        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'firstName']} label={t('content.firstname')} rules={[{ required: true, type: 'string' }]}>
          <Input size="large" placeholder="Phil" prefix={<UserOutlined />} />
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'lastName']} label={t('content.lastname')} rules={[{ required: true, type: 'string' }]}>
          <Input size="large" placeholder="Defer" prefix={<UserOutlined />} />
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" label={t('content.phone_number')} required>
          <Space.Compact>
            <Form.Item name={['personalInfo', 'countryCode']} noStyle rules={[{ required: true, type: 'string' }]}>
              <Select style={{ width: 120 }} size="large">
                <Option value="+32">🇧🇪 +32</Option>
                <Option value="+33">🇫🇷 +33</Option>
                <Option value="+352">🇱🇺 +352</Option>
                <Option value="+31">🇳🇱 +31</Option>
                <Option value="+49">🇩🇪 +49</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name={['personalInfo', 'phoneNumber']}
              noStyle
              rules={[{ required: true, message: t('content.select_phone_number_prompt') }, { type: 'number', message: t('content.phone_must_be_number') }, { validator: phoneValidator }]}
            >
              <InputNumber size="large" placeholder="470 12 34 56" style={{ width: '100%' }} controls={false} />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'language']} label={t('content.language')} rules={[{ required: true, type: 'string' }]}>
          <Select style={{ width: 120 }} size="large">
            <Option value="Français">Français</Option>
            <Option value="Nederlands">Nederlands</Option>
          </Select>
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'birthDate']} label={t('content.birth_date')} rules={[{ required: true }]}>
          <BirthdayInput />
        </Form.Item>

        <Form.Item {...formItemLayout} labelAlign="left" name={['personalInfo', 'email']} label={t('content.email_address')} rules={[{ required: true, type: 'email' }]}>
          <Input size="large" placeholder="email@example.com" prefix={<MailOutlined />} />
        </Form.Item>
      </div>
    </>
  )
}

import { Select, Space } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import flagFrance from '../../../assets/flag_france.png'
import flagGermany from '../../../assets/flag_germany.png'
import flagUK from '../../../assets/flag_kingdom_united.png'
import flagDutch from '../../../assets/flag_netherlands.png'

interface LanguageOption {
  code: string
  name: string
  FlagComponent: string
}

const languageOptionsData: LanguageOption[] = [
  { code: 'en', name: 'English', FlagComponent: flagUK },
  { code: 'fr', name: 'Français', FlagComponent: flagFrance },
  { code: 'de', name: 'Deutsch', FlagComponent: flagGermany },
  { code: 'nl', name: 'Nederlands', FlagComponent: flagDutch },
]

export const LanguageSelector = () => {
  const { i18n } = useTranslation()

  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language)

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value)
    setCurrentLanguage(value)
  }

  return (
    <Select value={currentLanguage} onChange={handleLanguageChange} style={{ width: 150 }} aria-label="Select language" optionLabelProp="label">
      {languageOptionsData.map((lang) => (
        <Select.Option
          key={lang.code}
          value={lang.code}
          label={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={lang.FlagComponent}
                alt={`${lang.name} flag`}
                style={{
                  width: '20px',
                  height: '15px',
                  marginRight: '8px',
                  verticalAlign: 'middle',
                }}
              />
              <span style={{ verticalAlign: 'middle' }}>{lang.name}</span>
            </div>
          }
        >
          <Space size="small" align="center">
            <img src={lang.FlagComponent} alt={`${lang.name} flag`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }} />
            <span>{lang.name}</span>
          </Space>
        </Select.Option>
      ))}
    </Select>
  )
}

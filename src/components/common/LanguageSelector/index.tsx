import React, { useMemo, useState } from 'react'
import flagUK from '../../../assets/flag_kingdom_united.png'
import flagFrance from '../../../assets/flag_france.png'
import flagDutch from '../../../assets/flag_netherlands.png'
import flagGermany from '../../../assets/flag_germany.png'
import { useTranslation } from 'react-i18next'
import { Select, Space } from 'antd'

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
    console.log('i 18n lang', i18n.language)
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
                  border: '0.5px solid #eee',
                  marginRight: '8px',
                  verticalAlign: 'middle',
                }}
              />
              <span style={{ verticalAlign: 'middle' }}>{lang.name}</span>
            </div>
          }
        >
          <Space size="small" align="center">
            <img src={lang.FlagComponent} alt={`${lang.name} flag`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', border: '0.5px solid #eee' }} />
            <span>{lang.name}</span>
          </Space>
        </Select.Option>
      ))}
    </Select>
  )
}

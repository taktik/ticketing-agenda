import { Select, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import flagFrance from '../../../assets/flag_france.png'
import flagGermany from '../../../assets/flag_germany.png'
import flagUK from '../../../assets/flag_kingdom_united.png'
import flagDutch from '../../../assets/flag_netherlands.png'
import './index.less'

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

  return (
    <Select value={i18n.language} onChange={(value) => i18n.changeLanguage(value)} aria-label="Select language" optionLabelProp="label" className="language-selector">
      {languageOptionsData.map((lang) => (
        <Select.Option
          key={lang.code}
          value={lang.code}
          label={
            <div className="language-item">
              <img src={lang.FlagComponent} alt={`${lang.name} flag`} className="language-flag-small" />
              <span className="language-name">{lang.name}</span>
            </div>
          }
        >
          <Space size="small" align="center">
            <img src={lang.FlagComponent} alt={`${lang.name} flag`} className="language-flag" />
            <span>{lang.name}</span>
          </Space>
        </Select.Option>
      ))}
    </Select>
  )
}

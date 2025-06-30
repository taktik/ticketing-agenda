import React from 'react'
import './index.css'
import { useTranslation } from 'react-i18next'

interface KerberusWidgetProps {
  progress: number
}

export const KerberusWidget: React.FC<KerberusWidgetProps> = ({ progress }) => {
  const { t } = useTranslation()

  return (
    <div className="KerberusWidget">
      <p>{t('content.captcha_check_hold_on')}</p>
      <div className="KerberusWidget__progress" style={{ width: `${progress}%` }}></div>
    </div>
  )
}

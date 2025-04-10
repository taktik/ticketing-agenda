import React from 'react'
import './index.css'

interface KerberusWidgetProps {
  progress: number
}

export const KerberusWidget: React.FC<KerberusWidgetProps> = ({ progress }) => {
  return (
    <div className="KerberusWidget">
      {/*<p>Un instant, juste une vérification CAPTCHA...</p>*/}
      <p>Hold on, just a quick CAPTCHA check...</p>
      <div className="KerberusWidget__progress" style={{ width: `${progress}%` }}></div>
    </div>
  )
}

import { InteractionStatus } from '@azure/msal-browser'
import { useMsal } from '@azure/msal-react'
import { createSelector } from '@reduxjs/toolkit'
import { Card, Spin } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import defaultLogo from '../../../assets/mouscronLogo.png'
import { LOGO_URL } from '../../../constants'
import { useAppSelector } from '../../../core/hooks'
import { CardinalApiState } from '../../../core/services/auth.api'
import AzureLogin from '../AzureLogin'
import EmailLogin from '../EmailLogin'
import { SpinLoader } from '../../../components/common/SpinLoader'

const selectRestApiData = (state: { cardinalApi: CardinalApiState }) => state.cardinalApi

const combinedSelector = createSelector([selectRestApiData], (cardinalApi: CardinalApiState) => ({
  azureLoginProcessStarted: cardinalApi.azureLoginProcessStarted,
  autoLoginProcessStarted: cardinalApi.autoLoginProcessStarted,
  emailLoginProcessStarted: cardinalApi.emailLoginProcessStarted,
}))

export default function LoginPage() {
  const { t } = useTranslation()
  const { inProgress } = useMsal()
  const { azureLoginProcessStarted, autoLoginProcessStarted, emailLoginProcessStarted } = useAppSelector(combinedSelector)
  const isLoading = useMemo(
    () => inProgress === InteractionStatus.Startup || inProgress === InteractionStatus.HandleRedirect || azureLoginProcessStarted || autoLoginProcessStarted || emailLoginProcessStarted,
    [inProgress, azureLoginProcessStarted, autoLoginProcessStarted, emailLoginProcessStarted],
  )

  return (
    <>
      {isLoading && <SpinLoader />}
      <div className="auth-page">
        <div className="auth-page__logo">
          <img src={LOGO_URL ?? defaultLogo} alt="logo" />
        </div>
        <Card className="login-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <EmailLogin />
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '5px 0' }} />
            <AzureLogin />
          </div>
        </Card>
      </div>
    </>
  )
}

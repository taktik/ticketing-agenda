import { Card } from 'antd'
import logo from '../../../assets/mouscronLogo.png'
import AzureLogin from '../AzureLogin'
import EmailLogin from '../EmailLogin'
import { useIsAuthenticated } from '@azure/msal-react'

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated()
  return (
    <>
      <div className="auth-page">
        <div className="auth-page__logo">
          <img src={logo} alt="Mouscron logo" />
        </div>
        <Card className="login-card">
          <EmailLogin />
          <AzureLogin />
        </Card>
        {isAuthenticated && 'AUTHENTICATED THORUG AZURE'}
      </div>
    </>
  )
}

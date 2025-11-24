import { Card } from 'antd'
import logo from '../../../assets/mouscronLogo.png'
import AzureLogin from '../AzureLogin'
import EmailLogin from '../EmailLogin'

export default function LoginPage() {
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
      </div>
    </>
  )
}

import { WindowsOutlined } from '@ant-design/icons'
import { InteractionStatus } from '@azure/msal-browser'
import { useMsal } from '@azure/msal-react'
import { Button } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { loginRequest } from '../../../config/config.azure'
import { useAppDispatch } from '../../../core/hooks'
import { azureLogin } from '../../../core/services/auth.api'

export default function AzureLogin() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { instance, inProgress } = useMsal()

  const handleAzureLogin = () => {
    if (inProgress === InteractionStatus.None) {
      instance.loginRedirect(loginRequest).catch((error) => console.error(error))
    }
  }

  useEffect(() => {
    instance
      .handleRedirectPromise()
      .then((response) => {
        const account = response?.account || instance.getActiveAccount()
        if (account) {
          instance.setActiveAccount(account)
          dispatch(azureLogin({ account }))
        }
      })
      .catch(console.error)
  }, [instance, dispatch])

  return (
    <Button onClick={handleAzureLogin} disabled={inProgress !== InteractionStatus.None}>
      <span style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
        <WindowsOutlined />
        {t('content.sign_in_with_microsoft')}
      </span>
    </Button>
  )
}

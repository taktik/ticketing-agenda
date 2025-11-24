import { WindowsOutlined } from '@ant-design/icons'
import { useMsal } from '@azure/msal-react'
import { Button } from 'antd'
import { useEffect } from 'react'
import { useAppDispatch } from '../../../core/hooks'
import { azureLogin } from '../../../core/services/auth.api'
import '../index.css'
import { loginRequest } from '../../../config/config.azure'

export default function AzureLogin() {
  const dispatch = useAppDispatch()
  const { instance } = useMsal()
  const handleAzureLogin = () => {
    instance.loginRedirect(loginRequest).catch((error) => console.error(error))
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
    <>
      <Button onClick={handleAzureLogin}>
        <span style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
          <WindowsOutlined />
          Sign in with Microsoft
        </span>
      </Button>
    </>
  )
}

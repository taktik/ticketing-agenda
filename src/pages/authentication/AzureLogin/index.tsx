import { WindowsOutlined } from '@ant-design/icons'
import { useMsal } from '@azure/msal-react'
import { Button } from 'antd'
import { useEffect, useState } from 'react'
import { loginRequest } from '../../../config/config.azure'
import '../index.css'

export default function AzureLogin() {
  const [userOid, setUserOid] = useState<string | undefined>(undefined)
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
          const oid = account.idTokenClaims?.oid
          setUserOid(oid)
          console.log('User OID:', oid)
        }
      })
      .catch(console.error)
  }, [instance])

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

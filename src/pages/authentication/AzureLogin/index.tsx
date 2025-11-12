import { Button } from 'antd'
import '../index.css'
import { WindowsOutlined } from '@ant-design/icons'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../../../config/config.azure'

export default function AzureLogin() {
  const { instance } = useMsal()
  const handleAzureLogin = () => {
    instance.loginPopup(loginRequest).catch((error) => console.error(error))
  }
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

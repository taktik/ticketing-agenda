import { AZURE_CLIENTID, AZURE_TENANTID } from '../constants'

export const msalConfig = {
  auth: {
    clientId: AZURE_CLIENTID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANTID}`,
    redirectUri: 'http://localhost:3000',
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile'],
}

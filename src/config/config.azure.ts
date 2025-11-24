import { AZURE_CLIENT_ID, AZURE_TENANT_ID } from '../constants'

export const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile'],
  prompt: 'select_account',
}

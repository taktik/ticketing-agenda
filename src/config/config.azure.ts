import { AZURE_CLIENTID, AZURE_TENANTID } from '../constants'
import { routes } from '../navigation/Router'

export const msalConfig = {
  auth: {
    clientId: AZURE_CLIENTID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANTID}`,
    redirectUri: window.location.origin,
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile'], //['api://aa6047dc-336f-4090-bbdc-e00c7fddd34c/access_as_user']
  prompt: 'select_account',
}

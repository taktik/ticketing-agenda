import { AZURE_CLIENTID, AZURE_TENANTID } from '../constants'

export const msalConfig = {
  auth: {
    clientId: AZURE_CLIENTID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANTID}`,
    redirectUri: 'http://localhost:3000',
  },
}

export const loginRequest = {
  scopes: ['api://aa6047dc-336f-4090-bbdc-e00c7fddd34c/access_as_user'], //['openid', 'profile'],
  prompt: 'select_account',
}

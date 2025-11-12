import { AZURE_CLIENTID, AZURE_TENANTID } from '../constants'

const TAKTIK_CLIENTID = '5b2304da-4b6b-4b0b-bee8-cf85e8443ab6'
const TAKTIK_TENANTD = '94914ab7-4f28-4562-9122-94c4f5afa69c'

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

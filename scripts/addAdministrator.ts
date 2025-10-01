import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, User } from '@icure/cardinal-sdk'
import axios from 'axios'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_API, NIGHTLY_ICURE_CLOUD_URL } from './consts'

async function addAdministratorToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - Get the auth Token from making a request on cockpit
  // - You can get the AdminRoot ID by either
  //    1) Running the addAdminRoot script and we console.log the resulting object, giving you the id
  //    2) Running the getAdminRoot script, which console.logs the AdminRoot object

  const hcpId = v4()
  const userId = v4()
  const adminName = 'AdminTest'
  const adminFirstName = 'AdminTestFirstName'
  const adminLastName = 'AdminTestLastName'
  const adminRoot_ID = '5abdfa64-04c9-49e1-be66-14547e5d2283'
  const adminEmail = 'cowakey394@rograc.com'

  const JWT_TOKEN =
    'eyJhbGciOiJSUzI1NiJ9.eyJwcCI6IlFJYjFId0FBQUlhclZGVlZWYTFVVmF1cXFxQ0txcXFxaWdvQUNGQXBCUUhndjBNUkFnRT0iLCJoaCI6W10sImEiOlsiUk9MRV9VU0VSIiwiUk9MRV9IQ1AiLCJST0xFX0FETUlOSVNUUkFUT1IiXSwiciI6ImFiZDk3OWFjLTY3ZTUtNDIwYi05YTBjLWZlZTk2YThmZWU3NiIsInUiOiJmODUwNGU1My0xY2U5LTQwMjMtYTQ5MC1lNWQwYTJkY2UzMWQiLCJnIjoiaWMtb21hcmVjaC02MTQ5NGI3MS0yZDEwLTQyNzktOGJiYy04Zjc3NmYwMTIwMDAiLCJ0YWMiOjMwLCJkb1RwIjoiSENQIiwiZG9JZCI6ImM4OGVkMmI3LWVhZmYtNDk1ZC05NWZhLTVjYjQyZjE1YjliNyIsImV4cCI6MTc1OTMyMjI5NCwic2EiOjEsIm1hYyI6MjB9.A-iR93rBq67GC2saDzpc_EhwdidELVr88SJqJUg6oEnn-XGCCz2AxB1SB3O98YPJToRJdR_qOqiPCEp1GFXEzi2H82mDH4VZUaa1pcx1NQ37SMU4qD_gQ8bJK-14XbLfNcX9BLZ6ZSzShx8BnCf8KDZUjxpObqCYhD-qyvld6Cyq68ssVZ2ffQmurJnrzeWCCjE6t52QnEKnLUUNSL8pVV8vKM7wvrogNfskXNWRRrHs0YvpPW47HmnoIfu8Jmj5bit7MCHuzCpiVJYVrXKuwAOYI-lKqRIgmQYy1o_nBitQdaKo2kh10ij7ocZ3AxgUiEesHB5R2rBEAWlTjHvafw'

  const administratorHcp = new HealthcareParty({
    id: hcpId,
    name: adminName,
    firstName: adminFirstName,
    lastName: adminLastName,
    parentId: adminRoot_ID,
    public: true,
    tags: [new CodeStub({ id: 'ADMINISTRATOR|1', code: 'ADMINISTRATOR', type: 'ADMINISTRATOR', version: '1' })],
  })
  const administratorUser = new User({ id: userId, email: adminEmail, name: adminName, healthcarePartyId: hcpId })

  try {
    console.log(`Creating Administrator "${administratorHcp.name}" in group ${concernedGroupId}...`)

    const createdAdministratorHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, administratorHcp)
    const createdAdministratorUser = await sdk.user.createUserInGroup(concernedGroupId, administratorUser)

    const apiEndpoint = `${ICURE_API}/rest/v2/user/${userId}/inGroup/${concernedGroupId}/roles/set`
    const requestBody = { ids: ['ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:Administrator'] }
    const requestHeaders = {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    }

    await axios.post(apiEndpoint, requestBody, { headers: requestHeaders })

    console.log('✅ Successfully created new Administrator!')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('Administrator HCP ---')
    console.log(`ID: ${createdAdministratorHcp.id}`)
    console.log(`Name: ${createdAdministratorHcp.name}`)
    console.log('Administrator HCP ---')
    console.log('Administrator USER ---')
    console.log(`ID: ${createdAdministratorUser.id}`)
    console.log(`Name: ${createdAdministratorUser.name}`)
    console.log(`Email: ${createdAdministratorUser.email}`)
    console.log('Administrator USER ---')
  } catch (error) {
    console.error('❌ An error occurred while creating the Administrator:', error)
  }
}

addAdministratorToGroupId()

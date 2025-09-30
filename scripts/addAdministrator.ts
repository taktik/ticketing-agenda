import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_API, NIGHTLY_ICURE_CLOUD_URL } from './consts'
import axios from 'axios'

/*
What you need to modify here :

- Verify the DATABASE_ID
- verify the set of role given.
- For the administratorHcp : Modify the name, firstname, lastname, parentId. ParentId need to be set to admin-root id
- For the administratorUser: Modify  the email, name.

*/

async function addAdministratorToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  const hcpId = v4()
  const userId = v4()

  // You can get the AdminRoot ID by either
  // 1) Running the addAdminRoot script and we console.log the resulting object, giving you the id
  // 2) Running the getAdminRoot script, which console.logs the AdminRoot object
  const administratorHcp = new HealthcareParty({
    id: hcpId,
    name: 'Name of the Administrator',
    firstName: 'firstName of the Administrator',
    lastName: 'lastName of the Administrator',
    parentId: 'adminRoot ID',
    public: true,
    tags: [new CodeStub({ id: 'ADMINISTRATOR|1', code: 'ADMINISTRATOR', type: 'ADMINISTRATOR', version: '1' })],
  })
  const administratorUser = new User({ id: userId, email: 'Email of the administrator', name: 'Name of the administrator', healthcarePartyId: hcpId })

  try {
    console.log(`Creating Administrator "${administratorHcp.name}" in group ${concernedGroupId}...`)

    const createdAdministratorHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, administratorHcp)
    const createdAdministratorUser = await sdk.user.createUserInGroup(concernedGroupId, administratorUser)

    // Give the admin his role
    // get the auth Token from making a request on cockpit
    const authToken = ''
    const apiEndpoint = `${ICURE_API}/rest/v2/user/${userId}/inGroup/${concernedGroupId}/roles/set`
    const requestBody = { ids: ['Administrator'] }
    const requestHeaders = {
      Authorization: `Bearer ${authToken}`,
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

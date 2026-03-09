import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, User } from '@icure/cardinal-sdk'
import axios from 'axios'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_API_URL, ICURE_NIGHTLY_URL } from '../constants/index'

async function addAdministratorToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - Get the auth Token from making a request on cockpit
  // - You can get the AdminRoot ID by either
  //    1) Running the addAdminRoot script and we console.log the resulting object, giving you the id
  //    2) Running the getAdminRoot script, which console.logs the AdminRoot object

  const hcpId = v4()
  const userId = v4()
  const adminName = ''
  const adminFirstName = ''
  const adminLastName = ''
  const adminRoot_ID = ''
  const adminEmail = ''
  const JWT_TOKEN = ''

  const administratorHcp = new HealthcareParty({
    id: hcpId,
    name: adminName,
    firstName: adminFirstName,
    lastName: adminLastName,
    parentId: adminRoot_ID,
    public: false,
    userId: userId,
    tags: [new CodeStub({ id: 'ADMINISTRATOR', code: 'ADMINISTRATOR', type: 'ADMINISTRATOR', version: '1' })],
  })
  const administratorUser = new User({ id: userId, email: adminEmail, name: adminName, healthcarePartyId: hcpId })

  try {
    console.log(`Creating Administrator "${administratorHcp.name}" in group ${concernedGroupId}...`)

    if (!hcpId || !userId || !adminName || !adminFirstName || !adminLastName || !adminRoot_ID || !adminEmail || !JWT_TOKEN || !concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const createdAdministratorHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, administratorHcp)
    const createdAdministratorUser = await sdk.user.createUserInGroup(concernedGroupId, administratorUser)

    const apiEndpoint = `${ICURE_API_URL}/rest/v2/user/${userId}/inGroup/${concernedGroupId}/roles/set`
    const requestBody = {
      ids: ['ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:ADMINISTRATOR', 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:HEAD_OF_SERVICE', 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:CITY_WORKER'],
    }
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

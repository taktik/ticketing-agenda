import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL } from './consts'

async function addSiteRootToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - You can get the AdminRoot ID by either
  //    1) Running the addAdminRoot script and we console.log the resulting object, giving you the id
  //    2) Running the getAdminRoot script, which console.logs the AdminRoot object
  const hcpId = v4()
  const adminRoot_ID = ''

  const siteRoot = new HealthcareParty({
    id: hcpId,
    name: 'site-root',
    firstName: 'site-root',
    lastName: 'site-root',
    public: true,
    parentId: adminRoot_ID,
    tags: [new CodeStub({ id: 'site-root|1', code: 'site-root', type: 'site-root', version: '1' })],
  })

  try {
    console.log(`Creating siteRoot in group ${concernedGroupId}...`)

    const createdHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, siteRoot)

    console.log('✅ Successfully created new siteRoot!')
    console.log('---')
    console.log(`ID: ${createdHcp.id}`)
    console.log(`Name: ${createdHcp.name}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the siteRoot:', error)
  }
}

addSiteRootToGroupId()

import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, User } from '@icure/cardinal-sdk'
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
  const userId = v4()
  const siteRootEmail = ''
  const adminRoot_ID = ''

  const siteRootHcp = new HealthcareParty({
    id: hcpId,
    name: 'site-root',
    firstName: 'site-root',
    lastName: 'site-root',
    public: true,
    parentId: adminRoot_ID,
    userId: userId,
    tags: [new CodeStub({ id: 'site-root|1', code: 'site-root', type: 'site-root', version: '1' })],
    specialityCodes: [new CodeStub({ id: 'site-root|2', code: 'site-root', type: 'site-root', version: '1' })],
  })
  const siteRootUser = new User({ id: userId, email: siteRootEmail, name: 'site-root', healthcarePartyId: hcpId })

  try {
    console.log(`Creating siteRoot in group ${concernedGroupId}...`)

    if (!hcpId || !userId || !siteRootEmail || !adminRoot_ID || !concernedGroupId) {
      throw new Error('Missing mandatory args')
    }
    const createdHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, siteRootHcp)
    const createdSiteRootUser = await sdk.user.createUserInGroup(concernedGroupId, siteRootUser)

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

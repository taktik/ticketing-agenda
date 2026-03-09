import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, DecryptedPropertyStub, DecryptedTypedValue, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL } from '../constants/index'

async function addSiteRootToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - You can get the AdminRoot ID by either
  //    1) Running the addAdminRoot script and we console.log the resulting object, giving you the id
  //    2) Running the getAdminRoot script, which console.logs the AdminRoot object
  const hcpId = v4()
  const userId = v4()
  const siteRootEmail = ''
  const adminRoot_ID = ''

  const siteRootProperty = new DecryptedPropertyStub({
    id: 'SITE_ROOT',
    typedValue: new DecryptedTypedValue({
      type: TypedValuesType.String,
      stringValue: 'SITE_ROOT',
    }),
  })

  const siteRootHcp = new HealthcareParty({
    id: hcpId,
    name: 'SITE_ROOT',
    firstName: 'SITE_ROOT',
    lastName: 'SITE_ROOT',
    public: true,
    parentId: adminRoot_ID,
    userId: userId,
    tags: [new CodeStub({ id: 'SITE_ROOT', code: 'SITE_ROOT', type: 'SITE_ROOT', version: '1' })],
    publicProperties: [siteRootProperty],
  })
  const siteRootUser = new User({ id: userId, email: siteRootEmail, name: 'SITE_ROOT', healthcarePartyId: hcpId })

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

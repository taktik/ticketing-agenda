import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL } from './consts'

async function addSiteToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - You can get the siteRoot ID by either
  //     1) Running the addSiteRoot script and we console.log the resulting object, giving you the id
  //     2) Running the getSiteRoot script, which console.logs the siteRoot object

  const hcpId = v4()
  const userId = v4()
  const siteName = ''
  const siteRoot_ID = ''
  const siteEmail = ''

  const siteHcp = new HealthcareParty({ id: hcpId, name: siteName, parentId: siteRoot_ID, public: true, tags: [new CodeStub({ id: 'SITE|1', code: 'SITE', type: 'SITE', version: '1' })] })
  const siteUser = new User({ id: userId, email: siteEmail, name: siteName, healthcarePartyId: hcpId })

  try {
    console.log(`Creating Site "${siteHcp.name}" in group ${concernedGroupId}...`)

    const createdSite = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, siteHcp)
    const createdUser = await sdk.user.createUserInGroup(concernedGroupId, siteUser)

    console.log('✅ Successfully created new Site!')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('SITE HCP ---')
    console.log(`ID: ${createdSite.id}`)
    console.log(`Name: ${createdSite.name}`)
    console.log('SITE HCP ---')
    console.log('SITE USER ---')
    console.log(`ID: ${createdUser.id}`)
    console.log(`Name: ${createdUser.name}`)
    console.log(`Email: ${createdUser.email}`)
    console.log('SITE USER ---')
  } catch (error) {
    console.error('❌ An error occurred while creating the Site:', error)
  }
}

addSiteToGroupId()

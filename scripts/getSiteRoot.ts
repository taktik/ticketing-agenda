import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk } from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL, RootHcpType } from './consts'

/*
What you need to modify here :

- Verify the DATABASE_ID

*/

async function getSiteRootFromGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  try {
    console.log(`Fetching SiteRoot in group ${concernedGroupId}...`)

    const healthcareParties = await sdk.healthcareParty.getHealthcarePartiesInGroup(concernedGroupId)
    const siteRoots = healthcareParties.filter((hcp) => hcp.tags.some((tag) => tag.type === RootHcpType.SITE_ROOT))
    if (siteRoots.length !== 0) throw Error(`Error, expected unique result but found ${siteRoots.length}`)
    const result = siteRoots[0]

    console.log('✅ Successfully fetched siteRoot!')
    console.log('---')
    console.log(`ID: ${result.id}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the siteRoot:', error)
  }
}

getSiteRootFromGroupId()

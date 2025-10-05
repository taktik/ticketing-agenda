import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk } from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL, RootHcpType } from './consts'

async function getAdminRootFromGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  try {
    console.log(`Fetching AdminRoot in group ${concernedGroupId}...`)

    if (!concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const healthcareParties = await sdk.healthcareParty.getHealthcarePartiesInGroup(concernedGroupId)
    const adminRoots = healthcareParties.filter((hcp) => hcp.tags.some((tag) => tag.type === RootHcpType.ADMIN_ROOT))
    if (adminRoots.length !== 1) throw Error(`Error, expected unique result but found ${adminRoots.length}`)
    const result = adminRoots[0]

    console.log('✅ Successfully fetched siteRoot!')
    console.log('---')
    console.log(`ID: ${result.id}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while fetching the adminRoot:', error)
  }
}

getAdminRootFromGroupId()

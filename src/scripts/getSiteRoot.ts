import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk } from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL, RootHcpType } from '../constants/index'

async function getSiteRootFromGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  try {
    console.log(`Fetching SiteRoot in group ${concernedGroupId}...`)

    if (!concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const healthcareParties = await sdk.healthcareParty.getHealthcarePartiesInGroup(concernedGroupId)
    const siteRoots = healthcareParties.filter((hcp) => hcp.publicProperties?.some((prop) => prop.id === RootHcpType.SITE_ROOT))
    if (siteRoots.length !== 1) throw Error(`Error, expected unique result but found ${siteRoots.length}`)
    const result = siteRoots[0]

    console.log('✅ Successfully fetched siteRoot!')
    console.log('---')
    console.log(`ID: ${result.id}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while fetching the siteRoot:', error)
  }
}

getSiteRootFromGroupId()

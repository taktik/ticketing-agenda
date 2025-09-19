import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk } from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL, RootHcpType } from './consts'

async function removeSiteRootToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // Fetch the siteRoots to delete
  // We fetch and delete an array of hcp/siteRoots. There should only be one, but if we added several by mistake we can remove them all at once.
  const healthcareParties = await sdk.healthcareParty.getHealthcarePartiesInGroup(concernedGroupId)
  const siteRoots = healthcareParties.filter((hcp) => hcp.tags.some((tag) => tag.type === RootHcpType.SITE_ROOT))

  try {
    console.log(`Deleting siteRoot in group ${concernedGroupId}...`)

    const deletedHcps = await sdk.healthcareParty.deleteHealthcarePartiesInGroup(concernedGroupId, siteRoots)

    console.log('✅ Successfully removed the siteRoot!')
    console.log('---')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log(`Number of deleted adminRoots: ${deletedHcps.length}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while removing the siteRoot:', error)
  }
}

removeSiteRootToGroupId()

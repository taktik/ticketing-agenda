import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, GroupScoped, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL, RootHcpType } from '../constants/index'
import { loadFromIterator } from './utils'

async function removeSiteRootToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // Fetch the siteRoots to delete
  // We fetch and delete an array of hcp/siteRoots. There should only be one, but if we added several by mistake we can remove them all at once.
  const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.all()), 1000)
  const siteRoots = groupScopedHcps.map((gs) => gs.entity).filter((hcp) => hcp.publicProperties?.some((prop) => prop.id === RootHcpType.SITE_ROOT))

  try {
    console.log(`Deleting siteRoot in group ${concernedGroupId}...`)

    if (!concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const deletedHcps = await sdk.healthcareParty.inGroup.deleteHealthcareParties(siteRoots.map((hcp) => new GroupScoped({ groupId: concernedGroupId, entity: hcp })))

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

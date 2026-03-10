import { AuthenticationMethod, CardinalBaseSdk, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import * as dotenv from 'dotenv'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL, RootHcpType } from '../constants/index'
import { loadFromIterator } from './utils'
dotenv.config()

async function getAdminRootFromGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  try {
    console.log(`Fetching AdminRoot in group ${concernedGroupId}...`)

    if (!concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.all()), 1000)
    const healthcareParties = groupScopedHcps.map((gs) => gs.entity)
    const adminRoots = healthcareParties.filter((hcp) => hcp.publicProperties?.some((prop) => prop.id === RootHcpType.ADMIN_ROOT))
    if (adminRoots.length !== 1) throw Error(`Error, expected unique result but found ${adminRoots.length}`)
    const result = adminRoots[0]

    console.log('✅ Successfully fetched siteRoot!')
    console.log('---')
    console.log(`ID: ${result.id}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log(`is public: `)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while fetching the adminRoot:', error)
  }
}

getAdminRootFromGroupId()

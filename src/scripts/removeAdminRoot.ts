import * as dotenv from 'dotenv'
dotenv.config()

import { GroupScoped, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { DATABASE_ID, HcpTag, initSdk, loadFromIterator } from './utils'

async function removeAdminRootFromGroupId() {
  const concernedGroupId = DATABASE_ID

  try {
    if (!concernedGroupId) {
      throw new Error('Missing mandatory args: fill in DATABASE_ID')
    }

    console.log(`Deleting adminRoot in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    // Fetch and delete all adminRoots. There should only be one, but if we added several by mistake we can remove them all at once.
    const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.byTag(HcpTag.ADMIN_ROOT, { tagCode: HcpTag.ADMIN_ROOT })), 1000)
    const adminRoots = groupScopedHcps.map((gs) => gs.entity)

    const deletedHcps = await sdk.healthcareParty.inGroup.deleteHealthcareParties(adminRoots.map((hcp) => new GroupScoped({ groupId: concernedGroupId, entity: hcp })))

    console.log('✅ Successfully removed the adminRoot!')
    console.log('---')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log(`Number of deleted adminRoots: ${deletedHcps.length}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while removing the adminRoot:', error)
  }
}

removeAdminRootFromGroupId()

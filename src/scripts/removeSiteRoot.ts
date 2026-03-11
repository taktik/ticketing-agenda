import * as dotenv from 'dotenv'
dotenv.config()

import { GroupScoped, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { DATABASE_ID, HcpTag, initSdk, loadFromIterator } from './utils'

async function removeSiteRootFromGroupId() {
  const concernedGroupId = DATABASE_ID

  try {
    if (!concernedGroupId) {
      throw new Error('Missing mandatory args: fill in DATABASE_ID')
    }

    console.log(`Deleting siteRoot in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    // Fetch and delete all siteRoots. There should only be one, but if we added several by mistake we can remove them all at once.
    const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.byTag(HcpTag.SITE_ROOT, { tagCode: HcpTag.SITE_ROOT })), 1000)
    const siteRoots = groupScopedHcps.map((gs) => gs.entity)

    const deletedHcps = await sdk.healthcareParty.inGroup.deleteHealthcareParties(siteRoots.map((hcp) => new GroupScoped({ groupId: concernedGroupId, entity: hcp })))

    console.log('✅ Successfully removed the siteRoot!')
    console.log('---')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log(`Number of deleted siteRoots: ${deletedHcps.length}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while removing the siteRoot:', error)
  }
}

removeSiteRootFromGroupId()

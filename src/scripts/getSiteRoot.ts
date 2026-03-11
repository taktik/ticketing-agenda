import * as dotenv from 'dotenv'
dotenv.config()

import { HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { DATABASE_ID, HcpTag, initSdk, loadFromIterator } from './utils'

async function getSiteRootFromGroupId() {
  const concernedGroupId = DATABASE_ID

  try {
    if (!concernedGroupId) {
      throw new Error('Missing mandatory args: fill in DATABASE_ID')
    }

    console.log(`Fetching SiteRoot in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.byTag(HcpTag.SITE_ROOT, { tagCode: HcpTag.SITE_ROOT })), 1000)
    const siteRoots = groupScopedHcps.map((gs) => gs.entity)
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

import * as dotenv from 'dotenv'
dotenv.config()

import { GroupScoped, HealthcarePartyFilters, UserFilters } from '@icure/cardinal-sdk'
import { DATABASE_ID, HcpTag, initSdk, loadFromIterator } from './utils'

async function removeSiteFromGroupId() {
  const concernedGroupId = DATABASE_ID

  // Modify this to the site you'd like to delete. It has to be unique. Otherwise delete through the cockpit.
  const siteNameToDelete = ''

  try {
    if (!siteNameToDelete || !concernedGroupId) {
      throw new Error('Missing mandatory args: fill in siteNameToDelete and DATABASE_ID')
    }

    console.log(`Deleting Site "${siteNameToDelete}" in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.byTag(HcpTag.SITE, { tagCode: HcpTag.SITE })), 1000)
    const sites = groupScopedHcps.map((gs) => gs.entity)

    const foundSites = sites.filter((site) => site.name === siteNameToDelete)
    if (foundSites.length !== 1) throw Error(`Error, expected unique result but found ${foundSites.length}`)

    const site = foundSites[0]
    const userIterator = await sdk.user.inGroup.filterUsersBy(concernedGroupId, UserFilters.byHealthcarePartyId(site.id))
    const groupScopedUsers = (await userIterator.hasNext()) ? await userIterator.next(10) : []
    const users = groupScopedUsers.map((gs) => gs.entity)
    if (users.length !== 1) throw Error(`Error, expected unique user but found ${users.length}`)

    const user = users[0]
    const deletedHcp = await sdk.healthcareParty.inGroup.deleteHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: site }))
    const deletedUser = await sdk.user.inGroup.deleteUser(new GroupScoped({ groupId: concernedGroupId, entity: user }))

    console.log('✅ Successfully deleted the Site!')
    console.log('---')
    console.log(`Site ID: ${deletedHcp.entity.id}`)
    console.log(`Site Name: ${siteNameToDelete}`)
    console.log(`User ID: ${deletedUser.entity.id}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while deleting the Site:', error)
  }
}

removeSiteFromGroupId()

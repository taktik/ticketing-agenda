import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, GroupScoped, HealthcarePartyFilters, UserFilters } from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL, HcpTag, loadFromIterator } from './utils'

async function removeSiteOfGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!), { lenientJson: true })

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // Modifiy this to the site you'd like to delete. It has to be unique. Otherwise delete through the cockpit.
  const siteNameToDelete = ''

  try {
    console.log(`Fetch Site "${siteNameToDelete}" in group ${concernedGroupId}...`)

    if (!siteNameToDelete || !concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.byTag(HcpTag.SITE, { tagCode: HcpTag.SITE })), 1000)
    const sites = groupScopedHcps.map((gs) => gs.entity)

    const foundSites = sites.filter((site) => site.name === siteNameToDelete)

    if (foundSites.length !== 1) throw Error('Impossible to proceed, excpected unique result')

    const site = foundSites[0]
    const userIterator = await sdk.user.inGroup.filterUsersBy(concernedGroupId, UserFilters.byHealthcarePartyId(site.id))
    const groupScopedUsers = (await userIterator.hasNext()) ? await userIterator.next(10) : []
    const users = groupScopedUsers.map((gs) => gs.entity)
    if (users.length !== 1) throw Error('Impossible to proceed, expected unique result')
    const user = users[0]
    const deletedHcp = await sdk.healthcareParty.inGroup.deleteHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: site }))
    const deletedUser = await sdk.user.inGroup.deleteUser(new GroupScoped({ groupId: concernedGroupId, entity: user }))

    console.log('✅ Successfully deleted the Site!')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('SITE HCP ---')
    console.log(`ID: ${deletedHcp.entity.id}`)
    console.log('SITE HCP ---')
    console.log('SITE USER ---')
    console.log(`ID: ${deletedUser.entity.id}`)
    console.log('SITE USER ---')
  } catch (error) {
    console.error('❌ An error occurred while deleting the Site:', error)
  }
}

removeSiteOfGroupId()

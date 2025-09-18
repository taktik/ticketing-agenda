import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL } from './consts'

async function removeSiteOfGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  const siteNameToDelete = 'The site name'

  try {
    console.log(`Fetch Site "${siteNameToDelete}" in group ${concernedGroupId}...`)

    const sites = await sdk.healthcareParty.getHealthcarePartiesInGroup(concernedGroupId)

    const foundSites = sites.filter((site) => site.name === siteNameToDelete)

    if (foundSites.length !== 1) throw Error('Impossible to proceed, excpected unique result')

    const site = foundSites[0]
    if (!site.userId) throw Error('Impossible to proceed, no userId')
    const users = await sdk.user.getUsersInGroup(concernedGroupId, [site.userId])
    if (users.length !== 1) throw Error('Impossible to proceed, expected unique result')
    const user = users[0]
    const deletedHcp = await sdk.healthcareParty.deleteHealthcarePartyInGroup(concernedGroupId, site)
    const deletedUser = await sdk.user.deleteUserInGroup(concernedGroupId, user)

    console.log('✅ Successfully deleted the Site!')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('SITE HCP ---')
    console.log(`ID: ${deletedHcp.id}`)
    console.log('SITE HCP ---')
    console.log('SITE USER ---')
    console.log(`ID: ${deletedUser.id}`)
    console.log('SITE USER ---')

  } catch (error) {
    console.error('❌ An error occurred while deleting the Site:', error)
  }
}

removeSiteOfGroupId()

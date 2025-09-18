import { AuthenticationMethod, CardinalBaseSdk, CodeStub, HealthcareParty, HealthcarePartyFilters } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL, RootHcpType } from './consts'

async function removeAdminRootToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  const adminRoots = await loadFromIterator(await sdk.healthcareParty.filterHealthPartiesBy(HealthcarePartyFilters.byTag(RootHcpType.ADMIN_ROOT)), 1000)


  // Add the adminRoot
  const adminRoot = new HealthcareParty({
    id: v4(),
    name: 'admin-root',
    firstName: 'admin-root',
    lastName: 'admin-root',
    public: true,
    tags: [new CodeStub({ id: 'admin-root|1', code: 'admin-root', type: 'admin-root', version: '1' })],
  })

  try {
    console.log(`Creating adminRoot in group ${concernedGroupId}...`)

    const createdHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, adminRoot)

    console.log('✅ Successfully removed adminRoot!')
    console.log('---')
    console.log(`ID: ${createdHcp.id}`)
    console.log(`Name: ${createdHcp.name}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')

    return createdHcp
  } catch (error) {
    console.error('❌ An error occurred while removing the adminRoot:', error)
  }
}

removeAdminRootToGroupId()
function loadFromIterator(arg0: any, arg1: number) {
    throw new Error('Function not implemented.')
}


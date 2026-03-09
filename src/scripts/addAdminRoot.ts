import * as dotenv from 'dotenv'
dotenv.config()

import { AuthenticationMethod, CardinalBaseSdk, CodeStub, DecryptedPropertyStub, DecryptedTypedValue, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL } from '../constants/index'

async function addAdminRootToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  const hcpId = v4()
  const userId = v4()
  const adminRootEmail = ''

  const adminRootProperty = new DecryptedPropertyStub({
    id: 'ADMIN_ROOT',
    typedValue: new DecryptedTypedValue({
      type: TypedValuesType.String,
      stringValue: 'ADMIN_ROOT',
    }),
  })

  const adminRootHcp = new HealthcareParty({
    id: hcpId,
    name: 'ADMIN_ROOT',
    firstName: 'ADMIN_ROOT',
    lastName: 'ADMIN_ROOT',
    public: true,
    userId: userId,
    tags: [new CodeStub({ id: 'ADMIN_ROOT', code: 'ADMIN_ROOT', type: 'ADMIN_ROOT', version: '1' })],
    publicProperties: [adminRootProperty],
  })
  const adminRootUser = new User({ id: userId, email: adminRootEmail, name: 'ADMIN_ROOT', healthcarePartyId: hcpId })

  try {
    console.log(`Creating adminRoot in group ${concernedGroupId}...`)

    if (!hcpId || !userId || !adminRootEmail || !concernedGroupId) {
      throw new Error('Missing mandatory args')
    }
    const createdAdminRootHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, adminRootHcp)
    const createdAdminRootUser = await sdk.user.createUserInGroup(concernedGroupId, adminRootUser)

    console.log('✅ Successfully created new adminRoot!')
    console.log('---')
    console.log(`ID: ${createdAdminRootHcp.id}`)
    console.log(`Name: ${createdAdminRootHcp.name}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the adminRoot:', error)
  }
}

addAdminRootToGroupId()

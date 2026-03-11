import * as dotenv from 'dotenv'
dotenv.config()

import { CodeStub, DecryptedPropertyStub, DecryptedTypedValue, GroupScoped, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { DATABASE_ID, HcpTag, initSdk } from './utils'

async function addAdminRootToGroupId() {
  const concernedGroupId = DATABASE_ID

  // Modify this to the correct email
  const adminRootEmail = ''

  try {
    if (!adminRootEmail || !concernedGroupId) {
      throw new Error('Missing mandatory args: fill in adminRootEmail and DATABASE_ID')
    }

    console.log(`Creating adminRoot in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    const hcpId = v4()
    const userId = v4()

    const adminRootHcp = new HealthcareParty({
      id: hcpId,
      name: HcpTag.ADMIN_ROOT,
      firstName: HcpTag.ADMIN_ROOT,
      lastName: HcpTag.ADMIN_ROOT,
      public: true,
      tags: [new CodeStub({ id: HcpTag.ADMIN_ROOT, code: HcpTag.ADMIN_ROOT, type: HcpTag.ADMIN_ROOT, version: '1' })],
      publicProperties: [
        new DecryptedPropertyStub({
          id: HcpTag.ADMIN_ROOT,
          typedValue: new DecryptedTypedValue({ type: TypedValuesType.String, stringValue: HcpTag.ADMIN_ROOT }),
        }),
      ],
    })
    const adminRootUser = new User({ id: userId, email: adminRootEmail, name: HcpTag.ADMIN_ROOT, healthcarePartyId: hcpId })

    const createdAdminRootHcp = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: adminRootHcp }))
    await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: adminRootUser }))

    console.log('✅ Successfully created new adminRoot!')
    console.log('---')
    console.log(`ID: ${createdAdminRootHcp.entity.id}`)
    console.log(`Name: ${createdAdminRootHcp.entity.name}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the adminRoot:', error)
  }
}

addAdminRootToGroupId()

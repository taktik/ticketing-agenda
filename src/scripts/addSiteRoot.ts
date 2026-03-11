import * as dotenv from 'dotenv'
dotenv.config()

import { CodeStub, DecryptedPropertyStub, DecryptedTypedValue, GroupScoped, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { DATABASE_ID, HcpTag, initSdk } from './utils'

async function addSiteRootToGroupId() {
  const concernedGroupId = DATABASE_ID

  // Modify these before running
  // You can get the AdminRoot ID by running getAdminRoot.ts or from the addAdminRoot.ts output
  const siteRootEmail = ''
  const adminRoot_ID = ''

  try {
    if (!siteRootEmail || !adminRoot_ID || !concernedGroupId) {
      throw new Error('Missing mandatory args: fill in siteRootEmail, adminRoot_ID, and DATABASE_ID')
    }

    console.log(`Creating siteRoot in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    const hcpId = v4()
    const userId = v4()

    const siteRootHcp = new HealthcareParty({
      id: hcpId,
      name: HcpTag.SITE_ROOT,
      firstName: HcpTag.SITE_ROOT,
      lastName: HcpTag.SITE_ROOT,
      public: true,
      parentId: adminRoot_ID,
      tags: [new CodeStub({ id: HcpTag.SITE_ROOT, code: HcpTag.SITE_ROOT, type: HcpTag.SITE_ROOT, version: '1' })],
      publicProperties: [
        new DecryptedPropertyStub({
          id: HcpTag.SITE_ROOT,
          typedValue: new DecryptedTypedValue({ type: TypedValuesType.String, stringValue: HcpTag.SITE_ROOT }),
        }),
      ],
    })
    const siteRootUser = new User({ id: userId, email: siteRootEmail, name: HcpTag.SITE_ROOT, healthcarePartyId: hcpId })

    const createdHcp = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: siteRootHcp }))
    await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: siteRootUser }))

    console.log('✅ Successfully created new siteRoot!')
    console.log('---')
    console.log(`ID: ${createdHcp.entity.id}`)
    console.log(`Name: ${createdHcp.entity.name}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the siteRoot:', error)
  }
}

addSiteRootToGroupId()

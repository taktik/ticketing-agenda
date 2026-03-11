import * as dotenv from 'dotenv'
dotenv.config()

import { CodeStub, DecryptedPropertyStub, DecryptedTypedValue, GroupScoped, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { DATABASE_ID, HcpTag, initSdk } from './utils'

async function addSiteToGroupId() {
  const concernedGroupId = DATABASE_ID

  // Modify these before running
  // You can get the SiteRoot ID by running getSiteRoot.ts or from the addSiteRoot.ts output
  const siteName = ''
  const siteRoot_ID = ''
  const siteEmail = ''

  try {
    if (!siteName || !siteRoot_ID || !siteEmail || !concernedGroupId) {
      throw new Error('Missing mandatory args: fill in siteName, siteRoot_ID, siteEmail, and DATABASE_ID')
    }

    console.log(`Creating Site "${siteName}" in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    const hcpId = v4()
    const userId = v4()

    const siteHcp = new HealthcareParty({
      id: hcpId,
      name: siteName,
      firstName: siteName,
      lastName: siteName,
      parentId: siteRoot_ID,
      public: true,
      tags: [new CodeStub({ id: HcpTag.SITE, code: HcpTag.SITE, type: HcpTag.SITE, version: '1' })],
      publicProperties: [
        new DecryptedPropertyStub({
          id: HcpTag.SITE,
          typedValue: new DecryptedTypedValue({ type: TypedValuesType.String, stringValue: HcpTag.SITE }),
        }),
      ],
    })
    const siteUser = new User({ id: userId, email: siteEmail, name: siteName, healthcarePartyId: hcpId })

    const createdSite = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: siteHcp }))
    const createdUser = await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: siteUser }))

    console.log('✅ Successfully created new Site!')
    console.log('---')
    console.log(`Site ID: ${createdSite.entity.id}`)
    console.log(`Site Name: ${createdSite.entity.name}`)
    console.log(`User ID: ${createdUser.entity.id}`)
    console.log(`User Email: ${createdUser.entity.email}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the Site:', error)
  }
}

addSiteToGroupId()

import * as dotenv from 'dotenv'
dotenv.config()

import { CodeStub, DecryptedPropertyStub, DecryptedTypedValue, GroupScoped, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { DATABASE_ID, HcpTag, initSdk } from './utils'

async function initProject() {
  const concernedGroupId = DATABASE_ID

  // Modify these to the correct emails before running
  const adminRootEmail = ''
  const siteRootEmail = ''
  const siteEmail = ''
  const siteName = 'Site principal'

  try {
    if (!adminRootEmail || !siteRootEmail || !siteEmail || !concernedGroupId) {
      throw new Error('Missing mandatory args: fill in adminRootEmail, siteRootEmail, siteEmail, and DATABASE_ID')
    }

    console.log(`Initializing project in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    // Step 1: Create AdminRoot
    console.log(`\n[1/3] Creating AdminRoot in group ${concernedGroupId}...`)

    const adminRootHcpId = v4()
    const adminRootUserId = v4()

    const adminRootHcp = new HealthcareParty({
      id: adminRootHcpId,
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
    const adminRootUser = new User({ id: adminRootUserId, email: adminRootEmail, name: HcpTag.ADMIN_ROOT, healthcarePartyId: adminRootHcpId })

    const createdAdminRoot = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: adminRootHcp }))
    await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: adminRootUser }))

    const adminRootId = createdAdminRoot.entity.id
    console.log(`✅ AdminRoot created — ID: ${adminRootId}`)

    // Step 2: Create SiteRoot
    console.log(`\n[2/3] Creating SiteRoot in group ${concernedGroupId}...`)

    const siteRootHcpId = v4()
    const siteRootUserId = v4()

    const siteRootHcp = new HealthcareParty({
      id: siteRootHcpId,
      name: HcpTag.SITE_ROOT,
      firstName: HcpTag.SITE_ROOT,
      lastName: HcpTag.SITE_ROOT,
      public: true,
      parentId: adminRootId,
      tags: [new CodeStub({ id: HcpTag.SITE_ROOT, code: HcpTag.SITE_ROOT, type: HcpTag.SITE_ROOT, version: '1' })],
      publicProperties: [
        new DecryptedPropertyStub({
          id: HcpTag.SITE_ROOT,
          typedValue: new DecryptedTypedValue({ type: TypedValuesType.String, stringValue: HcpTag.SITE_ROOT }),
        }),
      ],
    })
    const siteRootUser = new User({ id: siteRootUserId, email: siteRootEmail, name: HcpTag.SITE_ROOT, healthcarePartyId: siteRootHcpId })

    const createdSiteRoot = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: siteRootHcp }))
    await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: siteRootUser }))

    const siteRootId = createdSiteRoot.entity.id
    console.log(`✅ SiteRoot created — ID: ${siteRootId}`)

    // Step 3: Create first Site
    console.log(`\n[3/3] Creating Site "${siteName}" in group ${concernedGroupId}...`)

    const siteHcpId = v4()
    const siteUserId = v4()

    const siteHcp = new HealthcareParty({
      id: siteHcpId,
      name: siteName,
      firstName: siteName,
      lastName: siteName,
      parentId: siteRootId,
      public: true,
      tags: [new CodeStub({ id: HcpTag.SITE, code: HcpTag.SITE, type: HcpTag.SITE, version: '1' })],
      publicProperties: [
        new DecryptedPropertyStub({
          id: HcpTag.SITE,
          typedValue: new DecryptedTypedValue({ type: TypedValuesType.String, stringValue: HcpTag.SITE }),
        }),
      ],
    })
    const siteUser = new User({ id: siteUserId, email: siteEmail, name: siteName, healthcarePartyId: siteHcpId })

    const createdSite = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: siteHcp }))
    await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: siteUser }))

    console.log(`✅ Site created — ID: ${createdSite.entity.id}`)

    // Summary
    console.log('\n✅ Successfully initialized the project!')
    console.log('---')
    console.log(`Group ID:     ${concernedGroupId}`)
    console.log(`AdminRoot ID: ${adminRootId}`)
    console.log(`SiteRoot ID:  ${siteRootId}`)
    console.log(`Site ID:      ${createdSite.entity.id}`)
    console.log(`Site Name:    ${siteName}`)
    console.log('---')
    console.log('Next steps:')
    console.log(`  1. Log in to the app with the site email (${siteEmail}) to initialize encryption keys, then log out.`)
    console.log(`  2. Run addAdministrator.ts with:`)
    console.log(`     - adminRoot_ID = "${adminRootId}"`)
    console.log(`     - adminEmail   = <the administrator's email>`)
    console.log(`     - JWT_TOKEN    = <global admin JWT from iCure Cockpit>`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while initializing the project:', error)
  }
}

initProject()

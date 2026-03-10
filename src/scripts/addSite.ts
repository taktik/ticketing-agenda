import * as dotenv from 'dotenv'
dotenv.config()
import { AuthenticationMethod, CardinalBaseSdk, CodeStub, DecryptedPropertyStub, DecryptedTypedValue, GroupScoped, HealthcareParty, TypedValuesType, User } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_NIGHTLY_URL } from '../constants/index'

async function addSiteToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - You can get the siteRoot ID by either
  //     1) Running the addSiteRoot script and we console.log the resulting object, giving you the id. Max one SiteRoot !
  //     2) Running the getSiteRoot script, which console.logs the siteRoot object

  const hcpId = v4()
  const userId = v4()
  const siteName = ''
  const siteRoot_ID = ''
  const siteEmail = ''

  const siteProperty = new DecryptedPropertyStub({
    id: 'SITE',
    typedValue: new DecryptedTypedValue({
      type: TypedValuesType.String,
      stringValue: 'SITE',
    }),
  })

  const siteHcp = new HealthcareParty({
    id: hcpId,
    name: siteName,
    firstName: siteName,
    lastName: siteName,
    parentId: siteRoot_ID,
    public: true,
    tags: [new CodeStub({ id: 'SITE', code: 'SITE', type: 'SITE', version: '1' })],
    publicProperties: [siteProperty],
  })

  const siteUser = new User({ id: userId, email: siteEmail, name: siteName, healthcarePartyId: hcpId })

  try {
    console.log(`Creating Site "${siteHcp.name}" in group ${concernedGroupId}...`)

    if (!hcpId || !userId || !siteName || !siteEmail || !siteRoot_ID || !concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

    const createdSite = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: siteHcp }))
    const createdUser = await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: siteUser }))

    console.log('✅ Successfully created new Site!')
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('SITE HCP ---')
    console.log(`ID: ${createdSite.entity.id}`)
    console.log(`Name: ${createdSite.entity.name}`)
    console.log('SITE HCP ---')
    console.log('SITE USER ---')
    console.log(`ID: ${createdUser.entity.id}`)
    console.log(`Name: ${createdUser.entity.name}`)
    console.log(`Email: ${createdUser.entity.email}`)
    console.log('SITE USER ---')
  } catch (error) {
    console.error('❌ An error occurred while creating the Site:', error)
  }
}

addSiteToGroupId()

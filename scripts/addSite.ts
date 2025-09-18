import {
  AuthenticationMethod,
  AuthenticationProcessTelecomType,
  CaptchaOptions,
  CardinalAnonymousSdk,
  CardinalApis,
  CardinalSdk,
  CryptoStrategies,
  DataOwnerWithType,
  KeyPairRecoverer,
  RecoveryDataKey,
  RecoveryKeyOptions,
  RecoveryKeySize,
  RecoveryResult,
  Solution,
  StorageFacade,
  User,
  XCryptoService,
  XRsaKeypair,
  CardinalBaseSdk,
  HealthcareParty,
  CodeStub,
} from '@icure/cardinal-sdk'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, NIGHTLY_ICURE_CLOUD_URL } from './consts'
import { v4 } from 'uuid'

async function addSiteToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, NIGHTLY_ICURE_CLOUD_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!))

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // Modify this with the correct site name and siteRoot ID
  // Name it however you want
  // You can get the siteRoot ID by either
  // 1) Running the createRoots script and we console.log the resulting objects, giving you the id (only for initial setup, we want a single siteRoot and adminRoot)
  // 2) Running the getRoots script, which console.logs the siteRoot and adminRoot objects
  const siteToAdd = new HealthcareParty({id: v4(), name: 'Name of the site', parentId: 'siteRoot ID', public: true, tags: [new CodeStub({ id: 'SITE|1', code: 'SITE', type: 'SITE', version: '1' })] })

  try {
    console.log(`Creating HCP "${siteToAdd.name}" in group ${concernedGroupId}...`)

    const createdHcp = await sdk.healthcareParty.createHealthcarePartyInGroup(concernedGroupId, siteToAdd)

    console.log('✅ Successfully created new Healthcare Party!')
    console.log('---')
    console.log(`ID: ${createdHcp.id}`)
    console.log(`Name: ${createdHcp.name}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')

    return createdHcp
  } catch (error) {
    console.error('❌ An error occurred while creating the Healthcare Party:', error)
  }
}

addSiteToGroupId()

import * as dotenv from 'dotenv'
dotenv.config()

import { CodeStub, GroupScoped, HealthcareParty, User } from '@icure/cardinal-sdk'
import axios from 'axios'
import { v4 } from 'uuid'
import { DATABASE_ID, ICURE_API_URL, SCRIPT_ROLE_ADMINISTRATOR, SCRIPT_ROLE_CITY_WORKER, SCRIPT_ROLE_HEAD_OF_SERVICE, HcpTag, initSdk } from './utils'

async function addAdministratorToGroupId() {
  const concernedGroupId = DATABASE_ID

  // Modify these before running
  // You can get the AdminRoot ID by running getAdminRoot.ts or from the addAdminRoot.ts output
  // Get the JWT by making a request on iCure Cockpit and copying the Authorization: Bearer header
  const adminName = ''
  const adminFirstName = ''
  const adminLastName = ''
  const adminRoot_ID = ''
  const adminEmail = ''
  const JWT_TOKEN = ''

  try {
    if (!adminName || !adminFirstName || !adminLastName || !adminRoot_ID || !adminEmail || !JWT_TOKEN || !concernedGroupId) {
      throw new Error('Missing mandatory args: fill in adminName, adminFirstName, adminLastName, adminRoot_ID, adminEmail, JWT_TOKEN, and DATABASE_ID')
    }

    console.log(`Creating Administrator "${adminName}" in group ${concernedGroupId}...`)

    const sdk = await initSdk()

    const hcpId = v4()
    const userId = v4()

    const administratorHcp = new HealthcareParty({
      id: hcpId,
      name: adminName,
      firstName: adminFirstName,
      lastName: adminLastName,
      parentId: adminRoot_ID,
      public: false,
      tags: [new CodeStub({ id: HcpTag.ADMINISTRATOR, code: HcpTag.ADMINISTRATOR, type: HcpTag.ADMINISTRATOR, version: '1' })],
    })
    const administratorUser = new User({ id: userId, email: adminEmail, name: adminName, healthcarePartyId: hcpId })

    const createdAdministratorHcp = await sdk.healthcareParty.inGroup.createHealthcareParty(new GroupScoped({ groupId: concernedGroupId, entity: administratorHcp }))
    const createdAdministratorUser = await sdk.user.inGroup.createUser(new GroupScoped({ groupId: concernedGroupId, entity: administratorUser }))

    const apiEndpoint = `${ICURE_API_URL}/rest/v2/user/${userId}/inGroup/${concernedGroupId}/roles/set`
    const requestBody = {
      ids: [SCRIPT_ROLE_ADMINISTRATOR, SCRIPT_ROLE_HEAD_OF_SERVICE, SCRIPT_ROLE_CITY_WORKER],
    }
    const requestHeaders = {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    }

    await axios.post(apiEndpoint, requestBody, { headers: requestHeaders })

    console.log('✅ Successfully created new Administrator!')
    console.log('---')
    console.log(`HCP ID: ${createdAdministratorHcp.entity.id}`)
    console.log(`Name: ${createdAdministratorHcp.entity.name}`)
    console.log(`User ID: ${createdAdministratorUser.entity.id}`)
    console.log(`Email: ${createdAdministratorUser.entity.email}`)
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('---')
  } catch (error) {
    console.error('❌ An error occurred while creating the Administrator:', error)
  }
}

addAdministratorToGroupId()

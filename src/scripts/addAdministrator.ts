import * as dotenv from 'dotenv'
dotenv.config()
import { AuthenticationMethod, CardinalBaseSdk, CodeStub, GroupScoped, HealthcareParty, User } from '@icure/cardinal-sdk'
import axios from 'axios'
import { v4 } from 'uuid'
import { ADMIN_SOLUTIONS_AUTH_TOKEN, ADMIN_SOLUTIONS_EMAIL, DATABASE_ID, ICURE_API_URL, ICURE_NIGHTLY_URL, SCRIPT_ROLE_ADMINISTRATOR, SCRIPT_ROLE_CITY_WORKER, SCRIPT_ROLE_HEAD_OF_SERVICE, HcpTag } from './utils'

async function addAdministratorToGroupId() {
  const sdk = await CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL!, ADMIN_SOLUTIONS_AUTH_TOKEN!), { lenientJson: true })

  // Modify this to the correct databaseId
  const concernedGroupId = DATABASE_ID!

  // - Get the auth Token from making a request on cockpit
  // - You can get the AdminRoot ID by either
  //    1) Running the addAdminRoot script and we console.log the resulting object, giving you the id
  //    2) Running the getAdminRoot script, which console.logs the AdminRoot object

  const hcpId = v4()
  const userId = v4()
  const adminName = 'Olivier M'
  const adminFirstName = 'Olivier'
  const adminLastName = 'Maréchal'
  const adminRoot_ID = ''
  const adminEmail = ''
  const JWT_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJwcCI6IlFJYjFId0FBQUlhclZGVlZWYTFVVmF1cXFxQ0txcXFxaWdvQUNGQXBCUVBndjBNUkFnRUFHQT09IiwiaGgiOltdLCJhIjpbIlJPTEVfVVNFUiIsIlJPTEVfSENQIiwiUk9MRV9BRE1JTklTVFJBVE9SIl0sInIiOiJiNGJkYjI2Mi1kOWY3LTRmMjMtYWVlNC1kOGY2ZDM5YjI2N2IiLCJ1IjoiZjg1MDRlNTMtMWNlOS00MDIzLWE0OTAtZTVkMGEyZGNlMzFkIiwiZyI6ImljLW9tYXJlY2gtNjE0OTRiNzEtMmQxMC00Mjc5LThiYmMtOGY3NzZmMDEyMDAwIiwidGFjIjozMCwiZG9UcCI6IkhDUCIsImRvSWQiOiJjODhlZDJiNy1lYWZmLTQ5NWQtOTVmYS01Y2I0MmYxNWI5YjciLCJleHAiOjE3NzMxNTcwODEsInNhIjoxLCJtYWMiOjIwfQ.By6OmRBfUyz0C_FG5TQAR1l2nWM9TFgM56j88rj6-xlz77Y9o_cQhV0qNJQBtnoA95Sqo9K2LrjmNBeBt_kMM2W1aESnDcnRwrHSaPUbFIGw8pXbF_5mBgtriapE-qxQNkehvNV9tsDqIxMgxVWaJmMwlxoStNUkcHQK9N8-igfow_7EXHPo2J1oU-hloT9e3eJKeD6FNrFXuQ7_Zav-s71P-PVKUK--ARZltT117pRH8flcFtQv0hAnYFHY4xJbLKHGq-UW6bCpAWZATh5zB5pwtzIk9RBg-Wb3CGYsNAhIZj2V6jRqNkQv8EvlCh17X2ebER7o1PE3GpFtHtN4yA'

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

  try {
    console.log(`Creating Administrator "${administratorHcp.name}" in group ${concernedGroupId}...`)

    if (!hcpId || !userId || !adminName || !adminFirstName || !adminLastName || !adminRoot_ID || !adminEmail || !JWT_TOKEN || !concernedGroupId) {
      throw new Error('Missing mandatory args')
    }

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
    console.log(`Group ID: ${concernedGroupId}`)
    console.log('Administrator HCP ---')
    console.log(`ID: ${createdAdministratorHcp.entity.id}`)
    console.log(`Name: ${createdAdministratorHcp.entity.name}`)
    console.log('Administrator HCP ---')
    console.log('Administrator USER ---')
    console.log(`ID: ${createdAdministratorUser.entity.id}`)
    console.log(`Name: ${createdAdministratorUser.entity.name}`)
    console.log(`Email: ${createdAdministratorUser.entity.email}`)
    console.log('Administrator USER ---')
  } catch (error) {
    console.error('❌ An error occurred while creating the Administrator:', error)
  }
}

addAdministratorToGroupId()

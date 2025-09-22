import * as dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'
import { DATABASE_ID, EMAIL_TEMPLATE, SPEC_ID } from './consts'

/*
What you need to modify here :

- Global admin jwt. Get it by making any request from the cockpit.
- Modify the emailLanguage, it's basically just a tag. For example fr, nl, en, de
- Modify the emailSubject. For example : "Welcome {{firstName}}"
- Modify the emailBody. For example : "<div>Welcome {{firstName}}<br><div>How are you today on this {{date}}</div>"

*/

async function addEmailProcess() {
  const JWT_TOKEN = ''
  const emailLanguage = ''

  const emailSubject = ''
  const emailBody = ''

  try {
    const apiEndpoint = `https://msg-gw.icure.cloud/${SPEC_ID}/process/template/${EMAIL_TEMPLATE}/${DATABASE_ID}?language=${emailLanguage}`
    const requestBody = {
      subject: emailSubject,
      body: emailBody,
    }
    const requestHeaders = {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    }

    console.log(`📡 Making POST request to ${apiEndpoint}...`)

    // 4. Use axios to make the authenticated request
    const response = await axios.post(apiEndpoint, requestBody, { headers: requestHeaders })

    const processId = response.data.id
    if (!processId) {
      throw new Error('Response did not contain a process ID.')
    }

    console.log('✅ Successfully created email process!')
    console.log(`➡️  Process ID: ${processId}`)
    console.log('You can now store this ID to use in your frontend.')
  } catch (error) {
    console.error('❌ An error occurred while creating the email process.')
    if (error.response) {
      console.error('Error Status:', error.response.status)
      console.error('Error Data:', error.response.data)
    } else {
      console.error('Error Message:', error.message)
    }
  }
}

addEmailProcess()

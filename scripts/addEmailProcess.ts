import * as dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'
import { DATABASE_ID, EMAIL_TEMPLATE, SPEC_ID } from './consts'

async function addEmailProcess() {
  const JWT_TOKEN = ''
  const emailLanguage = ''
  const emailSubject = ''
  const emailBody = ''

  try {
    if (!JWT_TOKEN || !emailLanguage || !emailSubject || !emailBody) {
      throw new Error('Missing mandatory args')
    }

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

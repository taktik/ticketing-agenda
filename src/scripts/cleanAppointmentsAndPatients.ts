import * as dotenv from 'dotenv'
dotenv.config()

import { CalendarItemFilters, EntityReferenceInGroup, HealthcarePartyFilters, PatientFilters, UserFilters } from '@icure/cardinal-sdk'
import { DATABASE_ID, HcpTag, initSdk, loadFromIterator } from './utils'

const BATCH_SIZE = 100

async function cleanAppointmentsAndPatients() {
  const concernedGroupId = DATABASE_ID

  try {
    if (!concernedGroupId) {
      throw new Error('Missing mandatory args: fill in DATABASE_ID in utils.ts')
    }

    const sdk = await initSdk()

    // Resolve ALL data owners (adminRoot, siteRoot, sites, administrators)
    // so we can query patients/calendarItems visible to any of them
    console.log('Resolving all data owners...')
    const allHcpTags = [HcpTag.ADMIN_ROOT, HcpTag.SITE_ROOT, HcpTag.SITE, HcpTag.ADMINISTRATOR]
    const dataOwnerRefs: EntityReferenceInGroup[] = []

    for (const tag of allHcpTags) {
      const groupScopedHcps = await loadFromIterator(await sdk.healthcareParty.inGroup.filterHealthPartiesBy(concernedGroupId, HealthcarePartyFilters.byTag(tag, { tagCode: tag })), 1000)
      for (const gs of groupScopedHcps) {
        dataOwnerRefs.push(new EntityReferenceInGroup({ entityId: gs.entity.id, groupId: concernedGroupId }))
        console.log(`  Found ${tag}: ${gs.entity.name ?? gs.entity.firstName ?? gs.entity.id}`)
      }
    }
    console.log(`Total data owners: ${dataOwnerRefs.length}`)

    // --- 1. Delete all CalendarItems (appointments) ---
    // Use matchCalendarItemsBy (returns IDs only, no decryption needed) across all data owners
    console.log('\nFetching CalendarItems from all data owners...')
    const allCalendarItemIds = new Set<string>()
    for (const ref of dataOwnerRefs) {
      const ids = await sdk.calendarItem.inGroup.matchCalendarItemsBy(concernedGroupId, CalendarItemFilters.lifecycleBetweenForDataOwnerInGroup(ref, undefined, undefined, false))
      ids.forEach((id) => allCalendarItemIds.add(id))
    }
    console.log(`Found ${allCalendarItemIds.size} unique CalendarItem(s) to delete.`)

    if (allCalendarItemIds.size > 0) {
      const idArray = Array.from(allCalendarItemIds)
      for (let i = 0; i < idArray.length; i += BATCH_SIZE) {
        const batchIds = idArray.slice(i, i + BATCH_SIZE)
        const items = await sdk.calendarItem.inGroup.getCalendarItems(concernedGroupId, batchIds)
        if (items.length > 0) {
          await sdk.calendarItem.inGroup.deleteCalendarItems(items)
        }
        console.log(`Deleted CalendarItems ${i + 1}–${Math.min(i + BATCH_SIZE, idArray.length)} / ${idArray.length}`)
      }
      console.log('✅ All CalendarItems deleted.')
    }

    // --- 2. Delete all Patients and their associated Users ---
    // Use matchPatientsBy (returns IDs only) across all data owners
    console.log('\nFetching Patients from all data owners...')
    const allPatientIds = new Set<string>()
    for (const ref of dataOwnerRefs) {
      const ids = await sdk.patient.inGroup.matchPatientsBy(concernedGroupId, PatientFilters.allPatientsForDataOwnerInGroup(ref))
      ids.forEach((id) => allPatientIds.add(id))
    }
    console.log(`Found ${allPatientIds.size} unique Patient(s) to delete.`)

    if (allPatientIds.size > 0) {
      const idArray = Array.from(allPatientIds)

      // Find and delete patient-linked users first
      let deletedUserCount = 0
      for (const patientId of idArray) {
        try {
          const userIterator = await sdk.user.inGroup.filterUsersBy(concernedGroupId, UserFilters.byPatientId(patientId))
          const hasNext = await userIterator.hasNext()
          if (hasNext) {
            const users = await userIterator.next(10)
            for (const groupScopedUser of users) {
              await sdk.user.inGroup.deleteUser(groupScopedUser)
              deletedUserCount++
            }
          }
        } catch {
          // Patient may not have an associated user — skip
        }
      }
      console.log(`  Deleted ${deletedUserCount} patient-linked User(s).`)

      // Delete patients in batches via getPatients + deletePatients
      for (let i = 0; i < idArray.length; i += BATCH_SIZE) {
        const batchIds = idArray.slice(i, i + BATCH_SIZE)
        const patients = await sdk.patient.inGroup.getPatients(concernedGroupId, batchIds)
        if (patients.length > 0) {
          await sdk.patient.inGroup.deletePatients(patients)
        }
        console.log(`  Deleted Patients ${i + 1}–${Math.min(i + BATCH_SIZE, idArray.length)} / ${idArray.length}`)
      }
      console.log('✅ All Patients and their Users deleted.')
    }

    console.log('\n✅ Cleanup complete. Agendas, CalendarItemTypes, HealthcareParties, and HCP-linked Users are untouched.')
  } catch (error) {
    console.error('❌ An error occurred during cleanup:', error)
  }
}

cleanAppointmentsAndPatients()

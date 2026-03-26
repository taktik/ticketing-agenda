import { AccessLevel, Annotation, CodeStub, ContactFilters, DecryptedContact, DecryptedService, Patient } from '@icure/cardinal-sdk'
import { createApi } from '@reduxjs/toolkit/query/react'
import { v4 } from 'uuid'
import { cardinalApi } from '../services/auth.api'
import { baseQueryWithRetry, guard, loadFromIterator } from './utils'

const INTERNAL_NOTE_TAG_TYPE = 'CALENDARITEM_INTERNAL_NOTE'
const NOTE_LANG = 'xx'

export enum ContactApiTags {
  Contact = 'Contact',
}

export const contactApiRtk = createApi({
  reducerPath: 'contactApi',
  tagTypes: [ContactApiTags.Contact],
  baseQuery: baseQueryWithRetry,
  endpoints: (builder) => ({
    getContactByCalendarItemId: builder.query<DecryptedContact | undefined, string>({
      async queryFn(calendarItemId, { getState }) {
        const cApi = (await cardinalApi(getState))?.contact
        return guard([cApi], async (): Promise<DecryptedContact | undefined> => {
          const contacts = await loadFromIterator(
            await cApi!.filterContactsBy(ContactFilters.byServiceTagForSelf(INTERNAL_NOTE_TAG_TYPE, { tagCode: calendarItemId })),
            10,
          )
          return contacts[0] ? new DecryptedContact(contacts[0]) : undefined
        })
      },
      providesTags: (_, __, calendarItemId) => [{ type: ContactApiTags.Contact, id: calendarItemId }],
    }),

    createOrUpdateContactNote: builder.mutation<
      DecryptedContact | undefined,
      { calendarItemId: string; note: string; delegates: { siteRootId: string; adminRootId: string }; existingContact?: DecryptedContact; patient: Patient }
    >({
      async queryFn({ calendarItemId, note, delegates, existingContact, patient }, { getState }) {
        const { siteRootId, adminRootId } = delegates
        const cApi = (await cardinalApi(getState))?.contact
        return guard([cApi], async (): Promise<DecryptedContact | undefined> => {
          if (existingContact) {
            const existingService = existingContact.services[0]
            const updatedService = new DecryptedService({
              ...existingService,
              notes: [new Annotation({ id: existingService?.notes[0]?.id ?? v4(), markdown: { [NOTE_LANG]: note } })],
            })
            const result = await cApi!.modifyContact(new DecryptedContact({ ...existingContact, services: [updatedService] }))
            return result ? new DecryptedContact(result) : undefined
          } else {
            const newContact = new DecryptedContact({
              id: v4(),
              services: [
                new DecryptedService({
                  id: v4(),
                  tags: [new CodeStub({ type: INTERNAL_NOTE_TAG_TYPE, code: calendarItemId })],
                  notes: [new Annotation({ id: v4(), markdown: { [NOTE_LANG]: note } })],
                }),
              ],
            })
            const withMeta = await cApi!.withEncryptionMetadata(newContact, patient, {
              delegates: {
                [siteRootId]: AccessLevel.Write,
                [adminRootId]: AccessLevel.Write,
              },
            })
            const result = await cApi!.createContact(withMeta)
            return result ? new DecryptedContact(result) : undefined
          }
        })
      },
      invalidatesTags: (_, __, { calendarItemId }) => [{ type: ContactApiTags.Contact, id: calendarItemId }],
    }),

    deleteContactByCalendarItemId: builder.mutation<undefined, string>({
      async queryFn(calendarItemId, { getState }) {
        const cApi = (await cardinalApi(getState))?.contact
        return guard([cApi], async (): Promise<undefined> => {
          const contacts = await loadFromIterator(
            await cApi!.filterContactsBy(ContactFilters.byServiceTagForSelf(INTERNAL_NOTE_TAG_TYPE, { tagCode: calendarItemId })),
            10,
          )
          if (contacts[0]) {
            await cApi!.deleteContact(contacts[0])
          }
          return undefined
        })
      },
      invalidatesTags: (_, __, calendarItemId) => [{ type: ContactApiTags.Contact, id: calendarItemId }],
    }),
  }),
})

export const NOTE_LANG_KEY = NOTE_LANG

export const { useGetContactByCalendarItemIdQuery, useCreateOrUpdateContactNoteMutation, useDeleteContactByCalendarItemIdMutation } = contactApiRtk

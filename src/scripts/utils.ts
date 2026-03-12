import { AuthenticationMethod, CardinalBaseSdk, PaginatedListIterator } from '@icure/cardinal-sdk'

// Script-only constants — fill in before running any script, revert after
export const ADMIN_SOLUTIONS_EMAIL = '' // get the email through icure dashboard
export const ADMIN_SOLUTIONS_AUTH_TOKEN = '' // get the token through icure dashboard
export const ICURE_NIGHTLY_URL = '' // e.g. 'https://nightly.icure.cloud'
export const ICURE_API_URL = '' // e.g. 'https://api.icure.cloud'
export const DATABASE_ID = '' // e.g. 'ic-xxxxx'
export const EMAIL_TEMPLATE = '' // request the template id of the solution to icure
export const SPEC_ID = '' // external services spec id

// Script-only role IDs (adapt as needed)
export const SCRIPT_ROLE_ADMINISTRATOR = '' // e.g. 'ic-xxxxx:ADMINISTRATOR'
export const SCRIPT_ROLE_HEAD_OF_SERVICE = '' // e.g. 'ic-xxxxx:HEAD_OF_SERVICE'
export const SCRIPT_ROLE_CITY_WORKER = '' // e.g. 'ic-xxxxx:CITY_WORKER'

export enum HcpTag {
  SITE_ROOT = 'SITE_ROOT',
  ADMIN_ROOT = 'ADMIN_ROOT',
  SITE = 'SITE',
  ADMINISTRATOR = 'ADMINISTRATOR',
}

export async function initSdk() {
  if (!ADMIN_SOLUTIONS_EMAIL || !ADMIN_SOLUTIONS_AUTH_TOKEN || !ICURE_NIGHTLY_URL) {
    throw new Error('Missing SDK credentials: fill in ADMIN_SOLUTIONS_EMAIL, ADMIN_SOLUTIONS_AUTH_TOKEN, and ICURE_NIGHTLY_URL in utils.ts')
  }
  return CardinalBaseSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernameLongToken(ADMIN_SOLUTIONS_EMAIL, ADMIN_SOLUTIONS_AUTH_TOKEN), { lenientJson: true })
}

export async function loadFromIterator<T>(paginatedListIterator: PaginatedListIterator<T>, min: number, acc: T[] = []): Promise<T[]> {
  // Get the next page of healthcare parties
  const hasNext = await paginatedListIterator?.hasNext()
  const page = hasNext ? await paginatedListIterator?.next(min) : []

  // Check if we've met the required minimum count
  const items: T[] = [...acc, ...page]
  if (page.length === 0 || items.length >= min) {
    return items
  }

  // Recursively load the next page
  return loadFromIterator<T>(paginatedListIterator, min, items)
}

import { PaginatedListIterator } from '@icure/cardinal-sdk'

// Script-only constants — fill in before running any script, revert after
export const ADMIN_SOLUTIONS_AUTH_TOKEN = '' // get the token through icure dashboard
export const ADMIN_SOLUTIONS_EMAIL = '' // get the email through icure dashboard
export const ICURE_NIGHTLY_URL = '' // e.g. 'https://nightly.icure.cloud'
export const ICURE_API_URL = '' // e.g. 'https://api.icure.cloud'
export const DATABASE_ID = '' // e.g. 'ic-xxxxx'
export const EMAIL_TEMPLATE = '' // request the template id of the solution to icure
export const SPEC_ID = '' // external services spec id

// Script-only role IDs (adapt as needed)
export const SCRIPT_ROLE_ADMINISTRATOR = 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:ADMINISTRATOR'
export const SCRIPT_ROLE_HEAD_OF_SERVICE = 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:HEAD_OF_SERVICE'
export const SCRIPT_ROLE_CITY_WORKER = 'ic-omarech-61494b71-2d10-4279-8bbc-8f776f012000:CITY_WORKER'

export enum HcpTag {
  SITE_ROOT = 'SITE_ROOT',
  ADMIN_ROOT = 'ADMIN_ROOT',
  SITE = 'SITE',
  ADMINISTRATOR = 'ADMINISTRATOR',
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

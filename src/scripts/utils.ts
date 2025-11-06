import { PaginatedListIterator } from '@icure/cardinal-sdk'

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

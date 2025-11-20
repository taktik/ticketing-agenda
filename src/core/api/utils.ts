import { PaginatedListIterator, RecoveryResult } from '@icure/cardinal-sdk'
import { FetchArgs, fetchBaseQuery, FetchBaseQueryError, retry } from '@reduxjs/toolkit/query'

export async function loadFromIterator<T>(paginatedListIterator: PaginatedListIterator<T>, min: number, acc: T[] = []): Promise<T[]> {
  const hasNext = await paginatedListIterator?.hasNext()
  const page = hasNext ? await paginatedListIterator?.next(min) : []

  const items: T[] = [...acc, ...page]
  if (page.length === 0 || items.length >= min) {
    return items
  }

  return loadFromIterator<T>(paginatedListIterator, min, items)
}

export const tagById =
  <TagType extends string>(tagType: TagType) =>
  (result: { id?: string }) =>
    result?.id ? [{ type: tagType, id: result.id }] : []

export const tagsByIds =
  <TagType extends string>(tagType: TagType, listMarker?: string) =>
  (result: { id?: string }[] | undefined) => {
    const listMarkerTag = listMarker ? [{ type: tagType, id: listMarker }] : []
    return result ? result.map(({ id }: { id?: string }) => ({ type: tagType, id })).concat(listMarkerTag) : []
  }

  function getError(e: Error): FetchBaseQueryError {
    return { status: 'CUSTOM_ERROR', error: e.message, data: e }
  }
  
  const pause = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration))
export const guard = async <T>(guardedInputs: unknown[], lambda: () => Promise<T>, options?: { maxRetries: number; baseDelay: number }): Promise<{ error: FetchBaseQueryError } | { data: T | undefined }> => {
  if (guardedInputs.some((x) => !x)) {
    return { data: undefined }
  }

  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.baseDelay ?? 1000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await lambda()

      const curate = (result: T): T => {
        if (result === null || result === undefined) {
          return null as T
        } else if (Array.isArray(result)) {
          return result.map(curate) as T
        } else {
          return result as T
        }
      }

      return { data: curate(res) }
    } catch (e: any) {
      const isLastAttempt = attempt === maxRetries

      const status = e?.status || e?.statusCode || 0

      const isClientError = typeof status === 'number' && status >= 400 && status < 500

      if (isClientError || isLastAttempt) {
        if (isLastAttempt) console.error(`Guard failed after ${attempt} retries:`, e)
        return { error: getError(e) }
      }

      const delay = baseDelay * Math.pow(2, attempt)
      await pause(delay)
    }
  }
  return { error: { status: 'TIMEOUT_ERROR', error: 'Operation timed out' } }
}

export function isRecoverySuccess(result: RecoveryResult<any>): result is RecoveryResult.Success<any> {
  return result.$ktClass === 'com.icure.cardinal.sdk.crypto.entities.RecoveryResult.Success'
}

export function isRecoveryFailure(result: RecoveryResult<any>): result is RecoveryResult.Failure {
  return result.$ktClass === 'com.icure.cardinal.sdk.crypto.entities.RecoveryResult.Failure'
}

const baseQuery = fetchBaseQuery({
  baseUrl: '/',
})

export const baseQueryWithRetry = retry(
  async (args: string | FetchArgs, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions)

    if (!result.error) {
      return result
    }

    const { status } = result.error as { status: number | string }
    const method = typeof args === 'string' ? 'GET' : args.method || 'GET'

    if (typeof status === 'number' && status >= 400 && status < 500) {
      retry.fail(result.error, result.meta)
    }

    const isMutation = method !== 'GET'
    const isNetworkError = status === 'FETCH_ERROR'
    const forceRetry = (extraOptions as any)?.retryMutations

    if (isMutation && !isNetworkError && !forceRetry) {
      retry.fail(result.error, result.meta)
    }

    return result
  },
  {
    maxRetries: 3,
  },
)

export async function retryFn<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries <= 0) throw err
    await new Promise((res) => setTimeout(res, delay))
    return retryFn(fn, retries - 1, delay * 2)
  }
}

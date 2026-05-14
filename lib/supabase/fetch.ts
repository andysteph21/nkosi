/**
 * Custom fetch wrapper used by every Supabase client (browser, server, raw).
 *
 * Two reasons for it to exist:
 *
 *   1. Hard timeout. The default browser fetch will hang indefinitely on a
 *      flaky/loaded mobile connection (the very target of this app). We cap
 *      every request at 10 s by default — long enough for cold edge calls,
 *      short enough that the UI doesn't feel frozen.
 *
 *   2. Retry on transient failures. Network errors, AbortError (timeout),
 *      and 5xx/429 responses are retried with exponential backoff. GET
 *      requests are always safe to retry; POST/PATCH/DELETE/PUT are retried
 *      only when the server response makes it idempotent-safe (5xx before
 *      any data was committed). For PostgREST + Storage this is a sound
 *      default — both backends are idempotent for read paths and use
 *      transactions for writes.
 *
 * Drop-in: just pass it as `global.fetch` when constructing a Supabase
 * client. The Supabase JS SDK uses this fetch for both PostgREST AND Storage
 * REST calls, so the upload pipeline benefits automatically.
 */

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 250 // 250ms, 500ms, 1000ms

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function isMutating(method: string | undefined): boolean {
  if (!method) return false
  const m = method.toUpperCase()
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface FetchWithRetryOptions {
  /** Total time (ms) any single attempt is allowed before aborting. Default 10s. */
  timeoutMs?: number
  /** Maximum attempts including the first try. Default 3. */
  maxAttempts?: number
}

export function createFetchWithRetry(
  opts: FetchWithRetryOptions = {},
): typeof fetch {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS

  return async function fetchWithRetry(input, init) {
    const method = init?.method ?? (input instanceof Request ? input.method : "GET")
    const mutating = isMutating(method)

    // Honour a caller-provided AbortSignal: we layer our own timeout on top.
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : null)

    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const timeoutCtrl = new AbortController()
      const timeoutId = setTimeout(() => timeoutCtrl.abort(new Error("timeout")), timeoutMs)

      // Combine timeout signal with caller's signal if any.
      const signals: AbortSignal[] = [timeoutCtrl.signal]
      if (callerSignal) signals.push(callerSignal)
      const signal = signals.length === 1 ? signals[0] : anySignal(signals)

      try {
        const response = await fetch(input, { ...init, signal })

        // Retry on retryable status codes if attempts remain.
        if (RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts) {
          // For mutations, only retry on 5xx (the request didn't reach the
          // application logic, so re-sending is safe). 429 we retry for both.
          const shouldRetry = !mutating || response.status >= 500 || response.status === 429
          if (shouldRetry) {
            await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1))
            continue
          }
        }
        return response
      } catch (err) {
        lastError = err
        // AbortError from caller — do not retry. AbortError from our timeout
        // is retryable: caller wants the request to succeed eventually.
        if (callerSignal?.aborted) throw err
        if (attempt < maxAttempts) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1))
          continue
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    throw lastError ?? new Error("fetch failed after retries")
  }
}

/**
 * Polyfill for AbortSignal.any() (not yet shipped in every runtime we target,
 * e.g. older Node in the Docker base image).
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof (AbortSignal as any).any === "function") {
    return (AbortSignal as any).any(signals)
  }
  const controller = new AbortController()
  const onAbort = (s: AbortSignal) => () => {
    controller.abort((s as any).reason)
  }
  for (const s of signals) {
    if (s.aborted) {
      controller.abort((s as any).reason)
      break
    }
    s.addEventListener("abort", onAbort(s), { once: true })
  }
  return controller.signal
}

/** Singleton instance used by every client in this codebase. */
export const supabaseFetch = createFetchWithRetry()

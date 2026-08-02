const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 530, 540])

type RetryOptions = {
  attempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  sleep?: (delayMs: number) => Promise<void>
}

export class RetryableExternalError extends Error {
  readonly retryAfterMs: number | null

  constructor(message: string, retryAfterMs: number | null = null) {
    super(message)
    this.name = "RetryableExternalError"
    this.retryAfterMs = retryAfterMs
  }
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status)
}

export function retryAfterMilliseconds(value: string | null, now = Date.now()): number | null {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now) : null
}

export function retryableHttpError(service: string, response: Response): RetryableExternalError {
  return new RetryableExternalError(
    `${service}で一時的なエラーが発生しました (HTTP ${response.status})`,
    retryAfterMilliseconds(response.headers.get("retry-after")),
  )
}

export async function withExternalRetry<T>(
  label: string,
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3)
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 1_000)
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 5_000)
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)))

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      const canRetry = error instanceof RetryableExternalError && attempt < attempts
      if (!canRetry) throw error
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)))
      const delayMs = Math.min(maxDelayMs, error.retryAfterMs ?? exponentialDelay)
      console.warn(`[external-retry] ${label} attempt ${attempt}/${attempts} failed; retrying in ${delayMs}ms: ${error.message}`)
      await sleep(delayMs)
    }
  }

  throw new Error(`${label}の再試行が完了しませんでした`)
}

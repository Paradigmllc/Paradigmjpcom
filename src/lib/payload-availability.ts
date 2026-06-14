const DEFAULT_COOLDOWN_MS = 30_000

let lastFailureAt = 0
let lastFailureMessage = ""
let consecutiveFailures = 0

function cooldownMs(): number {
  const raw = process.env.PAYLOAD_INIT_FAILURE_COOLDOWN_MS
  if (!raw) return DEFAULT_COOLDOWN_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 5_000 ? parsed : DEFAULT_COOLDOWN_MS
}

export function payloadInitCooldownRemainingMs(): number {
  if (lastFailureAt === 0) return 0
  return Math.max(0, cooldownMs() - (Date.now() - lastFailureAt))
}

export function isPayloadInitCoolingDown(): boolean {
  return payloadInitCooldownRemainingMs() > 0
}

export function arePayloadReadsDisabled(): boolean {
  return (
    process.env.PAYLOAD_READS_DISABLED === "1" ||
    process.env.PAYLOAD_READS_DISABLED_DURING_BUILD === "1"
  )
}

export function shouldSkipPayloadReads(): boolean {
  return arePayloadReadsDisabled() || isPayloadInitCoolingDown()
}

export function markPayloadInitFailure(error: unknown): void {
  lastFailureAt = Date.now()
  consecutiveFailures++
  lastFailureMessage = error instanceof Error ? error.message : String(error)
}

/** Clear cooldown after successful connection — indicates recovery */
export function resetPayloadCooldown(): void {
  lastFailureAt = 0
  consecutiveFailures = 0
  lastFailureMessage = ""
}

export function getPayloadInitFailureMessage(): string {
  return lastFailureMessage
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures
}

/**
 * Execute fn with automatic retry before marking failure.
 * Retries up to 2 times with 500ms/1000ms backoff before entering cooldown.
 */
export async function withPayloadRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await fn()
      // Success clears the cooldown
      if (attempt > 0) resetPayloadCooldown()
      return result
    } catch (e) {
      lastError = e
      if (attempt < 2) {
        const delay = 500 * (attempt + 1)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  markPayloadInitFailure(lastError)
  throw lastError
}

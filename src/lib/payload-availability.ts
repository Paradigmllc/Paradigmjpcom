const INITIAL_COOLDOWN_MS = 5_000
const MAX_COOLDOWN_MS = 60_000

let lastFailureAt = 0
let lastFailureMessage = ""
let consecutiveFailures = 0

function cooldownMs(): number {
  const override = process.env.PAYLOAD_INIT_FAILURE_COOLDOWN_MS
  if (override) {
    const parsed = Number(override)
    if (Number.isFinite(parsed) && parsed >= 1_000) return parsed
  }
  // Exponential backoff: 5s → 10s → 20s → 40s → 60s cap
  const backoff = Math.min(INITIAL_COOLDOWN_MS * Math.pow(2, Math.min(consecutiveFailures, 4)), MAX_COOLDOWN_MS)
  return backoff
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
 * Retries up to 5 times with exponential backoff (500ms → 1s → 2s → 4s → 8s).
 */
export async function withPayloadRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await fn()
      if (attempt > 0) resetPayloadCooldown()
      return result
    } catch (e) {
      lastError = e
      if (attempt < 4) {
        const delay = 500 * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  markPayloadInitFailure(lastError)
  throw lastError
}

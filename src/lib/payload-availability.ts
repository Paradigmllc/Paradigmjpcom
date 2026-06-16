const INITIAL_COOLDOWN_MS = 3_000
const MAX_COOLDOWN_MS = 60_000
const MAX_CONSECUTIVE_BEFORE_SLACK = 3

let lastFailureAt = 0
let lastFailureMessage = ""
let consecutiveFailures = 0
let lastSuccessAt = 0
let totalFailuresSinceStart = 0
let totalSuccessesSinceStart = 0

function cooldownMs(): number {
  const override = process.env.PAYLOAD_INIT_FAILURE_COOLDOWN_MS
  if (override) {
    const parsed = Number(override)
    if (Number.isFinite(parsed) && parsed >= 1_000) return parsed
  }
  // Exponential backoff: 3s → 6s → 12s → 24s → 48s → 60s cap
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
  totalFailuresSinceStart++
  lastFailureMessage = error instanceof Error ? error.message : String(error)

  // Classify error for better diagnostics
  const msg = lastFailureMessage.toLowerCase()
  if (msg.includes("echeckouttimeout") || msg.includes("unable to check out")) {
    console.warn(`[payload-availability] POOL EXHAUSTION detected (attempt ${consecutiveFailures}): ${lastFailureMessage.slice(0, 200)}`)
    console.warn(`[payload-availability] Supabase Pooler connection pool is exhausted. Check: 1) Pooler mode (Transaction recommended) 2) max pool size 3) Supabase project status`)
  }

  // Notify on first failure, then every MAX_CONSECUTIVE_BEFORE_SLACK failures
  if (consecutiveFailures === 1 || consecutiveFailures % MAX_CONSECUTIVE_BEFORE_SLACK === 0) {
    notifyPayloadUnavailable(lastFailureMessage, consecutiveFailures).catch((e) => { console.error("[payload-availability] notify failed:", e) })
  }
}

async function notifyPayloadUnavailable(message: string, count: number): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    const isPoolExhaustion = message.toLowerCase().includes("echeckouttimeout") || message.toLowerCase().includes("unable to check out")
    await notifyBothChannels("sales", {
      title: isPoolExhaustion
        ? `🚨 PayloadCMS 接続プール枯渇 (${count}回目)`
        : `⚠️ PayloadCMS DB接続失敗 (${count}回目)`,
      message: message.slice(0, 200),
      type: "payload_db_unavailable",
    })
  } catch (e) { console.warn("[payload-availability] notification failed:", e) }
}

/** Clear cooldown after successful connection — indicates recovery */
export function resetPayloadCooldown(): void {
  lastFailureAt = 0
  consecutiveFailures = 0
  lastFailureMessage = ""
  lastSuccessAt = Date.now()
  totalSuccessesSinceStart++
}

export function getPayloadInitFailureMessage(): string {
  return lastFailureMessage
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures
}

export interface PayloadPoolMetrics {
  consecutiveFailures: number
  totalFailuresSinceStart: number
  totalSuccessesSinceStart: number
  cooldownRemainingMs: number
  isCoolingDown: boolean
  lastFailureAt: number | null
  lastSuccessAt: number | null
  lastFailureMessage: string
  cooldownTotalMs: number
}

export function getPayloadPoolMetrics(): PayloadPoolMetrics {
  return {
    consecutiveFailures,
    totalFailuresSinceStart,
    totalSuccessesSinceStart,
    cooldownRemainingMs: payloadInitCooldownRemainingMs(),
    isCoolingDown: isPayloadInitCoolingDown(),
    lastFailureAt: lastFailureAt > 0 ? lastFailureAt : null,
    lastSuccessAt: lastSuccessAt > 0 ? lastSuccessAt : null,
    lastFailureMessage,
    cooldownTotalMs: cooldownMs(),
  }
}

/**
 * Execute fn with automatic retry before marking failure.
 * Retries up to 3 times with exponential backoff (500ms → 1s → 2s).
 * Reduced from 5 retries to avoid contributing to pool exhaustion in pooler cases.
 */
function isNextControlFlowError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
  )
}

export async function withPayloadRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  let actualError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await fn()
      if (attempt > 0) resetPayloadCooldown()
      return result
    } catch (e) {
      lastError = e
      const msg = e instanceof Error ? e.message.toLowerCase() : ""
      // NEXT_REDIRECT / NEXT_NOT_FOUND are Next.js internal control flow, NOT db failures
      if (isNextControlFlowError(e)) {
        actualError = e
        break
      }
      // Do not retry on pool exhaustion — retries make pooler situation worse
      if (msg.includes("echeckouttimeout") || msg.includes("unable to check out")) {
        actualError = e
        break
      }
      actualError = e
      if (attempt < 2) {
        const delay = 500 * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  // NEXT_REDIRECT/NEXT_NOT_FOUND are expected control flow, don't count as failures
  if (actualError && !isNextControlFlowError(actualError)) {
    markPayloadInitFailure(actualError)
  }
  throw actualError ?? lastError
}

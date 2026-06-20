const INITIAL_COOLDOWN_MS = 3_000
const MAX_COOLDOWN_MS = 60_000
const MAX_CONSECUTIVE_BEFORE_SLACK = 3
const DEFAULT_PUBLIC_READ_TIMEOUT_MS = 1_200
const PUBLIC_PAYLOAD_READS_ENABLED = "PAYLOAD_PUBLIC_READS_ENABLED"

let lastFailureAt = 0
let lastFailureMessage = ""
let consecutiveFailures = 0
let lastSuccessAt = 0
let totalFailuresSinceStart = 0
let totalSuccessesSinceStart = 0
let publicReadProbeInFlight = false

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

export function arePublicPayloadReadsEnabled(): boolean {
  return process.env[PUBLIC_PAYLOAD_READS_ENABLED] === "1"
}

export function shouldSkipPayloadReads(): boolean {
  return arePayloadReadsDisabled() || isPayloadInitCoolingDown()
}

export function shouldSkipPublicPayloadReads(): boolean {
  return shouldSkipPayloadReads() || !arePublicPayloadReadsEnabled()
}

function publicReadTimeoutMs(): number {
  const override = process.env.PAYLOAD_PUBLIC_READ_TIMEOUT_MS
  if (!override) return DEFAULT_PUBLIC_READ_TIMEOUT_MS
  const parsed = Number(override)
  if (!Number.isFinite(parsed)) return DEFAULT_PUBLIC_READ_TIMEOUT_MS
  return Math.max(300, Math.min(parsed, 5_000))
}

function timeoutError(label: string, timeoutMs: number): Error {
  return new Error(`[payload-availability] ${label} timed out after ${timeoutMs}ms`)
}

async function isDatabaseProbablyReachable(timeoutMs = 250): Promise<boolean> {
  const raw = process.env.DATABASE_URI
  if (!raw) return true

  try {
    const url = new URL(raw)
    const host = url.hostname
    const port = Number(url.port || "5432")
    if (!host || !Number.isFinite(port)) return true

    const net = await import("node:net")
    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port, timeout: timeoutMs }, () => {
        socket.destroy()
        resolve(true)
      })
      const fail = () => {
        socket.destroy()
        resolve(false)
      }
      socket.once("error", fail)
      socket.once("timeout", fail)
    })
  } catch (error) {
    console.warn("[payload-availability] database TCP probe skipped:", error)
    return true
  }
}

export async function withPayloadReadFallback<T>(
  label: string,
  read: () => Promise<T>,
  fallback: T,
  timeoutMs: number = publicReadTimeoutMs(),
): Promise<T> {
  if (shouldSkipPublicPayloadReads()) return fallback
  if (publicReadProbeInFlight) return fallback
  if (!(await isDatabaseProbablyReachable())) {
    markPayloadInitFailure(new Error("[payload-availability] database TCP probe failed"), { notify: false })
    return fallback
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  publicReadProbeInFlight = true
  try {
    const result = await Promise.race([
      read(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(label, timeoutMs)), timeoutMs)
      }),
    ])
    resetPayloadCooldown()
    return result
  } catch (error) {
    markPayloadInitFailure(error, { notify: false })
    console.error(`[payload-availability] ${label} failed, using fallback:`, error)
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
    publicReadProbeInFlight = false
  }
}

export function markPayloadInitFailure(error: unknown, options: { notify?: boolean } = {}): void {
  lastFailureAt = Date.now()
  consecutiveFailures++
  totalFailuresSinceStart++
  lastFailureMessage = error instanceof Error ? error.message : String(error)
  const shouldNotify = options.notify !== false

  // Classify error for better diagnostics
  const msg = lastFailureMessage.toLowerCase()
  if (msg.includes("echeckouttimeout") || msg.includes("unable to check out")) {
    console.warn(`[payload-availability] POOL EXHAUSTION detected (attempt ${consecutiveFailures}): ${lastFailureMessage.slice(0, 200)}`)
    console.warn(`[payload-availability] Supabase Pooler connection pool is exhausted. Check: 1) Pooler mode (Transaction recommended) 2) max pool size 3) Supabase project status`)
  }

  // Notify on first failure, then every MAX_CONSECUTIVE_BEFORE_SLACK failures
  if (shouldNotify && (consecutiveFailures === 1 || consecutiveFailures % MAX_CONSECUTIVE_BEFORE_SLACK === 0)) {
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
      // Do not retry on pool exhaustion, disk IO errors, too many clients — retries make it worse
      if (msg.includes("echeckouttimeout") || msg.includes("unable to check out") ||
          msg.includes("too many clients") || msg.includes("remaining connection slots") ||
          msg.includes("disk full") || msg.includes("could not connect") ||
          msg.includes("connection refused") || msg.includes("connect econnrefused")) {
        actualError = e
        break
      }
      actualError = e
      // Only retry on indeterminate errors (e.g. network blip, timeout)
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

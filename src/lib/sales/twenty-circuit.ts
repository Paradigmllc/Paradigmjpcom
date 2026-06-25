// Twenty CRM Circuit Breaker — prevents cascading failures when Twenty is unhealthy.
// After `failureThreshold` consecutive failures within `windowMs`, the circuit opens
// and all calls are rejected for `cooldownMs`. After cooldown, one probe call is allowed;
// if it succeeds the circuit closes; if it fails the cooldown resets.
//
// Twenty is the Sales OS SSOT — all writes flow through it. If it's down, we must
// NOT silently fail (previous behavior). Instead, circuit state is logged and exposed
// so the pipeline can decide whether to queue/retry or alert.

type CircuitState = "closed" | "open" | "half_open"

interface CircuitEntry {
  failures: number
  firstFailureAt: number
  openedAt: number | null
  state: CircuitState
}

const circuits = new Map<string, CircuitEntry>()

const DEFAULT_THRESHOLD = 3
const DEFAULT_WINDOW_MS = 60_000 // 1 minute
const DEFAULT_COOLDOWN_MS = 30_000 // 30 seconds

function now(): number {
  return Date.now()
}

function circuitKey(operation: string): string {
  return `twenty:${operation}`
}

export interface CircuitStatus {
  state: CircuitState
  failures: number
  openedAt: number | null
}

export function getCircuitStatus(operation: string): CircuitStatus {
  const entry = circuits.get(circuitKey(operation))
  if (!entry) return { state: "closed", failures: 0, openedAt: null }
  return { state: entry.state, failures: entry.failures, openedAt: entry.openedAt }
}

export function circuitAllows(operation: string): boolean {
  const key = circuitKey(operation)
  let entry = circuits.get(key)
  if (!entry) {
    circuits.set(key, { failures: 0, firstFailureAt: 0, openedAt: null, state: "closed" })
    return true
  }

  // Purge stale failure window
  if (entry.state === "closed" && entry.failures > 0 && now() - entry.firstFailureAt > DEFAULT_WINDOW_MS) {
    entry.failures = 0
    entry.firstFailureAt = 0
  }

  if (entry.state === "closed") return true

  if (entry.state === "open") {
    if (entry.openedAt && now() - entry.openedAt >= DEFAULT_COOLDOWN_MS) {
      entry.state = "half_open"
      console.warn(`[twenty-circuit] circuit half-open for operation "${operation}" — allowing probe call`)
      return true
    }
    return false
  }

  // half_open — allow one probe
  return true
}

export function circuitReportSuccess(operation: string): void {
  const entry = circuits.get(circuitKey(operation))
  if (!entry) return
  entry.failures = 0
  entry.firstFailureAt = 0
  entry.openedAt = null
  entry.state = "closed"
}

export function circuitReportFailure(operation: string): void {
  const key = circuitKey(operation)
  let entry = circuits.get(key)
  if (!entry) {
    entry = { failures: 0, firstFailureAt: 0, openedAt: null, state: "closed" }
    circuits.set(key, entry)
  }

  entry.failures += 1
  if (entry.firstFailureAt === 0) entry.firstFailureAt = now()

  if (entry.failures >= DEFAULT_THRESHOLD && entry.state !== "open") {
    entry.state = "open"
    entry.openedAt = now()
    console.error(
      `[twenty-circuit] CIRCUIT OPEN for operation "${operation}" after ${entry.failures} failures — blocking all calls for ${DEFAULT_COOLDOWN_MS}ms`,
    )
  }
}

// ---- Health check ----

let lastHealthCheck: { ok: boolean; at: number; error?: string } = { ok: true, at: 0 }

export interface TwentyHealthResult {
  ok: boolean
  latencyMs: number
  error?: string
}

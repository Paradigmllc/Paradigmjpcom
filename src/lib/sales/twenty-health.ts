// Twenty CRM Health Monitor — proactive health checks + strict auth validation.
//
// Replaces the old "configured: false → silent skip" pattern with:
// 1. Health check on every sync entry point
// 2. Circuit breaker integration
// 3. Explicit throw on missing auth (no more silent skipping)
// 4. Latency tracking

import { env, twentyBaseUrl, twentyFetch } from "./twenty-sync-utils"
import { circuitAllows, circuitReportSuccess, circuitReportFailure, type TwentyHealthResult } from "./twenty-circuit"

let cachedHealth: TwentyHealthResult | null = null
const HEALTH_CACHE_TTL_MS = 15_000 // 15 seconds

/**
 * Validate that Twenty auth is configured. Throws instead of silent skip.
 * Call this at every sync entry point before any Twenty operation.
 */
export function requireTwentyAuth(): { baseUrl: string; apiKey: string } {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    throw new Error("TWENTY_BASE_URL or TWENTY_API_KEY is not configured — Twenty is the Sales OS SSOT, auth is REQUIRED")
  }
  return { baseUrl, apiKey }
}

/**
 * Check if Twenty auth is configured (non-throwing). Use for non-critical paths.
 */
export function twentyAuthConfigured(): boolean {
  return Boolean(twentyBaseUrl() && env("TWENTY_API_KEY"))
}

async function runHealthCheck(baseUrl: string): Promise<TwentyHealthResult> {
  const start = Date.now()
  try {
    const result = await twentyFetch<{ data?: { workspaces?: unknown[] } }>("/rest/metadata/objects?limit=1")
    const latencyMs = Date.now() - start
    if (result.ok) {
      circuitReportSuccess("health")
      return { ok: true, latencyMs }
    }
    circuitReportFailure("health")
    return { ok: false, latencyMs, error: result.error }
  } catch (error) {
    const latencyMs = Date.now() - start
    const message = error instanceof Error ? error.message : "Twenty health check failed"
    circuitReportFailure("health")
    return { ok: false, latencyMs, error: message }
  }
}

/**
 * Get Twenty health status. Results are cached for HEALTH_CACHE_TTL_MS.
 * Integrates with the circuit breaker — if circuit is open, skips actual check.
 */
export async function twentyHealth(): Promise<TwentyHealthResult> {
  if (cachedHealth && Date.now() - (cachedHealth.latencyMs > 0 ? Date.now() - HEALTH_CACHE_TTL_MS : 0) < HEALTH_CACHE_TTL_MS) {
    // Using a simpler cache check
  }
  if (cachedHealth && Date.now() - (cachedHealth.latencyMs > 0 ? 0 : 0) < HEALTH_CACHE_TTL_MS) {
    // Actually let me just track the check time properly
  }

  // Simple cache: if last check was within TTL, return cached
  const cacheAge = cachedHealth ? Date.now() - Date.now() : Infinity
  // Fix: track check timestamp properly
  if (cachedHealth && Date.now() - lastHealthTimestamp < HEALTH_CACHE_TTL_MS) {
    return cachedHealth
  }

  if (!circuitAllows("health")) {
    const result: TwentyHealthResult = { ok: false, latencyMs: 0, error: "Circuit breaker is open — Twenty health check skipped" }
    return result
  }

  try {
    const baseUrl = twentyBaseUrl()
    if (!baseUrl) {
      const result: TwentyHealthResult = { ok: false, latencyMs: 0, error: "TWENTY_BASE_URL not configured" }
      cachedHealth = result
      lastHealthTimestamp = Date.now()
      return result
    }
    const result = await runHealthCheck(baseUrl)
    cachedHealth = result
    lastHealthTimestamp = Date.now()
    return result
  } catch (error) {
    const result: TwentyHealthResult = {
      ok: false,
      latencyMs: 0,
      error: error instanceof Error ? error.message : "Twenty health check threw",
    }
    cachedHealth = result
    lastHealthTimestamp = Date.now()
    return result
  }
}

let lastHealthTimestamp = 0

/**
 * Check if Twenty is healthy and the circuit allows calls.
 * Returns true if we can proceed with Twenty operations.
 */
export async function twentyIsHealthy(): Promise<boolean> {
  if (!circuitAllows("sync")) return false
  const health = await twentyHealth()
  return health.ok
}

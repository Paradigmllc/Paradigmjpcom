/**
 * Database pool monitor — tracks connection pool health for PayloadCMS.
 *
 * Provides health status, pooler mode detection, and metrics
 * for the /api/sales/health endpoint.
 *
 * 2026-06-16: Created as part of pooler Transaction mode hardening.
 *   Session mode (port 5432) → ECHECKOUTTIMEOUT → Transaction mode (port 6543).
 */

interface PoolHealthStatus {
  status: "ok" | "degraded" | "unavailable"
  poolerMode: "transaction" | "session" | "direct" | "unknown"
  poolerHost: string
  poolerPort: string
  isPooler: boolean
  isTransactionMode: boolean
  warnings: string[]
}

export async function checkPoolHealth(): Promise<PoolHealthStatus> {
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL || ""
  const warnings: string[] = []

  let poolerMode: PoolHealthStatus["poolerMode"] = "unknown"
  let poolerHost = "unknown"
  let poolerPort = "5432"
  let isPooler = false
  let isTransactionMode = false

  try {
    const u = new URL(uri)
    poolerHost = u.hostname
    poolerPort = u.port || "5432"
    isPooler = poolerHost.includes("pooler.supabase.com")
    isTransactionMode = poolerPort === "6543"

    if (isPooler) {
      poolerMode = isTransactionMode ? "transaction" : "session"
    } else if (poolerHost.includes("supabase.co")) {
      poolerMode = "direct"
    }
  } catch (_) {
    warnings.push("DATABASE_URI could not be parsed")
  }

  // Session mode warning
  if (poolerMode === "session") {
    warnings.push("Pooler is in Session mode (port 5432) — recommend switching to Transaction mode (port 6543) to avoid ECHECKOUTTIMEOUT")
  }

  // Verify pooler connectivity via TCP
  try {
    const net = await import("node:net")
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: poolerHost, port: Number(poolerPort), timeout: 5000 }, () => {
        socket.destroy()
        resolve()
      })
      socket.on("error", reject)
      socket.on("timeout", () => {
        socket.destroy()
        reject(new Error("TCP timeout"))
      })
    })
  } catch (e) {
    warnings.push(`Pooler TCP unreachable: ${e instanceof Error ? e.message : String(e)}`)
  }

  const status: PoolHealthStatus["status"] =
    warnings.length === 0 ? "ok" : warnings.some((w) => w.includes("unreachable")) ? "unavailable" : "degraded"

  return {
    status,
    poolerMode,
    poolerHost,
    poolerPort,
    isPooler,
    isTransactionMode,
    warnings,
  }
}

export function getPoolConfigSummary(): Record<string, unknown> {
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL || ""
  const masked = uri ? uri.replace(/:([^:@]+)@/, ":****@") : "(empty)"

  let port = "unknown"
  let host = "unknown"
  try {
    const u = new URL(uri)
    port = u.port || "5432"
    host = u.hostname
  } catch (_) { /* malformed */ }

  return {
    uri: masked,
    host,
    port,
    isPooler: uri.includes("pooler.supabase.com"),
    isTransactionMode: port === "6543",
    poolMax: 4,
    applicationName: "paradigm_payload",
  }
}

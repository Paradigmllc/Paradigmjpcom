/**
 * Resolve the Payload CMS PostgreSQL connection string.
 *
 * RevenueOS/Sales OS uses Cloud Supabase as SSOT. Payload CMS also must use an
 * explicitly configured database.
 *
 * 2026-06-16: Added Transaction mode pooler detection and diagnostics.
 *   Session mode (port 5432 on pooler) causes ECHECKOUTTIMEOUT under load.
 *   Transaction mode (port 6543) is the fix.
 */

export interface DbUriInfo {
  uri: string
  isPooler: boolean
  isTransactionMode: boolean
  port: string
  host: string
  masked: string
}

export function resolveDatabaseUri(): string {
  const explicit = process.env.DATABASE_URI
  if (explicit && explicit.trim()) return explicit.trim()

  const fallback = process.env.DATABASE_URI_FALLBACK
  if (fallback && fallback.trim()) {
    console.warn("[resolve-database-uri] DATABASE_URI not set, using DATABASE_URI_FALLBACK")
    return fallback.trim()
  }

  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && dbUrl.trim()) return dbUrl.trim()

  const host = process.env.PGHOST || process.env.DB_HOST
  const port = process.env.PGPORT || process.env.DB_PORT || "5432"
  const user = process.env.PGUSER || process.env.DB_USER
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD
  const database = process.env.PGDATABASE || process.env.DB_NAME || "postgres"
  if (host && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  }

  console.error("[resolve-database-uri] No database connection info found in environment")
  return ""
}

export function resolveDatabaseUriOrThrow(): string {
  const uri = resolveDatabaseUri()
  if (!uri) {
    const msg = "[resolve-database-uri] DATABASE_URI could not be resolved from any supported source"
    console.error(msg)
    throw new Error(msg)
  }
  return uri
}

export function getDbUriInfo(): DbUriInfo {
  const uri = resolveDatabaseUriOrThrow()
  const isPooler = uri.includes("pooler.supabase.com")
  const isTransactionMode = uri.includes(":6543")
  let port = "5432"
  let host = "unknown"
  try {
    const u = new URL(uri)
    host = u.hostname
    port = u.port || "5432"
    // If port is empty in URL but it's pooler on 5432, detect correctly
    if (!u.port && isPooler) port = "5432"
  } catch (_) { /* malformed URI; use defaults */ }
  const masked = uri.replace(/:([^:@]+)@/, ":****@")
  return { uri, isPooler, isTransactionMode, port, host, masked }
}

export function logDbConnectionInfo(): void {
  const info = getDbUriInfo()
  if (!info.uri) return
  const modeLabel = info.isPooler
    ? info.isTransactionMode
      ? "pooler-transaction (recommended)"
      : "pooler-session (⚠ may cause ECHECKOUTTIMEOUT)"
    : "direct"
  console.log(`[db-uri] ${info.masked} | mode=${modeLabel}`)
  if (info.isPooler && !info.isTransactionMode) {
    console.warn(`[db-uri] ⚠ Session mode pooler detected (port 5432).`)
    console.warn(`[db-uri] ⚠ Under load this causes ECHECKOUTTIMEOUT. Use port 6543 for Transaction mode.`)
  }
}

export function shouldUseSsl(uri: string): boolean {
  // If URI explicitly sets sslmode, defer to it (no code-level override)
  if (uri.includes("sslmode=disable")) return false
  if (uri.includes("sslmode=no-verify") || uri.includes("sslmode=require") || uri.includes("sslmode=verify-full")) return true
  if (uri.includes("pooler.supabase.com")) return true
  if (uri.includes("supabase.com")) return true
  if (uri.includes("localhost") || uri.includes("127.0.0.1") || uri.includes("db:") || uri.includes("-db:")) {
    return false
  }
  // Direct IP connections to private/self-hosted Postgres endpoints use no SSL by default.
  return false
}

/**
 * Check if the database is reachable via a quick TCP connection.
 * Returns true if the target host:port accepts TCP connections.
 */
export async function checkDatabaseReachable(uri: string): Promise<boolean> {
  try {
    const u = new URL(uri)
    const host = u.hostname
    const port = parseInt(u.port || "5432", 10)
    const net = await import("node:net")
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 5000 }, () => {
        socket.destroy()
        resolve(true)
      })
      socket.on("error", () => {
        socket.destroy()
        resolve(false)
      })
      socket.on("timeout", () => {
        socket.destroy()
        resolve(false)
      })
    })
  } catch {
    return false
  }
}

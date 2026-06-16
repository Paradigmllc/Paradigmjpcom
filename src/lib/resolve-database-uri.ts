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
    console.error("[resolve-database-uri] DATABASE_URI could not be resolved from any supported source")
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
  if (uri.includes("pooler.supabase.com")) return true
  if (uri.includes("supabase.com")) return true
  if (uri.includes("localhost") || uri.includes("127.0.0.1") || uri.includes("db:") || uri.includes("-db:")) {
    return false
  }
  return false
}

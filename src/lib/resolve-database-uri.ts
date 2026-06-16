/**
 * Resolve the Payload CMS PostgreSQL connection string.
 *
 * RevenueOS/Sales OS uses Cloud Supabase as SSOT. Payload CMS also must use an
 * explicitly configured database and must never silently fall back to unrelated
 * Coolify-linked databases such as refferq-db.
 */

function rejectDisabledDatabase(uri: string): string {
  if (/refferq/i.test(uri)) {
    console.error("[resolve-database-uri] refferq database connections are disabled for this project")
    return ""
  }
  return uri
}

export function resolveDatabaseUri(): string {
  const explicit = process.env.DATABASE_URI
  if (explicit && explicit.trim()) return rejectDisabledDatabase(explicit.trim())

  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && dbUrl.trim()) return rejectDisabledDatabase(dbUrl.trim())

  const host = process.env.PGHOST || process.env.DB_HOST
  const port = process.env.PGPORT || process.env.DB_PORT || "5432"
  const user = process.env.PGUSER || process.env.DB_USER
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD
  const database = process.env.PGDATABASE || process.env.DB_NAME || "postgres"
  if (host && user && password) {
    return rejectDisabledDatabase(
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`,
    )
  }

  if (process.env.SUPABASE_POSTGRES_PASSWORD || process.env.SUPABASE_POSTGRES_HOST) {
    console.error("[resolve-database-uri] SUPABASE_POSTGRES_* fallback is disabled; set DATABASE_URI explicitly")
  } else {
    console.error("[resolve-database-uri] No database connection info found in environment")
  }
  return ""
}

export function resolveDatabaseUriOrThrow(): string {
  const uri = resolveDatabaseUri()
  if (!uri) {
    console.error("[resolve-database-uri] DATABASE_URI could not be resolved from any supported source")
  }
  return uri
}

export function shouldUseSsl(uri: string): boolean {
  if (uri.includes("pooler.supabase.com")) return true
  if (uri.includes("supabase.com")) return true
  if (uri.includes("localhost") || uri.includes("127.0.0.1") || uri.includes("db:") || uri.includes("-db:")) {
    return false
  }
  return false
}

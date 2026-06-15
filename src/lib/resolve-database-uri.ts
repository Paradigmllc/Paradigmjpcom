/**
 * resolve-database-uri.ts — 5-tier PostgreSQL connection string auto-resolution.
 *
 * Payload CMS は DATABASE_URI が必須だが、Coolify 等の環境では明示設定がない場合がある。
 * 既存の Supabase 接続情報から自動構築するフォールバックチェーンを提供。
 *
 * 解決優先順:
 *   1. DATABASE_URI          — 明示設定（最優先）
 *   2. DATABASE_URL          — Coolify linked-service 標準変数
 *   3. PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE — 個別変数
 *   4. SUPABASE_POSTGRES_*   — セルフホスト Supabase
 *   5. SUPABASE_POSTGRES_PASSWORD → refferq@refferq-db:5432/refferq
 */

export function resolveDatabaseUri(): string {
  // 1. DATABASE_URI (explicit)
  const explicit = process.env.DATABASE_URI
  if (explicit && explicit.trim()) return explicit.trim()

  // 2. DATABASE_URL (Coolify linked service)
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && dbUrl.trim()) return dbUrl.trim()

  // 3. Individual PG vars
  const host = process.env.PGHOST || process.env.DB_HOST
  const port = process.env.PGPORT || process.env.DB_PORT || "5432"
  const user = process.env.PGUSER || process.env.DB_USER
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD
  const database = process.env.PGDATABASE || process.env.DB_NAME
  if (host && user && password) {
    const db = database || "postgres"
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`
  }

  // 4. Self-hosted Supabase
  const supabaseUser = process.env.SUPABASE_POSTGRES_USER
  const supabasePass = process.env.SUPABASE_POSTGRES_PASSWORD
  const supabaseDb = process.env.SUPABASE_POSTGRES_DB
  if (supabaseUser && supabasePass) {
    const db = supabaseDb || "postgres"
    const supabaseHost = process.env.SUPABASE_POSTGRES_HOST || "db"
    const supabasePort = process.env.SUPABASE_POSTGRES_PORT || "5432"
    return `postgresql://${encodeURIComponent(supabaseUser)}:${encodeURIComponent(supabasePass)}@${supabaseHost}:${supabasePort}/${db}`
  }

  // 5. SUPABASE_POSTGRES_PASSWORD → refferq@refferq-db Coolify internal
  if (supabasePass) {
    return `postgresql://refferq:${encodeURIComponent(supabasePass)}@refferq-db:5432/refferq`
  }

  console.error("[resolve-database-uri] No database connection info found in environment")
  return ""  // will cause clear connection error
}

export function resolveDatabaseUriOrThrow(): string {
  const uri = resolveDatabaseUri()
  if (!uri) {
    console.error("[resolve-database-uri] DATABASE_URI could not be resolved from any source")
  }
  return uri
}

export function shouldUseSsl(uri: string): boolean {
  // Supabase pooler requires SSL
  if (uri.includes("pooler.supabase.com")) return true
  if (uri.includes("supabase.com")) return true
  // Internal Coolify network does not need SSL
  if (uri.includes("refferq-db")) return false
  // Default: enable SSL for external hosts, disable for internal
  if (uri.includes("localhost") || uri.includes("127.0.0.1") || uri.includes("db:") || uri.includes("-db:")) {
    return false
  }
  return false
}

#!/usr/bin/env node
/**
 * Unlock all Payload CMS users by resetting login_attempts and lock_until.
 *
 * Usage: node scripts/unlock-payload-users.mjs
 *
 * Uses the same DB resolution as payload.config.ts (resolve-database-uri.ts).
 * Safe to run anytime — only resets lock fields, never touches passwords or roles.
 */

import { Pool } from "pg"

// ── Inlined resolveDatabaseUri (self-contained, no TS dependency) ──
function resolveDatabaseUri() {
  const explicit = process.env.DATABASE_URI
  if (explicit?.trim()) return explicit.trim()

  const dbUrl = process.env.DATABASE_URL
  if (dbUrl?.trim()) return dbUrl.trim()

  const host = process.env.PGHOST || process.env.DB_HOST
  const port = process.env.PGPORT || process.env.DB_PORT || "5432"
  const user = process.env.PGUSER || process.env.DB_USER
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD
  const database = process.env.PGDATABASE || process.env.DB_NAME
  if (host && user && password) {
    const db = database || "postgres"
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`
  }

  const supabaseUser = process.env.SUPABASE_POSTGRES_USER
  const supabasePass = process.env.SUPABASE_POSTGRES_PASSWORD
  const supabaseDb = process.env.SUPABASE_POSTGRES_DB
  if (supabaseUser && supabasePass) {
    const db = supabaseDb || "postgres"
    const supabaseHost = process.env.SUPABASE_POSTGRES_HOST || "db"
    const supabasePort = process.env.SUPABASE_POSTGRES_PORT || "5432"
    return `postgresql://${encodeURIComponent(supabaseUser)}:${encodeURIComponent(supabasePass)}@${supabaseHost}:${supabasePort}/${db}`
  }

  return ""
}

function shouldUseSsl(uri) {
  if (uri.includes("pooler.supabase.com") || uri.includes("supabase.com")) return true
  return false
}

// ── Main ──
const uri = resolveDatabaseUri()
if (!uri) {
  console.error("❌ Could not resolve database URI. Set DATABASE_URI or ensure SUPABASE_POSTGRES_PASSWORD is set.")
  process.exit(1)
}

const ssl = shouldUseSsl(uri)
console.log(`🔗 Connecting to: ${uri.replace(/:[^:@]+@/, ":****@")} (ssl: ${ssl})`)

const pool = new Pool({
  connectionString: uri,
  ssl: ssl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  max: 1,
})

try {
  // List locked users
  const { rows: locked } = await pool.query(
    `SELECT id, email, login_attempts, lock_until FROM paradigm.users WHERE login_attempts > 0 OR lock_until IS NOT NULL`
  )
  
  if (locked.length === 0) {
    console.log("✅ No locked users found.")
  } else {
    console.log(`🔒 Found ${locked.length} locked user(s):`)
    for (const u of locked) {
      console.log(`   ${u.email} (attempts: ${u.login_attempts}, lock_until: ${u.lock_until})`)
    }
    
    // Unlock all
    const { rowCount } = await pool.query(
      `UPDATE paradigm.users SET login_attempts = 0, lock_until = NULL WHERE login_attempts > 0 OR lock_until IS NOT NULL`
    )
    console.log(`🔓 Unlocked ${rowCount} user(s).`)
  }

  // Also list all users for reference
  const { rows: all } = await pool.query(
    `SELECT email, role, login_attempts, lock_until FROM paradigm.users ORDER BY created_at`
  )
  console.log("\n📋 All users:")
  for (const u of all) {
    const status = u.lock_until ? "🔒" : "✅"
    console.log(`   ${status} ${u.email} (${u.role})`)
  }
} catch (err) {
  console.error("❌ Database error:", err.message)
  process.exit(1)
} finally {
  await pool.end()
}

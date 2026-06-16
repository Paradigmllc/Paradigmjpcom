#!/usr/bin/env node
/**
 * Unlock Payload CMS users by resetting login_attempts and lock_until.
 *
 * Usage: node scripts/unlock-payload-users.mjs
 *
 * Safe to run anytime: this only resets lock fields and never touches
 * passwords or roles.
 */

import { Pool } from "pg"

function rejectDisabledDatabase(uri) {
  if (/refferq/i.test(uri)) {
    console.error("Refferq database connections are disabled for this project.")
    return ""
  }
  return uri
}

function resolveDatabaseUri() {
  const explicit = process.env.DATABASE_URI
  if (explicit?.trim()) return rejectDisabledDatabase(explicit.trim())

  const dbUrl = process.env.DATABASE_URL
  if (dbUrl?.trim()) return rejectDisabledDatabase(dbUrl.trim())

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

  return ""
}

function shouldUseSsl(uri) {
  return uri.includes("pooler.supabase.com") || uri.includes("supabase.com")
}

function maskedUri(uri) {
  return uri.replace(/:([^:@]+)@/, ":****@")
}

const uri = resolveDatabaseUri()
if (!uri) {
  console.error("Could not resolve database URI. Set DATABASE_URI or DATABASE_URL explicitly.")
  process.exit(1)
}

const ssl = shouldUseSsl(uri)
console.log(`Connecting to: ${maskedUri(uri)} (ssl: ${ssl})`)

const pool = new Pool({
  connectionString: uri,
  ssl: ssl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  max: 1,
})

try {
  const { rows: locked } = await pool.query(
    "SELECT id, email, login_attempts, lock_until FROM paradigm.users WHERE login_attempts > 0 OR lock_until IS NOT NULL",
  )

  if (locked.length === 0) {
    console.log("No locked users found.")
  } else {
    console.log(`Found ${locked.length} locked user(s):`)
    for (const user of locked) {
      console.log(`   ${user.email} (attempts: ${user.login_attempts}, lock_until: ${user.lock_until})`)
    }

    const { rowCount } = await pool.query(
      "UPDATE paradigm.users SET login_attempts = 0, lock_until = NULL WHERE login_attempts > 0 OR lock_until IS NOT NULL",
    )
    console.log(`Unlocked ${rowCount} user(s).`)
  }

  const { rows: users } = await pool.query(
    "SELECT email, role, login_attempts, lock_until FROM paradigm.users ORDER BY created_at",
  )
  console.log("\nAll users:")
  for (const user of users) {
    const status = user.lock_until ? "locked" : "ok"
    console.log(`   ${status} ${user.email} (${user.role})`)
  }
} catch (error) {
  console.error("Database error:", error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await pool.end()
}

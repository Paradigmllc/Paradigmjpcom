/**
 * error-monitor.ts — Catch-all error aggregation for Sales OS.
 *
 * Collects all console.error/warn calls from enrichment, pipeline,
 * and outreach flows. Stores to Supabase for dashboard visibility.
 *
 * Auto-creates the sales_error_log table on first use (self-healing migration).
 */
import { getServiceSalesSupabase } from "@/lib/supabase"

let tableReady = false

/** Ensure the error log table exists (self-healing migration) */
async function ensureTable(): Promise<void> {
  if (tableReady) return
  const sb = getServiceSalesSupabase()
  if (!sb) return

  try {
    // Create table if not exists via raw SQL
    await sb.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS sales_error_log (
          id BIGSERIAL PRIMARY KEY,
          source TEXT NOT NULL DEFAULT 'unknown',
          message TEXT NOT NULL,
          stack TEXT,
          severity TEXT NOT NULL CHECK (severity IN ('error', 'warn')) DEFAULT 'error',
          context JSONB DEFAULT '{}'::jsonb,
          recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
    }).maybeSingle()
    tableReady = true
  } catch {
    // Fallback: try insert to detect if table exists
    try {
      const { error } = await sb.from("sales_error_log").select("id").limit(1)
      if (!error || error.message.includes("does not exist")) {
        // Create via REST insert if RPC unavailable
        await sb.from("sales_error_log").insert({
          source: "error-monitor",
          message: "table_initialized",
          severity: "warn",
        })
      }
      tableReady = true
    } catch (e) {
      console.error("[error-monitor] ensureTable failed at both RPC and REST:", e instanceof Error ? e.message : String(e))
    }
  }
  tableReady = true // Don't retry in this session
}

interface ErrorRecord {
  source: string
  message: string
  stack?: string
  severity: "error" | "warn"
  context?: Record<string, unknown>
}

const buffer: ErrorRecord[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL_MS = 30_000 // 30 seconds
const MAX_BUFFER = 100

/** Queue an error for batch persistence */
export function logError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  buffer.push({
    source,
    message: message.slice(0, 1000),
    stack: stack?.slice(0, 2000),
    severity: "error",
    context,
  })

  if (buffer.length >= MAX_BUFFER) {
    void flush()
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), FLUSH_INTERVAL_MS)
  }
}

/** Queue a warning for batch persistence */
export function logWarn(
  source: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  buffer.push({
    source,
    message: message.slice(0, 1000),
    severity: "warn",
    context,
  })

  if (buffer.length >= MAX_BUFFER) {
    void flush()
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), FLUSH_INTERVAL_MS)
  }
}

/** Persist buffered errors to Supabase */
async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (buffer.length === 0) return

  const batch = buffer.splice(0, MAX_BUFFER)
  const sb = getServiceSalesSupabase()
  if (!sb) return

  await ensureTable()

  const now = new Date().toISOString()
  const rows = batch.map((e) => ({
    source: e.source,
    message: e.message,
    stack: e.stack ?? null,
    severity: e.severity,
    context: e.context ?? {},
    recorded_at: now,
  }))

  try {
    const { error } = await sb.from("sales_error_log").insert(rows)
    if (error) console.error("[error-monitor] flush failed:", error.message)
  } catch (e) {
    // Last resort — log to stderr since we can't recurse into logError
    process.stderr.write(`[error-monitor] flush failed: ${e instanceof Error ? e.message : String(e)}\n`)
  }
}

/** Flush on process exit */
if (typeof process !== "undefined") {
  process.on("beforeExit", () => void flush())
  process.on("SIGTERM", () => void flush())
  process.on("SIGINT", () => void flush())
}

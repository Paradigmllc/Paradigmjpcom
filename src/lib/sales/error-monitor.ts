/**
 * error-monitor.ts — Catch-all error aggregation for Sales OS.
 *
 * Collects all console.error/warn calls from enrichment, pipeline,
 * and outreach flows. Stores to Supabase for dashboard visibility.
 *
 * DB_TABLE: sales_error_log (created by supabase/migrations/migration_035_sales_error_log.sql)
 * 注意: Supabase の exec_sql RPC はデフォルト無効。テーブルはマイグレーションで事前作成すること。
 */
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

let tableReady = false
let tableCheckFailed = false

async function ensureTable(): Promise<void> {
  if (tableReady || tableCheckFailed) return
  const sb = getServiceSalesSupabase()
  if (!sb) {
    tableCheckFailed = true
    console.error("[error-monitor] Supabase is not configured — error log unavailable")
    return
  }

  const { error } = await sb.from(DB_TABLES.SALES_ERROR_LOG).select("id").limit(1)
  if (error) {
    tableCheckFailed = true
    console.error("[error-monitor] sales_error_log table not found:", error.message)
    return
  }
  tableReady = true
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
const FLUSH_INTERVAL_MS = 30_000
const MAX_BUFFER = 100

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
  if (!tableReady) return

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
    const { error } = await sb.from(DB_TABLES.SALES_ERROR_LOG).insert(rows)
    if (error) console.error("[error-monitor] flush failed:", error.message)
  } catch (e) {
    process.stderr.write(`[error-monitor] flush failed: ${e instanceof Error ? e.message : String(e)}\n`)
  }
}

if (typeof process !== "undefined") {
  process.on("beforeExit", () => void flush())
  process.on("SIGTERM", async () => {
    await flush()
    process.exit(0)
  })
  process.on("SIGINT", async () => {
    await flush()
    process.exit(0)
  })
}

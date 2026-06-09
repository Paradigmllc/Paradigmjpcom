/**
 * error-monitor.ts — Catch-all error aggregation for Sales OS.
 *
 * Collects all console.error/warn calls from enrichment, pipeline,
 * and outreach flows. Stores to Supabase for dashboard visibility.
 *
 * Unlike Sentry (which needs DSN + network), this works offline-first
 * by writing to the same Supabase the Sales OS already uses.
 */
import { getServiceSalesSupabase } from "@/lib/supabase"

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
    // Last resort — don't infinitely recurse
  }
}

/** Flush on process exit */
if (typeof process !== "undefined") {
  process.on("beforeExit", () => void flush())
  process.on("SIGTERM", () => void flush())
  process.on("SIGINT", () => void flush())
}

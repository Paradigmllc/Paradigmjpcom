export const SALES_RUN_STALE_AFTER_MS = 5 * 60_000

export interface SalesRunActivity {
  status?: string | null
  heartbeat_at?: string | null
  updated_at?: string | null
  started_at?: string | null
  created_at?: string | null
}

function timestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getSalesRunLastActivityAt(run: SalesRunActivity): number {
  return Math.max(
    timestamp(run.heartbeat_at),
    timestamp(run.updated_at),
    timestamp(run.started_at),
    timestamp(run.created_at),
  )
}

export function isSalesRunStale(
  run: SalesRunActivity,
  nowMs = Date.now(),
  staleAfterMs = SALES_RUN_STALE_AFTER_MS,
): boolean {
  if (!["queued", "running"].includes(run.status ?? "")) return false
  const lastActivityAt = getSalesRunLastActivityAt(run)
  return lastActivityAt > 0 && nowMs - lastActivityAt > staleAfterMs
}

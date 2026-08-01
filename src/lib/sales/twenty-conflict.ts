// Twenty CRM Conflict Resolution — optimistic locking for Supabase↔Twenty sync.
//
// Strategy:
// 1. Every sync stores `twenty.updatedAt` (from Twenty's `updatedAt`) in Supabase meta.
// 2. Before writing Supabase data → Twenty, check if Twenty's `updatedAt` is newer than
//    what we last synced. If so, Twenty has been edited externally (by a human) and wins.
// 3. Before writing Twenty data → Supabase, check if our local copy is newer than Twenty's.
//    If our `twenty.lastSyncedAt` > Twenty.updatedAt, push our updates to Twenty.
//
// This prevents the "last write wins" race condition where pipeline and human edits collide.

import { type TwentyRecord } from "./twenty-sync-utils"

export interface TwentyConflictCheck {
  /** Twenty wins — external edit is newer than our last sync */
  twentyWins: boolean
  /** Supabase wins — our data is newer than Twenty's */
  supabaseWins: boolean
  /** No conflict — timestamps match */
  noConflict: boolean
  /** The Twenty record's updatedAt timestamp */
  twentyUpdatedAt: string | null
  /** Our last known Twenty updatedAt (from Supabase meta) */
  lastKnownUpdatedAt: string | null
}

/**
 * Compare Twenty's current state with what we last synced.
 * Returns who should win in case of divergence.
 */
export function checkTwentyConflict(
  twentyRecord: TwentyRecord | null,
  lastKnownUpdatedAt: string | null,
): TwentyConflictCheck {
  const twentyUpdatedAt = getUpdatedAt(twentyRecord)

  if (!twentyUpdatedAt) {
    // Twenty record has no updatedAt — we can't detect conflicts, assume no conflict
    return { twentyWins: false, supabaseWins: false, noConflict: true, twentyUpdatedAt: null, lastKnownUpdatedAt }
  }

  if (!lastKnownUpdatedAt) {
    // We've never synced this record before — no conflict possible
    return { twentyWins: false, supabaseWins: false, noConflict: true, twentyUpdatedAt, lastKnownUpdatedAt: null }
  }

  if (twentyUpdatedAt === lastKnownUpdatedAt) {
    return { twentyWins: false, supabaseWins: false, noConflict: true, twentyUpdatedAt, lastKnownUpdatedAt }
  }

  // Timestamps differ — someone changed Twenty since our last sync
  // Twenty wins because human edits in CRM are authoritative (Twenty = SSOT)
  return { twentyWins: true, supabaseWins: false, noConflict: false, twentyUpdatedAt, lastKnownUpdatedAt }
}

/**
 * Determine if Supabase should push its updates TO Twenty.
 * Returns true when our local data is newer than what Twenty has.
 */
export function shouldPushToTwenty(
  localUpdatedAt: string | null,
  twentyUpdatedAt: string | null,
): boolean {
  if (!localUpdatedAt) return true // No local timestamp — push to be safe
  if (!twentyUpdatedAt) return true // Twenty has no timestamp — push
  return new Date(localUpdatedAt) > new Date(twentyUpdatedAt)
}

function getUpdatedAt(record: TwentyRecord | null): string | null {
  if (!record) return null
  // Twenty REST API returns `updatedAt` as ISO string on company records
  const raw = (record as Record<string, unknown>).updatedAt
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null
}

/**
 * Extract the last-known Twenty updatedAt from Supabase company meta.
 */
export function lastKnownTwentyUpdatedAt(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null
  const m = meta as Record<string, unknown>
  const twenty = m.twenty
  if (!twenty || typeof twenty !== "object") return null
  const t = twenty as Record<string, unknown>
  const v = t.updatedAt ?? t.updated_at
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

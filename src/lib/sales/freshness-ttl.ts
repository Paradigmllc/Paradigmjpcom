/**
 * Freshness TTL — data staleness enforcement and re-verification trigger.
 *
 * Problems addressed:
 *   1. Passive inventory stamps skip_active_verification but never re-checks
 *   2. Common Crawl evidence is months old with no expiration
 *   3. HTTP Archive BigQuery snapshots are 2-4 weeks behind
 *   4. No signal triggers a re-verify when data ages out
 *
 * Solution:
 *   - Every enriched company gets an expires_at timestamp
 *   - Before using cached data, check if it's expired
 *   - If expired, re-enqueue for live re-verification
 *
 * 2026-07-06: Implemented to close the TTL gap.
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { optionalEnv } from "./japan-readiness-utils"

// ─── TTL Configuration ───

export interface FreshnessTtlConfig {
  /** Default TTL in days for passive evidence (Common Crawl, archive) */
  passiveEvidenceDays: number
  /** Default TTL in days for BigQuery/HTTP Archive evidence */
  bigQueryEvidenceDays: number
  /** Default TTL in days for live-fetched evidence */
  liveEvidenceDays: number
  /** Maximum re-verification attempts before marking as stale */
  maxReVerifyAttempts: number
}

function defaultTtlConfig(): FreshnessTtlConfig {
  return {
    passiveEvidenceDays: parseInt(optionalEnv("FRESHNESS_TTL_PASSIVE_DAYS") ?? "90", 10) || 90,
    bigQueryEvidenceDays: parseInt(optionalEnv("FRESHNESS_TTL_BIGQUERY_DAYS") ?? "30", 10) || 30,
    liveEvidenceDays: parseInt(optionalEnv("FRESHNESS_TTL_LIVE_DAYS") ?? "7", 10) || 7,
    maxReVerifyAttempts: parseInt(optionalEnv("FRESHNESS_TTL_MAX_REVERIFY") ?? "3", 10) || 3,
  }
}

// ─── Staleness check ───

export type FreshnessStatus = "fresh" | "aging" | "stale" | "expired"

export interface FreshnessCheck {
  status: FreshnessStatus
  collectedAt: number
  expiresAt: number
  ageDays: number
  remainingDays: number
  shouldReVerify: boolean
}

export function checkFreshness(
  collectedAt: string | null | undefined,
  evidenceType: "passive" | "bigquery" | "live" = "passive",
  config?: FreshnessTtlConfig,
): FreshnessCheck {
  const ttl = config ?? defaultTtlConfig()
  const ttlDays =
    evidenceType === "bigquery" ? ttl.bigQueryEvidenceDays
    : evidenceType === "live" ? ttl.liveEvidenceDays
    : ttl.passiveEvidenceDays

  if (!collectedAt) {
    return {
      status: "expired",
      collectedAt: 0,
      expiresAt: 0,
      ageDays: 999,
      remainingDays: -999,
      shouldReVerify: true,
    }
  }

  const collectedMs = new Date(collectedAt).getTime()
  if (Number.isNaN(collectedMs)) {
    return {
      status: "expired",
      collectedAt: 0,
      expiresAt: 0,
      ageDays: 999,
      remainingDays: -999,
      shouldReVerify: true,
    }
  }

  const ageMs = Date.now() - collectedMs
  const ageDays = Math.max(0, Math.round(ageMs / (1000 * 60 * 60 * 24)))
  const expiresAt = collectedMs + ttlDays * 24 * 60 * 60 * 1000
  const remainingDays = Math.round((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))

  let status: FreshnessStatus
  if (remainingDays >= 7) {
    status = "fresh"
  } else if (remainingDays > 0) {
    status = "aging"
  } else if (remainingDays > -30) {
    status = "stale"
  } else {
    status = "expired"
  }

  return {
    status,
    collectedAt: collectedMs,
    expiresAt,
    ageDays,
    remainingDays,
    shouldReVerify: status === "stale" || status === "expired",
  }
}

// ─── Expiry date computation ───

export function computeExpiresAt(
  evidenceType: "passive" | "bigquery" | "live",
  collectedAt?: string,
  config?: FreshnessTtlConfig,
): string {
  const ttl = config ?? defaultTtlConfig()
  const ttlDays =
    evidenceType === "bigquery" ? ttl.bigQueryEvidenceDays
    : evidenceType === "live" ? ttl.liveEvidenceDays
    : ttl.passiveEvidenceDays

  const base = collectedAt ? new Date(collectedAt).getTime() : Date.now()
  return new Date(base + ttlDays * 24 * 60 * 60 * 1000).toISOString()
}

// ─── Re-verification trigger ───

export interface ReVerifyResult {
  reVerified: number
  skipped: number
  failed: number
  errors: string[]
}

export async function reVerifyStaleCandidates(params: {
  maxCandidates?: number
  evidenceType?: "passive" | "bigquery"
}): Promise<ReVerifyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { reVerified: 0, skipped: 0, failed: 0, errors: ["Supabase not configured"] }

  const maxCandidates = params.maxCandidates ?? 50
  const errors: string[] = []
  let reVerified = 0
  let skipped = 0
  let failed = 0

  try {
    const now = new Date().toISOString()
    const { data: candidates, error: fetchError } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
      .select("id, domain, meta")
      .eq("status", "scored")
      .not("meta->>expires_at", "is", null)
      .lte("meta->>expires_at", now)
      .limit(maxCandidates)

    if (fetchError) {
      errors.push(`fetch stale candidates failed: ${fetchError.message}`)
      return { reVerified, skipped, failed, errors }
    }

    for (const candidate of candidates ?? []) {
      const domain = typeof candidate.domain === "string" ? candidate.domain : ""
      const meta = candidate.meta as Record<string, unknown> | null
      const reVerifyCount = (meta?.reverify_count as number) ?? 0
      const ttl = defaultTtlConfig()

      if (reVerifyCount >= ttl.maxReVerifyAttempts) {
        skipped++
        continue
      }

      try {
        // Re-queue for live Wappalyzer scan by resetting to candidate status
        const { error: resetError } = await sb
          .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
          .update({
            status: "candidate",
            meta: {
              ...meta,
              reverify_count: reVerifyCount + 1,
              reverified_at: now,
              previous_status: "scored",
            },
          })
          .eq("id", candidate.id)

        if (resetError) {
          errors.push(`re-verify reset failed for ${domain}: ${resetError.message}`)
          failed++
        } else {
          reVerified++
        }
      } catch (e) {
        errors.push(`re-verify failed for ${domain}: ${e instanceof Error ? e.message : String(e)}`)
        failed++
      }
    }
  } catch (e) {
    errors.push(`re-verify candidates failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { reVerified, skipped, failed, errors }
}

// ─── Score adjustment based on freshness ───

export function adjustScoreForFreshness(
  baseScore: number,
  freshness: FreshnessCheck,
): { adjustedScore: number; penalty: number; reason: string } {
  let penalty = 0
  let reason = "fresh"

  switch (freshness.status) {
    case "fresh":
      break
    case "aging":
      penalty = 5
      reason = `aging (${freshness.remainingDays}d remaining)`
      break
    case "stale":
      penalty = 20
      reason = `stale (${Math.abs(freshness.remainingDays)}d overdue)`
      break
    case "expired":
      penalty = 40
      reason = `expired (${freshness.ageDays}d old)`
      break
  }

  return {
    adjustedScore: Math.max(0, baseScore - penalty),
    penalty,
    reason,
  }
}

export { defaultTtlConfig }

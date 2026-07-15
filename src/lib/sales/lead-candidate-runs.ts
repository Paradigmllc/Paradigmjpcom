import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { ensureLeadCandidateRunDomainsFetched } from "./lead-candidate-acquisition"
import { persistRunItemFailure } from "./lead-candidate-failure-persistence"
import { clampScore } from "./lead-candidate-scoring"
import {
  EVIDENCE_FIRST_SOURCE,
  verifyLeadCandidateItem,
  type LeadCandidateRunItemRow,
  type LeadCandidateRunRow,
} from "./lead-candidate-verification"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const SOURCE = EVIDENCE_FIRST_SOURCE
const MAX_FETCH_LIMIT = 10_000
const MAX_VERIFY_LIMIT = 5_000
const DEFAULT_VERIFY_BATCH = 120
const MAX_VERIFY_CONCURRENCY = 8

const TERMINAL_ITEM_STATUSES = ["scored", "awaiting_review", "form_missing", "promoted", "review_required", "rejected", "failed", "skipped"] as const

export interface DurableCandidateIngestInput {
  countryCode: string
  sourceConfigIds?: string[]
  technology?: string | null
  limit?: number
  verifyLimit?: number
  promote?: boolean
  minOpportunityScore?: number
  minSmbScore?: number
  syncVerifyBatchSize?: number
  requireVerifiedForm?: boolean
  minFormConfidence?: number
  syncTwenty?: boolean
  executionMode?: "pilot" | "batch"
}

export interface DurableCandidateAcquisitionSummary {
  ok: boolean
  source: string
  runId: string
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled"
  fetched: number
  upserted: number
  verified: number
  matchedTechnology: number
  scored: number
  promoted: number
  jobsEnqueued: number
  formsChecked: number
  formsQualified: number
  twentySynced: number
  hasMore: boolean
  runnerTriggered: boolean
  fallbackRunnerStarted: boolean
  failures: Array<{ key: string; reason: string }>
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function nowIso(): string {
  return new Date().toISOString()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "lead candidate run failed"
}

export async function assertEvidenceFirstLeadCandidateRun(runId: string): Promise<void> {
  const sb = getSb()
  const result = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
    .select("source_slug, require_source_evidence")
    .eq("id", runId)
    .single()
  if (result.error) throw new Error(result.error.message)
  if (result.data?.source_slug !== SOURCE || result.data?.require_source_evidence !== true) {
    throw new Error("Legacy lead candidate runs cannot be processed; create a new evidence-first run")
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return results
}

function normalizeInput(input: DurableCandidateIngestInput) {
  const countryCode = input.countryCode.trim().toUpperCase()
  const limit = Math.min(Math.max(input.limit ?? 1000, 1), MAX_FETCH_LIMIT)
  const verifyLimit = Math.min(Math.max(input.verifyLimit ?? Math.min(limit, DEFAULT_VERIFY_BATCH), 0), Math.min(limit, MAX_VERIFY_LIMIT))
  const sourceConfigIds = [...new Set(input.sourceConfigIds ?? [])]
  if (sourceConfigIds.length === 0) throw new Error(`No evidence-bearing lead source is configured for ${countryCode}`)
  return {
    countryCode,
    sourceConfigIds,
    technology: input.technology?.trim() || null,
    limit,
    verifyLimit,
    promote: false,
    minOpportunityScore: clampScore(input.minOpportunityScore ?? 68),
    minSmbScore: clampScore(input.minSmbScore ?? 50),
    requireVerifiedForm: input.requireVerifiedForm !== false,
    minFormConfidence: clampScore(input.minFormConfidence ?? 80),
    syncTwenty: false,
    executionMode: input.executionMode ?? "pilot",
    syncVerifyBatchSize: Math.min(Math.max(input.syncVerifyBatchSize ?? Math.min(verifyLimit, DEFAULT_VERIFY_BATCH), 0), DEFAULT_VERIFY_BATCH),
  }
}

async function createRun(input: ReturnType<typeof normalizeInput>): Promise<LeadCandidateRunRow> {
  const sb = getSb()
  const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).insert({
    source_slug: SOURCE,
    lane: "tech_footprint",
    country_code: input.countryCode,
    technology: input.technology,
    status: "queued",
    requested_limit: input.limit,
    verify_limit: input.verifyLimit,
    promote: false,
    min_opportunity_score: input.minOpportunityScore,
    min_smb_score: input.minSmbScore,
    require_verified_form: input.requireVerifiedForm,
    min_form_confidence: input.minFormConfidence,
    sync_twenty: false,
    execution_mode: input.executionMode,
    source_config_ids: input.sourceConfigIds,
    require_source_evidence: true,
    heartbeat_at: nowIso(),
  }).select("id, source_slug, country_code, technology, requested_limit, verify_limit, promote, min_opportunity_score, min_smb_score, require_verified_form, min_form_confidence, sync_twenty, source_config_ids, require_source_evidence, execution_mode, cancel_requested, fetched_count, upserted_count").single()
  if (error) throw new Error(error.message)
  return data as LeadCandidateRunRow
}

async function updateRun(runId: string, patch: JsonRecord): Promise<void> {
  const { error } = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).update({ ...patch, heartbeat_at: nowIso() }).eq("id", runId)
  if (error) throw new Error(error.message)
}

export async function markLeadCandidateRunFailed(runId: string, error: unknown): Promise<void> {
  await updateRun(runId, { status: "failed", error_message: errorMessage(error), completed_at: nowIso() })
}

export async function refreshLeadCandidateRunCounts(runId: string): Promise<{ hasMore: boolean; failures: Array<{ key: string; reason: string }> }> {
  const sb = getSb()
  const [discoveredRes, scoredRes, awaitingReviewRes, formMissingRes, promotedRes, reviewRes, rejectedRes, skippedRes, failedRes, matched, sourceQualified, formsChecked, formsQualified, twentySynced, operatorApproved, operatorRejected, runRes] = await Promise.all([
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "discovered"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "scored"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "awaiting_review"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "form_missing"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "promoted"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "review_required"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "rejected"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "skipped"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "failed"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("tech_matched", true),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("quality_status", "passed"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).not("form_checked_at", "is", null),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("form_verified", true),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("twenty_synced", true),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("review_status", "approved"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("review_status", "rejected"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("verify_limit").eq("id", runId).single(),
  ])
  const counts = new Map<string, number>()
  counts.set("discovered", discoveredRes.count ?? 0)
  counts.set("scored", scoredRes.count ?? 0)
  counts.set("awaiting_review", awaitingReviewRes.count ?? 0)
  counts.set("form_missing", formMissingRes.count ?? 0)
  counts.set("promoted", promotedRes.count ?? 0)
  counts.set("review_required", reviewRes.count ?? 0)
  counts.set("rejected", rejectedRes.count ?? 0)
  counts.set("skipped", skippedRes.count ?? 0)
  counts.set("failed", failedRes.count ?? 0)
  if (runRes.error) throw new Error(runRes.error.message)
  const verified = TERMINAL_ITEM_STATUSES.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0)
  const hasMore = (counts.get("discovered") ?? 0) > 0 && verified < Number(runRes.data.verify_limit ?? 0)
  const status = hasMore ? "running" : (counts.get("failed") ?? 0) > 0 ? "partial" : "completed"
  await updateRun(runId, {
    status,
    verified_count: verified,
    matched_technology_count: matched.count ?? 0,
    scored_count: (counts.get("scored") ?? 0) + (counts.get("awaiting_review") ?? 0) + (counts.get("form_missing") ?? 0) + (counts.get("promoted") ?? 0),
    source_qualified_count: sourceQualified.count ?? 0,
    quality_rejected_count: counts.get("rejected") ?? 0,
    review_required_count: counts.get("review_required") ?? 0,
    promoted_count: counts.get("promoted") ?? 0,
    jobs_enqueued_count: 0,
    forms_checked_count: formsChecked.count ?? 0,
    forms_qualified_count: formsQualified.count ?? 0,
    twenty_synced_count: twentySynced.count ?? 0,
    operator_approved_count: operatorApproved.count ?? 0,
    operator_rejected_count: operatorRejected.count ?? 0,
    failure_count: counts.get("failed") ?? 0,
    completed_at: hasMore ? null : nowIso(),
  })
  const failures = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("domain, error_message").eq("run_id", runId).eq("status", "failed").limit(30)
  return {
    hasMore,
    failures: ((failures.data ?? []) as Array<{ domain: string; error_message: string | null }>).map((row) => ({ key: row.domain, reason: row.error_message ?? "failed" })),
  }
}

export async function processLeadCandidateRun(runId: string, options: { batchSize?: number; maxBatches?: number } = {}) {
  const sb = getSb()
  const runRes = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("id, source_slug, country_code, technology, requested_limit, verify_limit, promote, min_opportunity_score, min_smb_score, require_verified_form, min_form_confidence, sync_twenty, source_config_ids, require_source_evidence, execution_mode, cancel_requested, fetched_count, upserted_count, cursor").eq("id", runId).single()
  if (runRes.error) throw new Error(runRes.error.message)
  const run = runRes.data as LeadCandidateRunRow
  if (run.source_slug !== SOURCE || run.require_source_evidence !== true) {
    throw new Error("Legacy lead candidate runs cannot be processed; create a new evidence-first run")
  }
  if (run.cancel_requested) {
    await updateRun(run.id, { status: "cancelled", completed_at: nowIso() })
    return { ok: false, runId, processed: 0, jobsEnqueued: 0, twentySynced: 0, hasMore: false, cancelled: true, failures: [] }
  }
  const acquisition = await ensureLeadCandidateRunDomainsFetched(run)
  if (acquisition.cancelled) {
    return { ok: false, runId, processed: 0, jobsEnqueued: 0, twentySynced: 0, hasMore: false, cancelled: true, failures: [] }
  }
  if (acquisition.upserted === 0) {
    const failures = acquisition.failures.length > 0 ? acquisition.failures : [{ key: run.country_code, reason: "No candidate domains were fetched" }]
    await updateRun(run.id, {
      status: "failed",
      failure_count: Math.max(failures.length, 1),
      error_message: failures.map((failure) => `${failure.key}: ${failure.reason}`).join("; ").slice(0, 2_000),
      completed_at: nowIso(),
    })
    return { ok: false, runId, processed: 0, jobsEnqueued: 0, hasMore: false, failures }
  }
  if (run.verify_limit === 0) {
    return { ok: true, runId, processed: 0, jobsEnqueued: 0, hasMore: false, failures: acquisition.failures }
  }
  const batchSize = Math.min(Math.max(options.batchSize ?? DEFAULT_VERIFY_BATCH, 1), 250)
  const maxBatches = Math.min(Math.max(options.maxBatches ?? 1, 1), 20)
  let processed = 0
  let twentySynced = 0
  for (let batch = 0; batch < maxBatches; batch++) {
    const cancellation = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("cancel_requested").eq("id", runId).single()
    if (cancellation.error) throw new Error(cancellation.error.message)
    if (cancellation.data?.cancel_requested === true) {
      await updateRun(run.id, { status: "cancelled", completed_at: nowIso() })
      return { ok: false, runId, processed, jobsEnqueued: 0, twentySynced, hasMore: false, cancelled: true, failures: [] }
    }
    const verified = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).in("status", [...TERMINAL_ITEM_STATUSES])
    const alreadyVerified = verified.count ?? 0
    if (alreadyVerified >= run.verify_limit) break
    const remaining = Math.max(1, run.verify_limit - alreadyVerified)
    const res = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id, run_id, candidate_id, domain, root_url, attempts, meta").eq("run_id", runId).eq("status", "discovered").order("created_at", { ascending: true }).limit(Math.min(batchSize, remaining))
    if (res.error) throw new Error(res.error.message)
    const items = (res.data ?? []) as LeadCandidateRunItemRow[]
    if (items.length === 0) break
    const results = await mapLimit(items, MAX_VERIFY_CONCURRENCY, async (item) => {
      try {
        return await verifyLeadCandidateItem(run, item)
      } catch (error) {
        const message = error instanceof Error ? error.message : "candidate verification failed"
        console.error("[lead-candidate-runs] item failed:", item.domain, error)
        await persistRunItemFailure(item, message)
        return { techMatched: false, promoted: false, twentySynced: false }
      }
    })
    processed += items.length
    twentySynced += results.filter((item) => item.twentySynced).length
  }
  const refreshed = await refreshLeadCandidateRunCounts(runId)
  return { ok: true, runId, processed, jobsEnqueued: 0, twentySynced, hasMore: refreshed.hasMore, failures: [...acquisition.failures, ...refreshed.failures].slice(0, 30) }
}

export async function triggerLeadCandidateRunner(runId: string): Promise<{ ok: boolean; error?: string }> {
  const fallback = await startFallbackRunner(runId)
  if (!fallback.started) return { ok: false, error: "Fallback runner already running" }
  return { ok: true }
}

async function startFallbackRunner(runId: string): Promise<{ started: boolean; alreadyRunning: boolean }> {
  try {
    const runner = await import("./lead-candidate-runner")
    return runner.startLeadCandidateRunFallback(runId)
  } catch (error) {
    console.error("[lead-candidate-runs] fallback runner import failed:", runId, error)
    return { started: false, alreadyRunning: false }
  }
}

export async function ingestLeadCandidatesDurable(input: DurableCandidateIngestInput): Promise<DurableCandidateAcquisitionSummary> {
  const normalized = normalizeInput(input)
  const run = await createRun(normalized)
  const trigger = await triggerLeadCandidateRunner(run.id)
  const fallback = await startFallbackRunner(run.id)
  const counts = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("status, verified_count, matched_technology_count, scored_count, promoted_count, jobs_enqueued_count, forms_checked_count, forms_qualified_count, twenty_synced_count, failure_count").eq("id", run.id).single()
  const row = counts.data as Record<string, unknown> | null
  const runnerAvailable = trigger.ok || fallback.started || fallback.alreadyRunning
  return {
    ok: runnerAvailable,
    source: SOURCE,
    runId: run.id,
    status: String(row?.status ?? "queued") as DurableCandidateAcquisitionSummary["status"],
    fetched: 0,
    upserted: 0,
    verified: Number(row?.verified_count ?? 0),
    matchedTechnology: Number(row?.matched_technology_count ?? 0),
    scored: Number(row?.scored_count ?? 0),
    promoted: Number(row?.promoted_count ?? 0),
    jobsEnqueued: Number(row?.jobs_enqueued_count ?? 0),
    formsChecked: Number(row?.forms_checked_count ?? 0),
    formsQualified: Number(row?.forms_qualified_count ?? 0),
    twentySynced: Number(row?.twenty_synced_count ?? 0),
    hasMore: true,
    runnerTriggered: trigger.ok,
    fallbackRunnerStarted: fallback.started || fallback.alreadyRunning,
    failures: runnerAvailable ? [] : [{ key: "lead_candidate_runner", reason: trigger.error ?? "runner dispatch failed" }],
  }
}

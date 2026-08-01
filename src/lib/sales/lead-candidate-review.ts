import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { EVIDENCE_FIRST_SOURCE } from "./lead-candidate-verification"
import { prepareFormQualifiedCandidatesBatch } from "./lead-candidate-promotion-batch"
import { parsePromotionSnapshot, promotionEligibilityReason, type ReviewItemRow } from "./lead-candidate-review-gate"
import { refreshLeadCandidateRunCounts } from "./lead-candidate-runs"
import { requireTwentyAuth } from "./twenty-health"
import { syncListLeadsToTwentyBatch } from "./twenty-sync-list-lead-batch"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
const MAX_REVIEW_ITEMS = 60

export function pilotReviewEvidence(input: {
  formsQualifiedCount: number
  reviewableCount: number
}): { hasReviewableQualifiedForm: boolean; requiredReviews: number } {
  const formsQualifiedCount = Math.max(0, Math.trunc(input.formsQualifiedCount))
  const reviewableCount = Math.max(0, Math.trunc(input.reviewableCount))
  return {
    hasReviewableQualifiedForm: formsQualifiedCount > 0 && reviewableCount > 0,
    requiredReviews: Math.min(3, reviewableCount),
  }
}

export function runAllowsCandidatePromotion(input: {
  sourceSlug: string
  status: string
  cancelRequested: boolean
}): boolean {
  if (input.sourceSlug !== EVIDENCE_FIRST_SOURCE) return false
  if (input.status === "cancelled") return true
  if (input.cancelRequested) return false
  return input.status === "completed" || input.status === "partial"
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

async function insertAuditEvents(rows: Array<{
  run_id: string
  entity_type: "item" | "run"
  entity_id: string
  action: string
  operator_name: string
  detail: JsonRecord
}>): Promise<void> {
  if (rows.length === 0) return
  const { error } = await getSb().from(DB_TABLES.SALES_LEAD_OPERATOR_EVENTS).insert(rows)
  if (error) throw new Error(error.message)
}

export async function rejectLeadCandidateItems(input: {
  runId: string
  itemIds: string[]
  operatorName: string
  note: string
}) {
  const ids = [...new Set(input.itemIds)].slice(0, MAX_REVIEW_ITEMS)
  if (ids.length === 0) throw new Error("At least one candidate is required")
  await insertAuditEvents([{
    run_id: input.runId,
    entity_type: "run",
    entity_id: input.runId,
    action: "candidate_rejection_requested",
    operator_name: input.operatorName,
    detail: { itemIds: ids, note: input.note },
  }])
  const reviewedAt = new Date().toISOString()
  const updated = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
    status: "rejected",
    review_status: "rejected",
    reviewed_by: input.operatorName,
    reviewed_at: reviewedAt,
    review_note: input.note,
    promotion_error: null,
  }).eq("run_id", input.runId).in("id", ids).eq("review_status", "pending").select("id, domain")
  if (updated.error) throw new Error(updated.error.message)
  const rows = (updated.data ?? []) as Array<{ id: string; domain: string }>
  await insertAuditEvents(rows.map((row) => ({
    run_id: input.runId,
    entity_type: "item",
    entity_id: row.id,
    action: "candidate_rejected",
    operator_name: input.operatorName,
    detail: { runId: input.runId, domain: row.domain, note: input.note },
  })))
  await refreshLeadCandidateRunCounts(input.runId)
  return { rejected: rows.length, skipped: ids.length - rows.length }
}

export async function recoverStaleLeadCandidatePromotions(input: {
  runId: string
  operatorName: string
  note: string
}) {
  const sb = getSb()
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString()
  const stale = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
    .select("id, domain")
    .eq("run_id", input.runId)
    .eq("review_status", "promoting")
    .lt("reviewed_at", cutoff)
    .limit(100)
  if (stale.error) throw new Error(stale.error.message)
  const rows = (stale.data ?? []) as Array<{ id: string; domain: string }>
  if (rows.length === 0) return { recovered: 0 }
  await insertAuditEvents([{
    run_id: input.runId,
    entity_type: "run",
    entity_id: input.runId,
    action: "stale_promotion_recovery_requested",
    operator_name: input.operatorName,
    detail: { itemIds: rows.map((row) => row.id), note: input.note },
  }])
  const recovered = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
    review_status: "promotion_failed",
    promotion_error: "Previous Twenty synchronization did not finish; verify Twenty before retrying",
  }).eq("run_id", input.runId).in("id", rows.map((row) => row.id)).eq("review_status", "promoting").select("id")
  if (recovered.error) throw new Error(recovered.error.message)
  const recoveredIds = new Set((recovered.data ?? []).map((row) => String(row.id)))
  await insertAuditEvents(rows.filter((row) => recoveredIds.has(row.id)).map((row) => ({
    run_id: input.runId,
    entity_type: "item",
    entity_id: row.id,
    action: "stale_promotion_recovered",
    operator_name: input.operatorName,
    detail: { runId: input.runId, domain: row.domain, note: input.note },
  })))
  await refreshLeadCandidateRunCounts(input.runId)
  return { recovered: recoveredIds.size }
}

export async function approveLeadCandidateItems(input: {
  runId: string
  itemIds: string[]
  operatorName: string
  note: string
}) {
  const ids = [...new Set(input.itemIds)].slice(0, MAX_REVIEW_ITEMS)
  if (ids.length === 0) throw new Error("At least one candidate is required")
  const sb = getSb()
  const runResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
    .select("id, source_slug, status, cancel_requested, min_opportunity_score, min_smb_score")
    .eq("id", input.runId)
    .single()
  if (runResult.error) throw new Error(runResult.error.message)
  const run = runResult.data as { source_slug: string; status: string; cancel_requested: boolean; min_opportunity_score: number; min_smb_score: number }
  if (!runAllowsCandidatePromotion({ sourceSlug: run.source_slug, status: run.status, cancelRequested: run.cancel_requested })) {
    throw new Error("Run is not eligible for candidate promotion")
  }

  const itemsResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
    .select("id, run_id, candidate_id, source_config_id, source_record_id, domain, company_name, source_page_url, status, quality_status, opportunity_score, form_url, form_verified, form_checked_at, review_status, promotion_attempts, meta")
    .eq("run_id", input.runId)
    .in("id", ids)
  if (itemsResult.error) throw new Error(itemsResult.error.message)
  const items = (itemsResult.data ?? []) as ReviewItemRow[]
  const sourceConfigIds = [...new Set(items.map((item) => item.source_config_id))]
  const sourceRecordIds = [...new Set(items.map((item) => item.source_record_id))]
  const [configsResult, recordsResult] = await Promise.all([
    sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).select("id, active, approval_status").in("id", sourceConfigIds),
    sb.from(DB_TABLES.SALES_LEAD_SOURCE_RECORDS).select("id, active, observed_at").in("id", sourceRecordIds),
  ])
  if (configsResult.error) throw new Error(configsResult.error.message)
  if (recordsResult.error) throw new Error(recordsResult.error.message)
  const currentConfigs = new Map((configsResult.data ?? []).map((row) => [String(row.id), row]))
  const currentRecords = new Map((recordsResult.data ?? []).map((row) => [String(row.id), row]))
  const invalid: Array<{ id: string; reason: string }> = []
  const eligible = items.filter((item) => {
    const config = currentConfigs.get(item.source_config_id)
    const record = currentRecords.get(item.source_record_id)
    const reason = promotionEligibilityReason({
      item,
      minOpportunityScore: run.min_opportunity_score,
      minSmbScore: run.min_smb_score,
      sourceConfig: config,
      sourceRecord: record,
    })
    if (reason) invalid.push({ id: item.id, reason })
    return reason === null
  })

  const claimIds = eligible.map((item) => item.id)
  if (claimIds.length > 0) {
    // CRM field creation and view normalization are configuration mutations and
    // belong to the explicit CRM settings/release path. Reapplying every field
    // for each operator approval made a single review exceed the edge timeout.
    // Keep this request fail-closed with a cheap auth preflight; the actual
    // company patch below verifies the live fields and persists promotion_failed
    // when Twenty rejects any required field.
    requireTwentyAuth()
    await insertAuditEvents(eligible.map((item) => ({
      run_id: input.runId,
      entity_type: "item",
      entity_id: item.id,
      action: "candidate_approval_requested",
      operator_name: input.operatorName,
      detail: { runId: input.runId, domain: item.domain, note: input.note },
    })))
    const claimed = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
      review_status: "promoting",
      reviewed_by: input.operatorName,
      reviewed_at: new Date().toISOString(),
      review_note: input.note,
      promotion_error: null,
    }).eq("run_id", input.runId).in("id", claimIds).in("review_status", ["pending", "promotion_failed"]).select("id")
    if (claimed.error) throw new Error(claimed.error.message)
    const claimedIds = new Set((claimed.data ?? []).map((row) => String(row.id)))
    eligible.splice(0, eligible.length, ...eligible.filter((item) => claimedIds.has(item.id)))
  }

  const snapshots = eligible.flatMap((item) => {
    const snapshot = parsePromotionSnapshot(item)
    return snapshot ? [{ item, snapshot }] : []
  })
  let preparationError: string | null = null
  let prepared: Awaited<ReturnType<typeof prepareFormQualifiedCandidatesBatch>> = []
  try {
    prepared = await prepareFormQualifiedCandidatesBatch(snapshots.map(({ item, snapshot }) => ({
      itemId: item.id,
      runId: input.runId,
      countryCode: snapshot.countryCode,
      candidateId: item.candidate_id,
      companyName: snapshot.qualityGate.identity.canonicalName ?? snapshot.sourceRecord.company_name,
      domain: item.domain,
      sourcePageUrl: snapshot.sourceRecord.source_page_url,
      qualityGate: snapshot.qualityGate,
      score: snapshot.score,
      detections: snapshot.detections,
      form: snapshot.form,
      source: EVIDENCE_FIRST_SOURCE,
    })))
  } catch (error) {
    preparationError = error instanceof Error ? error.message : "Candidate batch preparation failed"
    console.error("[lead-candidate-review] batch preparation failed:", input.runId, error)
  }
  const preparedByItem = new Map(prepared.map((item) => [item.itemId, item]))
  let synced: Awaited<ReturnType<typeof syncListLeadsToTwentyBatch>> = []
  if (prepared.length > 0) {
    try {
      synced = await syncListLeadsToTwentyBatch(prepared.map((item) => item.companyId))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Twenty batch synchronization failed"
      console.error("[lead-candidate-review] Twenty batch synchronization failed:", input.runId, error)
      synced = prepared.map((item) => ({ companyId: item.companyId, ok: false, error: message }))
    }
  }
  const syncByCompany = new Map(synced.map((result) => [result.companyId, result]))
  const results = eligible.map((item) => {
    const promotion = preparedByItem.get(item.id)
    const sync = promotion ? syncByCompany.get(promotion.companyId) : null
    if (promotion && sync?.ok && sync.twentyCompanyId) {
      return {
        id: item.id,
        candidateId: item.candidate_id,
        companyId: promotion.companyId,
        twentyCompanyId: sync.twentyCompanyId,
        domain: item.domain,
        ok: true,
        promotionAttempts: Math.min(item.promotion_attempts + 1, 20),
      }
    }
    const error = sync?.error ?? preparationError ?? "Candidate preparation or Twenty batch mapping failed"
    console.error("[lead-candidate-review] batch promotion failed:", item.domain, error)
    return {
      id: item.id,
      candidateId: item.candidate_id,
      companyId: promotion?.companyId ?? null,
      twentyCompanyId: sync?.twentyCompanyId ?? null,
      domain: item.domain,
      ok: false,
      error,
      promotionAttempts: Math.min(item.promotion_attempts + 1, 20),
    }
  })
  if (results.length > 0) {
    const finalized = await sb.rpc("sales_finalize_lead_candidate_promotions", {
      p_run_id: input.runId,
      p_rows: results.map((result) => ({
        item_id: result.id,
        candidate_id: result.candidateId,
        company_id: result.companyId,
        twenty_company_id: result.twentyCompanyId,
        ok: result.ok,
        error: result.error ?? null,
        promotion_attempts: result.promotionAttempts,
      })),
    })
    if (finalized.error) throw new Error(`Lead candidate batch finalization failed: ${finalized.error.message}`)
  }

  await insertAuditEvents(results.map((result) => ({
    run_id: input.runId,
    entity_type: "item",
    entity_id: result.id,
    action: result.ok ? "candidate_approved_and_synced" : "candidate_promotion_failed",
    operator_name: input.operatorName,
    detail: { runId: input.runId, domain: result.domain, note: input.note, error: result.error ?? null },
  })))
  await refreshLeadCandidateRunCounts(input.runId)
  return {
    approved: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    invalid,
    skipped: ids.length - eligible.length - invalid.length,
  }
}

export async function approvePilotRun(input: { runId: string; operatorName: string; note: string }) {
  const sb = getSb()
  const runResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
    .select("id, source_slug, source_config_ids, execution_mode, status, cancel_requested, verify_limit, verified_count, forms_checked_count, forms_qualified_count, failure_count, operator_approved_count, operator_rejected_count")
    .eq("id", input.runId)
    .single()
  if (runResult.error) throw new Error(runResult.error.message)
  const run = runResult.data as {
    source_slug: string
    source_config_ids: string[]
    execution_mode: string
    status: string
    cancel_requested: boolean
    verify_limit: number
    verified_count: number
    forms_checked_count: number
    forms_qualified_count: number
    failure_count: number
    operator_approved_count: number
    operator_rejected_count: number
  }
  const reviewableResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
    .select("id", { count: "exact", head: true })
    .eq("run_id", input.runId)
    .eq("form_verified", true)
    .eq("quality_status", "passed")
    .in("review_status", ["pending", "approved", "rejected"])
  if (reviewableResult.error) throw new Error(reviewableResult.error.message)
  const minimumVerified = Math.min(5, run.verify_limit)
  const failureRate = run.verified_count > 0 ? run.failure_count / run.verified_count : 1
  const reviewableCount = reviewableResult.count ?? 0
  const reviewEvidence = pilotReviewEvidence({
    formsQualifiedCount: run.forms_qualified_count,
    reviewableCount,
  })
  const reviewedCandidates = run.operator_approved_count + run.operator_rejected_count
  if (run.source_slug !== EVIDENCE_FIRST_SOURCE || run.execution_mode !== "pilot" || !["completed", "partial"].includes(run.status) || run.cancel_requested) {
    throw new Error("Only a completed evidence-first pilot can be approved for scale")
  }
  if (run.verified_count < minimumVerified || run.forms_checked_count < minimumVerified || !reviewEvidence.hasReviewableQualifiedForm || reviewedCandidates < reviewEvidence.requiredReviews || failureRate > 0.2) {
    throw new Error("Pilot evidence is insufficient: verify five candidates, human-review up to three qualified forms, qualify one form, and keep failures at or below 20%")
  }
  await insertAuditEvents([{
    run_id: input.runId,
    entity_type: "run",
    entity_id: input.runId,
    action: "pilot_scale_approval_requested",
    operator_name: input.operatorName,
    detail: { sourceConfigIds: run.source_config_ids, note: input.note },
  }])
  const readySources = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS)
    .select("id")
    .in("id", run.source_config_ids)
    .eq("approval_status", "approved")
    .eq("active", true)
    .eq("last_status", "ready")
  if (readySources.error) throw new Error(readySources.error.message)
  if ((readySources.data ?? []).length !== run.source_config_ids.length) throw new Error("One or more pilot sources are no longer approved and ready")

  const approvedAt = new Date().toISOString()
  const sources = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update({
    pilot_approved_by: input.operatorName,
    pilot_approved_at: approvedAt,
  }).in("id", run.source_config_ids).select("id")
  if (sources.error) throw new Error(sources.error.message)
  const updated = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).update({ operator_status: "approved_for_scale" }).eq("id", input.runId)
  if (updated.error) throw new Error(updated.error.message)
  await insertAuditEvents([{
    run_id: input.runId,
    entity_type: "run",
    entity_id: input.runId,
    action: "pilot_approved_for_scale",
    operator_name: input.operatorName,
    detail: { sourceConfigIds: run.source_config_ids, verified: run.verified_count, formsQualified: run.forms_qualified_count, reviewableCount, reviewedCandidates, failureRate, note: input.note },
  }])
  return { approvedSources: (sources.data ?? []).length, approvedAt }
}

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { getSalesCrmFieldConfig } from "./crm-field-config"
import { EVIDENCE_FIRST_SOURCE } from "./lead-candidate-verification"
import { promoteFormQualifiedCandidate } from "./lead-candidate-promotion"
import { parsePromotionSnapshot, promotionEligibilityReason, type ReviewItemRow } from "./lead-candidate-review-gate"
import { applyTwentyCrmMetadata } from "./twenty-crm-metadata"
import { refreshLeadCandidateRunCounts } from "./lead-candidate-runs"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
const MAX_REVIEW_ITEMS = 20

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
  if (run.source_slug !== EVIDENCE_FIRST_SOURCE || run.cancel_requested || run.status === "cancelled") throw new Error("Run is not eligible for candidate promotion")

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
    const twentyMetadata = await applyTwentyCrmMetadata(await getSalesCrmFieldConfig())
    if (twentyMetadata.error) throw new Error(`Twenty CRM metadata is not ready: ${twentyMetadata.error}`)
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

  const results = [] as Array<{ id: string; domain: string; ok: boolean; error?: string }>
  for (const item of eligible) {
    const snapshot = parsePromotionSnapshot(item)
    if (!snapshot) continue
    try {
      const promoted = await promoteFormQualifiedCandidate({
        runId: input.runId,
        countryCode: snapshot.countryCode,
        syncTwenty: true,
        candidateId: item.candidate_id,
        companyName: snapshot.sourceRecord.company_name,
        domain: item.domain,
        sourcePageUrl: snapshot.sourceRecord.source_page_url,
        qualityGate: snapshot.qualityGate,
        score: snapshot.score,
        detections: snapshot.detections,
        form: snapshot.form,
        source: EVIDENCE_FIRST_SOURCE,
      })
      if (!promoted.promoted || !promoted.twentySynced) throw new Error(promoted.error ?? "Twenty promotion failed")
      const saved = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
        status: "promoted",
        review_status: "approved",
        company_id: promoted.companyId,
        twenty_synced: true,
        twenty_company_id: promoted.twentyCompanyId,
        promotion_attempts: Math.min(item.promotion_attempts + 1, 20),
        promotion_error: null,
        processed_at: new Date().toISOString(),
      }).eq("id", item.id).eq("review_status", "promoting")
      if (saved.error) throw new Error(saved.error.message)
      results.push({ id: item.id, domain: item.domain, ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Candidate promotion failed"
      console.error("[lead-candidate-review] promotion failed:", item.domain, error)
      const failed = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
        review_status: "promotion_failed",
        promotion_attempts: Math.min(item.promotion_attempts + 1, 20),
        promotion_error: message,
      }).eq("id", item.id).eq("review_status", "promoting")
      if (failed.error) console.error("[lead-candidate-review] failure persistence failed:", item.domain, failed.error.message)
      results.push({ id: item.id, domain: item.domain, ok: false, error: message })
    }
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
  const minimumVerified = Math.min(5, run.verify_limit)
  const failureRate = run.verified_count > 0 ? run.failure_count / run.verified_count : 1
  const requiredReviews = Math.min(3, run.forms_qualified_count)
  const reviewedCandidates = run.operator_approved_count + run.operator_rejected_count
  if (run.source_slug !== EVIDENCE_FIRST_SOURCE || run.execution_mode !== "pilot" || !["completed", "partial"].includes(run.status) || run.cancel_requested) {
    throw new Error("Only a completed evidence-first pilot can be approved for scale")
  }
  if (run.verified_count < minimumVerified || run.forms_checked_count < minimumVerified || run.forms_qualified_count < 1 || reviewedCandidates < requiredReviews || failureRate > 0.2) {
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
    detail: { sourceConfigIds: run.source_config_ids, verified: run.verified_count, formsQualified: run.forms_qualified_count, reviewedCandidates, failureRate, note: input.note },
  }])
  return { approvedSources: (sources.data ?? []).length, approvedAt }
}

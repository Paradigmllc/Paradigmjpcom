import { getServiceSalesSupabase } from "@/lib/supabase"
import { computeSourceCoverage } from "./source-coverage"
import type { LeadBatchItemStatus, LeadBatchStatus } from "./monthly-batch"
import type { SalesCompany } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const CORRUPTED_TEXT_PATTERN = /(繝|縺|莨|譁|譛|蛟|蜍|鬘|螂|謌|險|譁ｭ|蜊|蟆)/

interface BatchRow {
  id: string
  min_outreach_score: number
  max_outreach_ready: number
}

interface BatchItemRow {
  id: string
  company_id: string | null
}

function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
}

async function refreshLeadBatchCounters(sb: ServiceSupabase, batchId: string): Promise<void> {
  const { data, error } = await sb
    .from(DB_TABLES.SALES_LEAD_BATCH_ITEMS)
    .select("status")
    .eq("batch_id", batchId)
  if (error) {
    console.error("[sales-lead-qualification] counter refresh failed:", error.message)
    return
  }

  const rows = (data ?? []) as Array<{ status: LeadBatchItemStatus }>
  const count = (status: LeadBatchItemStatus) => rows.filter((row) => row.status === status).length
  const outreachReady = count("outreach_ready")
  const manualReview = count("manual_review")
  const rejected = count("rejected") + count("error")
  const nextStatus: LeadBatchStatus = outreachReady > 0 || manualReview > 0 ? "outreach_ready" : "completed"

  const { error: updateErr } = await sb
    .from(DB_TABLES.SALES_LEAD_BATCHES)
    .update({
      status: nextStatus,
      duplicate_count: count("duplicate"),
      rejected_count: rejected,
      enrichment_queued_count: count("enrichment_queued"),
      qualified_count: count("qualified") + outreachReady + manualReview,
      outreach_ready_count: outreachReady,
      manual_review_count: manualReview,
      sent_count: count("sent"),
      responded_count: count("responded"),
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", batchId)
  if (updateErr) console.error("[sales-lead-qualification] batch counters update failed:", updateErr.message)
}

function qualityForCompany(company: SalesCompany, minScore: number): {
  score: number
  status: LeadBatchItemStatus
  reason: string | null
  gate: JsonRecord
} {
  const meta = company.meta ?? {}
  const coverage = computeSourceCoverage(company)
  const contactFormUrl = typeof meta.contact_form_url === "string" && meta.contact_form_url.length > 0
  const diagnosis = meta.pain_diagnosis as JsonRecord | undefined
  const diagnosisText = [
    diagnosis?.primaryPain,
    diagnosis?.primary_pain,
    diagnosis?.recommendedOffer,
    diagnosis?.recommended_offer,
    meta.personalized_copy,
  ].filter((value): value is string => typeof value === "string")
  const hasMojibake = diagnosisText.some((value) => CORRUPTED_TEXT_PATTERN.test(value))
  const reportReady = company.pipeline_status === "report_ready" && Boolean(company.report_url || company.slug)
  const issues = company.detected_issues?.length ?? 0
  const score = Math.max(
    0,
    Math.min(
      100,
      20 +
        (reportReady ? 20 : 0) +
        (coverage.collected >= 3 ? 20 : coverage.collected * 5) +
        (issues > 0 ? 10 : 0) +
        (contactFormUrl ? 15 : 0) +
        (diagnosis ? 10 : 0) -
        (hasMojibake ? 30 : 0),
    ),
  )
  const gate = {
    reportReady,
    collectedSources: coverage.collected,
    hasContactForm: contactFormUrl,
    hasDetectedIssue: issues > 0,
    hasDiagnosis: Boolean(diagnosis),
    noMojibake: !hasMojibake,
    minScore,
  }
  if (hasMojibake) return { score, status: "manual_review", reason: "mojibake_or_broken_copy", gate }
  if (!reportReady) return { score, status: "manual_review", reason: "report_not_ready", gate }
  if (coverage.collected < 3) return { score, status: "manual_review", reason: "thin_evidence", gate }
  if (!contactFormUrl) return { score, status: "manual_review", reason: "contact_form_missing", gate }
  if (issues === 0) return { score, status: "rejected", reason: "no_clear_improvement_signal", gate }
  if (score >= minScore) return { score, status: "outreach_ready", reason: null, gate }
  return { score, status: "rejected", reason: "below_outreach_score", gate }
}

export async function qualifyLeadBatch(batchId: string, limit = 500): Promise<{
  ok: boolean
  processed: number
  outreachReady: number
  manualReview: number
  rejected: number
  error?: string
}> {
  const sb = getSb()
  if (!sb) return { ok: false, processed: 0, outreachReady: 0, manualReview: 0, rejected: 0, error: "Supabase service_role not configured" }

  const batchRes = await sb.from(DB_TABLES.SALES_LEAD_BATCHES).select("id, min_outreach_score, max_outreach_ready").eq("id", batchId).maybeSingle()
  if (batchRes.error) return { ok: false, processed: 0, outreachReady: 0, manualReview: 0, rejected: 0, error: batchRes.error.message }
  const batch = batchRes.data as BatchRow | null
  if (!batch) return { ok: false, processed: 0, outreachReady: 0, manualReview: 0, rejected: 0, error: "batch not found" }

  await sb.from(DB_TABLES.SALES_LEAD_BATCHES).update({ status: "qualifying" }).eq("id", batchId)
  const itemRes = await sb
    .from(DB_TABLES.SALES_LEAD_BATCH_ITEMS)
    .select("id, company_id")
    .eq("batch_id", batchId)
    .not("company_id", "is", null)
    .in("status", ["imported", "enrichment_queued", "enriched", "qualified", "manual_review"])
    .order("row_index", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 2000)))
  if (itemRes.error) return { ok: false, processed: 0, outreachReady: 0, manualReview: 0, rejected: 0, error: itemRes.error.message }

  let processed = 0
  let outreachReady = 0
  let manualReview = 0
  let rejected = 0
  const existingReady = await sb
    .from(DB_TABLES.SALES_LEAD_BATCH_ITEMS)
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "outreach_ready")
  let readySlots = Math.max(0, batch.max_outreach_ready - (existingReady.count ?? 0))

  const items = (itemRes.data ?? []) as BatchItemRow[]
  const companyIds = [...new Set(items.map((item) => item.company_id).filter((id): id is string => id !== null))]
  const companyMap = new Map<string, SalesCompany>()
  if (companyIds.length > 0) {
    const chunkSize = 300
    for (let i = 0; i < companyIds.length; i += chunkSize) {
      const chunk = companyIds.slice(i, i + chunkSize)
      const { data: companiesData, error: companiesError } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("*")
        .in("id", chunk)
      if (companiesError) {
        console.error("[sales-lead-qualification] batch company fetch failed:", companiesError.message)
        continue
      }
      for (const company of (companiesData ?? []) as SalesCompany[]) {
        companyMap.set(company.id, company)
      }
    }
  }

  const updates: Promise<unknown>[] = []
  for (const item of items) {
    if (!item.company_id) continue
    const company = companyMap.get(item.company_id)
    if (!company) continue
    const result = qualityForCompany(company, batch.min_outreach_score)
    const finalStatus = result.status === "outreach_ready" && readySlots <= 0 ? "manual_review" : result.status
    if (finalStatus === "outreach_ready") readySlots--
    updates.push(
      (async () => {
        const itemUpdate = await sb
          .from(DB_TABLES.SALES_LEAD_BATCH_ITEMS)
          .update({
            status: finalStatus,
            qualification_score: result.score,
            rejection_reason: finalStatus === "manual_review" && result.status === "outreach_ready"
              ? "outreach_ready_cap_reached"
              : result.reason,
            quality_gate: result.gate,
          })
          .eq("id", item.id)
        if (itemUpdate.error) {
          console.error("[sales-lead-qualification] item update failed:", item.id, itemUpdate.error.message)
          return
        }
        processed++
        if (finalStatus === "outreach_ready") outreachReady++
        else if (finalStatus === "manual_review") manualReview++
        else if (finalStatus === "rejected") rejected++
      })(),
    )
  }
  await Promise.all(updates)

  await refreshLeadBatchCounters(sb, batchId)
  return { ok: true, processed, outreachReady, manualReview, rejected }
}

import { getServiceSalesSupabase } from "@/lib/supabase"
import { normalizeCompanyName, normalizeDomain } from "./dedup"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "./enrichment-jobs"
import { salesScopeFromCountry, type SalesLocaleScope } from "./locale-scope"
import { findExistingCompany, upsertCompanyByDomain, batchFindExistingByDomains } from "./companies"
import type { Industry, Region } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
export type LeadBatchStatus =
  | "draft"
  | "importing"
  | "enriching"
  | "qualifying"
  | "outreach_ready"
  | "completed"
  | "failed"
export type LeadBatchItemStatus =
  | "imported"
  | "duplicate"
  | "enrichment_queued"
  | "enriched"
  | "enriched_inline"
  | "qualified"
  | "rejected"
  | "outreach_ready"
  | "manual_review"
  | "sent"
  | "responded"
  | "error"
export interface LeadBatchCsvRow {
  company_name?: string
  domain?: string
  industry?: Industry | null
  prefecture?: string | null
  report_locale?: string | null
  target_country?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
  contact_name?: string | null
  contact_title?: string | null
  source?: string | null
  search_url?: string | null
  search_title?: string | null
  search_snippet?: string | null
  search_score?: string | null
  searxng_run_id?: string | null
  searxng_result_id?: string | null
}
export interface SalesLeadBatchSummary {
  id: string
  name: string
  region: Region
  reportLocale: string
  targetCountry: string
  source: string
  status: LeadBatchStatus
  totalRows: number
  importedCount: number
  duplicateCount: number
  rejectedCount: number
  enrichmentQueuedCount: number
  qualifiedCount: number
  outreachReadyCount: number
  manualReviewCount: number
  sentCount: number
  respondedCount: number
  minOutreachScore: number
  maxOutreachReady: number
  dryRunOnly: boolean
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  statusCounts: Record<string, number>
  topRejectionReasons: Array<{ reason: string; count: number }>
}
interface BatchRow {
  id: string
  name: string
  region: Region
  report_locale: string
  target_country: string
  source: string
  status: LeadBatchStatus
  total_rows: number
  imported_count: number
  duplicate_count: number
  rejected_count: number
  enrichment_queued_count: number
  qualified_count: number
  outreach_ready_count: number
  manual_review_count: number
  sent_count: number
  responded_count: number
  min_outreach_score: number
  max_outreach_ready: number
  dry_run_only: boolean
  error_message: string | null
  created_at: string
  updated_at: string
}
interface BatchItemRow {
  id: string
  batch_id: string
  company_id: string | null
  row_index: number
  domain: string | null
  company_name: string | null
  status: LeadBatchItemStatus
  qualification_score: number
  rejection_reason: string | null
  quality_gate: JsonRecord
  source_payload: JsonRecord
}
function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
}
function defaultBatchName(scope: SalesLocaleScope, source: string): string {
  const ym = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date())
  return `${ym} ${source} ${scope.targetCountry}`
}
function countStatus(items: Pick<BatchItemRow, "status" | "rejection_reason">[]): {
  statusCounts: Record<string, number>
  topRejectionReasons: Array<{ reason: string; count: number }>
} {
  const statusCounts: Record<string, number> = {}
  const reasons: Record<string, number> = {}
  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1
    if (item.rejection_reason) reasons[item.rejection_reason] = (reasons[item.rejection_reason] ?? 0) + 1
  }
  return {
    statusCounts,
    topRejectionReasons: Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count })),
  }
}
function mapBatch(row: BatchRow, items: Pick<BatchItemRow, "status" | "rejection_reason">[]): SalesLeadBatchSummary {
  const counts = countStatus(items)
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    reportLocale: row.report_locale,
    targetCountry: row.target_country,
    source: row.source,
    status: row.status,
    totalRows: row.total_rows,
    importedCount: row.imported_count,
    duplicateCount: row.duplicate_count,
    rejectedCount: row.rejected_count,
    enrichmentQueuedCount: row.enrichment_queued_count,
    qualifiedCount: row.qualified_count,
    outreachReadyCount: row.outreach_ready_count,
    manualReviewCount: row.manual_review_count,
    sentCount: row.sent_count,
    respondedCount: row.responded_count,
    minOutreachScore: row.min_outreach_score,
    maxOutreachReady: row.max_outreach_ready,
    dryRunOnly: row.dry_run_only,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...counts,
  }
}
export async function listLeadBatches(scope: SalesLocaleScope, limit = 8): Promise<{
  ok: boolean
  batches: SalesLeadBatchSummary[]
  error?: string
}> {
  const sb = getSb()
  if (!sb) return { ok: false, batches: [], error: "Supabase service_role not configured" }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_LEAD_BATCHES)
    .select("*")
    .eq("region", scope.region)
    .eq("report_locale", scope.reportLocale)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return { ok: false, batches: [], error: error.message }
  const batches = (data ?? []) as BatchRow[]
  const ids = batches.map((batch) => batch.id)
  const itemRes = ids.length > 0
    ? await sb
        .from(DB_TABLES.SALES_LEAD_BATCH_ITEMS)
        .select("batch_id, status, rejection_reason")
        .in("batch_id", ids)
    : { data: [], error: null }
  if (itemRes.error) return { ok: false, batches: [], error: itemRes.error.message }
  const items = ((itemRes.data ?? []) as Array<Pick<BatchItemRow, "batch_id" | "status" | "rejection_reason">>)
  return {
    ok: true,
    batches: batches.map((batch) => mapBatch(batch, items.filter((item) => item.batch_id === batch.id))),
  }
}
export async function createLeadBatch(input: {
  name?: string | null
  rows: LeadBatchCsvRow[]
  reportLocale?: string | null
  targetCountry?: string | null
  source?: string | null
  enrich?: boolean
  minOutreachScore?: number
  maxOutreachReady?: number
  dryRunOnly?: boolean
}): Promise<{ ok: boolean; batch?: SalesLeadBatchSummary; error?: string; failures?: Array<{ row: number; reason: string }> }> {
  const sb = getSb()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const source = input.source?.trim() || "monthly_csv"
  const scope = salesScopeFromCountry({ reportLocale: input.reportLocale, targetCountry: input.targetCountry })
  const batchInsert = await sb
    .from(DB_TABLES.SALES_LEAD_BATCHES)
    .insert({
      name: input.name?.trim() || defaultBatchName(scope, source),
      region: scope.region,
      report_locale: scope.reportLocale,
      target_country: scope.targetCountry,
      source,
      status: "importing",
      total_rows: input.rows.length,
      min_outreach_score: Math.max(0, Math.min(100, input.minOutreachScore ?? 70)),
      max_outreach_ready: Math.max(1, Math.min(5000, input.maxOutreachReady ?? 500)),
      dry_run_only: input.dryRunOnly ?? false,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single()
  if (batchInsert.error) return { ok: false, error: batchInsert.error.message }
  const batch = batchInsert.data as BatchRow
  const seen = new Set<string>()
  const failures: Array<{ row: number; reason: string }> = []
  let imported = 0
  let duplicates = 0
  let rejected = 0
  let jobs = 0
  let fatalError: string | null = null
  const companyIdsForTwentySync: string[] = []
  // ── Fix 3: Wrap entire processing in try/catch for mid-batch crash resilience ──
  // Pre-fetch existing companies by domain to avoid N+1 lookups
  const allDomains = input.rows
    .map((row) => normalizeDomain(row.domain))
    .filter((d): d is string => d !== null && d.length > 0)
  const existingDomainMap = await batchFindExistingByDomains(allDomains)
  const batchItems: Array<Record<string, unknown>> = []
  try {
  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i]
    const cleanDomain = normalizeDomain(row.domain)
    const nameKey = normalizeCompanyName(row.company_name)
    const dedupeKey = cleanDomain ?? nameKey
    const baseItem = {
      batch_id: batch.id,
      row_index: i,
      domain: cleanDomain,
      company_name: row.company_name ?? null,
      source_payload: row as JsonRecord,
    }
    if (!row.company_name || !cleanDomain) {
      rejected++
      failures.push({ row: i, reason: "company_name and valid domain are required" })
      batchItems.push({
        ...baseItem,
        status: "rejected",
        rejection_reason: "missing_company_or_domain",
      })
      continue
    }
    if (dedupeKey && seen.has(dedupeKey)) {
      duplicates++
      batchItems.push({
        ...baseItem,
        status: "duplicate",
        rejection_reason: "duplicate_in_batch",
      })
      continue
    }
    if (dedupeKey) seen.add(dedupeKey)
    const rowScope = salesScopeFromCountry({
      reportLocale: row.report_locale ?? input.reportLocale,
      targetCountry: row.target_country ?? row.country ?? input.targetCountry,
    })
    const existing = existingDomainMap.get(cleanDomain) ?? await findExistingCompany({ domain: cleanDomain, nameKey, region: rowScope.region })
    const saved = existing
      ? { ok: true, company: existing }
      : await upsertCompanyByDomain({
          domain: cleanDomain,
          company_name: row.company_name,
          region: rowScope.region,
          report_locale: rowScope.reportLocale,
          target_country: rowScope.targetCountry,
          industry: row.industry ?? null,
          prefecture: row.prefecture ?? null,
          pipeline_status: input.enrich === false ? "pending" : "scanning",
          source,
          meta: {
            monthly_batch: { batch_id: batch.id, row_index: i, source },
            contact_seed: {
              email: row.email ?? null,
              phone: row.phone ?? null,
              name: row.contact_name ?? null,
              title: row.contact_title ?? null,
            },
          },
        })
    if (!saved.ok || !saved.company) {
      rejected++
      failures.push({ row: i, reason: saved.error ?? "company upsert failed" })
      batchItems.push({
        ...baseItem,
        status: "error",
        rejection_reason: saved.error ?? "company_upsert_failed",
      })
      continue
    }
    imported++
    companyIdsForTwentySync.push(saved.company.id)
    let status: LeadBatchItemStatus = "imported"
    if (input.enrich !== false && saved.company.pipeline_status !== "report_ready") {
      const queued = await enqueueCompanyEnrichment({
        companyId: saved.company.id,
        source,
        triggeredBy: "monthly_lead_batch",
        priority: source.includes("apollo") || source.includes("wappalyzer") ? 78 : 65,
        payload: { batch_id: batch.id, row_index: i, domain: cleanDomain, company_name: row.company_name },
      })
      if (queued.ok) {
        jobs++
        status = "enrichment_queued"
      } else {
        // Enrichment queue failed — run lightweight enrichment inline
        try {
          const { detectTechStack } = await import("./sources/wappalyzer")
          const url = cleanDomain.startsWith("http") ? cleanDomain : `https://${cleanDomain}`
          const techResult = await detectTechStack(url).catch(() => ({ tech: [], server: null }))
          const { isEnterpriseTechStack } = await import("./sources/enterprise-filter")
          const enterpriseCheck = isEnterpriseTechStack(techResult.tech.map((t: { name: string }) => t.name))
          await sb.from(DB_TABLES.SALES_COMPANIES).update({
            pipeline_status: enterpriseCheck.isEnterprise ? "pending" : "report_ready",
            meta: {
              tech: { stack: techResult.tech, server: techResult.server, count: techResult.tech.length },
              sales_os: { last_enriched_at: new Date().toISOString(), enriched_via: "inline_import" },
              enterprise_filter: enterpriseCheck.isEnterprise ? { excluded: true, matched_tech: enterpriseCheck.matched } : null,
              ...(saved.company.meta as Record<string, unknown> || {}),
            },
          }).eq("id", saved.company.id)
          status = "enriched_inline"
          // Auto-sync to Twenty
          try {
            const { syncCompanyKarteToTwenty } = await import("./twenty-sync-companies")
            const syncResult = await syncCompanyKarteToTwenty(saved.company.id)
            if (!syncResult.ok && syncResult.configured) {
              console.error("[monthly-batch] inline Twenty sync failed:", syncResult.error)
            }
          } catch (syncError) {
            console.error("[monthly-batch] inline Twenty sync crashed:", syncError)
          }
          console.info(`[monthly-batch] inline enrichment + Twenty sync completed for ${cleanDomain}`)
        } catch (inlineErr) {
          console.error(`[monthly-batch] inline enrichment failed for ${cleanDomain}:`, inlineErr)
        }
      }
    }
    batchItems.push({
      ...baseItem,
      company_id: saved.company.id,
      status,
    })
  }
  // Batch insert all items in one operation
  if (batchItems.length > 0) {
    const chunkSize = 500
    for (let i = 0; i < batchItems.length; i += chunkSize) {
      const chunk = batchItems.slice(i, i + chunkSize)
      await sb.from(DB_TABLES.SALES_LEAD_BATCH_ITEMS).insert(chunk)
    }
  }
  } catch (err) {
    // Fix 3: Save partial progress on catastrophic failure
    fatalError = err instanceof Error ? err.message : String(err)
    console.error("[monthly-batch] batch processing crashed mid-way:", err)
    if (batchItems.length > 0) {
      try { await sb.from(DB_TABLES.SALES_LEAD_BATCH_ITEMS).insert(batchItems) } catch { /* fallthrough */ }
    }
    // Don't rethrow — we save partial progress below
  }
  let twentySynced = 0
  let twentyFailed = 0
  const uniqueCompanyIdsForTwenty = [...new Set(companyIdsForTwentySync)].slice(0, 50)
  if (uniqueCompanyIdsForTwenty.length > 0) {
    try {
      const { syncCompanyKarteToTwenty } = await import("./twenty-sync-companies")
      for (const companyId of uniqueCompanyIdsForTwenty) {
        const syncResult = await syncCompanyKarteToTwenty(companyId)
        if (syncResult.ok) {
          twentySynced++
        } else if (syncResult.configured) {
          twentyFailed++
          console.error("[monthly-batch] Twenty sync failed:", syncResult.error)
        }
      }
    } catch (syncError) {
      twentyFailed = uniqueCompanyIdsForTwenty.length
      console.error("[monthly-batch] Twenty sync batch crashed:", syncError)
    }
  }
  // Determine batch status based on whether we completed or crashed
  const finalStatus = fatalError
    ? (imported > 0 ? "importing" : "failed") // "importing" = partial, can be retried
    : (jobs > 0 ? "enriching" : "qualifying")
  await sb
    .from(DB_TABLES.SALES_LEAD_BATCHES)
    .update({
      status: finalStatus,
      imported_count: imported,
      duplicate_count: duplicates,
      rejected_count: rejected,
      enrichment_queued_count: jobs,
      error_message: fatalError ?? (twentyFailed > 0 ? `Twenty sync failed for ${twentyFailed}/${uniqueCompanyIdsForTwenty.length} imported companies` : failures.length > 0 ? `${failures.length} rows need review` : null),
      completed_at: fatalError ? new Date().toISOString() : null,
    })
    .eq("id", batch.id)
  if (fatalError) {
    return { ok: false, error: fatalError, failures: failures.slice(0, 20) }
  }
  if (jobs > 0) {
    const triggered = await triggerEnrichmentRunner(Math.min(jobs, 5))
    if (!triggered.ok) {
      console.warn("[monthly-batch] Trigger.dev unavailable, running first enrichment job inline")
      try {
        const { runEnrichmentJobs } = await import("./enrichment-jobs-runner")
        await runEnrichmentJobs(1)
      } catch (e) {
        console.error("[monthly-batch] inline enrichment fallback failed:", e)
      }
    }
  } else if (imported > 0) {
    console.warn("[monthly-batch] enrichment queue unavailable, running first company enrichment inline")
    try {
      const { processJob } = await import("./enrichment-jobs-runner")
      const firstItem = (await sb.from(DB_TABLES.SALES_LEAD_BATCH_ITEMS).select("company_id").eq("batch_id", batch.id).eq("status", "imported").order("row_index").limit(1)).data?.[0] as { company_id: string } | undefined
      if (firstItem?.company_id) {
        const pseudoJob: Parameters<typeof processJob>[1] = {
          id: `inline-${batch.id.slice(0, 8)}`, company_id: firstItem.company_id, job_type: "company_karte",
          status: "queued", priority: 65, attempts: 0, max_attempts: 1, source, triggered_by: "monthly_lead_batch",
          next_run_at: new Date().toISOString(), started_at: null, completed_at: null, locked_at: null, lock_owner: null,
          error_message: null, input_payload: { batch_id: batch.id }, result_payload: {},
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }
        await processJob(sb, pseudoJob)
      }
    } catch (e) {
      console.error("[monthly-batch] inline enrichment fallback failed:", e)
    }
  }
  const listed = await listLeadBatches(scope, 1)
  return {
    ok: true,
    batch: listed.batches[0],
    failures: [
      ...failures.slice(0, 20),
      ...(twentyFailed > 0 ? [{ row: -1, reason: `Twenty sync failed for ${twentyFailed}/${uniqueCompanyIdsForTwenty.length} companies (synced ${twentySynced})` }] : []),
    ],
  }
}

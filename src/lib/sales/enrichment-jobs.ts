import { getServiceSalesSupabase } from "@/lib/supabase"
import { enrichFromContact } from "./enrich"
import { findCompanyById, upsertCompanyByDomain } from "./companies"
import { runDifyDiagnosis } from "./dify-diagnosis"
import { fetchDiagnosticReport } from "./diagnostic"
import { generateReplacementDemo } from "./demo-generator"
import { computeSourceCoverage, saveSourceCoverageRows } from "./source-coverage"
import { saveTechStackDetections } from "./source-acquisition"
import { syncCompanyKarteToTwenty } from "./twenty-sync"
import { buildReportUrl, normalizeReportLocale } from "./routing"
import { auditJapanMarketReadiness } from "./sources/japan-market-audit"
import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type EnrichmentJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled"
export type EnrichmentJobType = "company_karte" | "dify_diagnosis" | "report_personalize" | "twenty_sync"

export interface SalesEnrichmentJob {
  id: string
  company_id: string
  job_type: EnrichmentJobType
  status: EnrichmentJobStatus
  priority: number
  attempts: number
  max_attempts: number
  source: string | null
  triggered_by: string | null
  next_run_at: string
  started_at: string | null
  completed_at: string | null
  locked_at: string | null
  lock_owner: string | null
  error_message: string | null
  input_payload: JsonRecord
  result_payload: JsonRecord
  created_at: string
  updated_at: string
}

export interface EnqueueEnrichmentInput {
  companyId: string
  source: string
  triggeredBy: string
  priority?: number
  payload?: JsonRecord
}

export interface EnrichmentRunResult {
  ok: boolean
  processed: number
  completed: number
  failed: number
  errors: string[]
}

interface JobCompanyProjection {
  company_name?: string | null
  domain?: string | null
}

interface RecentJobRow {
  id: string
  company_id: string
  job_type: string
  status: string
  priority: number | null
  attempts: number | null
  max_attempts: number | null
  source: string | null
  triggered_by: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  sales_companies?: JobCompanyProjection | JobCompanyProjection[] | null
}

export interface DashboardEnrichmentJob {
  id: string
  companyId: string
  companyName: string | null
  domain: string | null
  jobType: string
  status: string
  priority: number
  attempts: number
  maxAttempts: number
  source: string | null
  triggeredBy: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
}

function jobRunnerUrl(): string | null {
  const explicit = process.env.TRIGGER_DEV_SALES_ENRICHMENT_WEBHOOK_URL ?? process.env.N8N_SALES_ENRICHMENT_WEBHOOK_URL
  if (explicit && explicit.trim().length > 0) return explicit

  const base = process.env.PARADIGMJP_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!base || base.trim().length === 0) return null
  return `${base.replace(/\/+$/, "")}/api/sales/enrichment/run`
}

export async function enqueueCompanyEnrichment(
  input: EnqueueEnrichmentInput,
): Promise<{ ok: boolean; job?: SalesEnrichmentJob; error?: string }> {
  const sb = getSb()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }

  const { data, error } = await sb
    .from("sales_enrichment_jobs")
    .insert({
      company_id: input.companyId,
      job_type: "company_karte",
      status: "queued",
      priority: input.priority ?? 50,
      source: input.source,
      triggered_by: input.triggeredBy,
      input_payload: input.payload ?? {},
    })
    .select("*")
    .single()

  if (!error) return { ok: true, job: data as SalesEnrichmentJob }

  if (error.code === "23505") {
    const existing = await sb
      .from("sales_enrichment_jobs")
      .select("*")
      .eq("company_id", input.companyId)
      .eq("job_type", "company_karte")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing.data) return { ok: true, job: existing.data as SalesEnrichmentJob }
  }

  console.error("[sales-enrichment] enqueue failed:", error.message)
  return { ok: false, error: error.message }
}

export async function triggerEnrichmentRunner(limit = 3): Promise<{ ok: boolean; error?: string }> {
  const url = jobRunnerUrl()
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!url || !secret) {
    console.warn("[sales-enrichment] runner trigger skipped: URL or N8N_WEBHOOK_SECRET is not configured")
    return { ok: false, error: "runner trigger not configured" }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({ limit }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      const text = await res.text().catch((e: unknown) => `read body failed: ${String(e)}`)
      console.error("[sales-enrichment] runner trigger failed:", res.status, text.slice(0, 300))
      return { ok: false, error: `runner HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[sales-enrichment] runner trigger exception:", message)
    return { ok: false, error: message }
  }
}

async function logDiagnosisEvent(
  sb: ServiceSupabase,
  input: {
    companyId: string
    jobId: string
    eventType: string
    status: "info" | "success" | "warning" | "error"
    title: string
    message?: string
    payload?: JsonRecord
  },
): Promise<void> {
  const { error } = await sb.from("sales_diagnosis_events").insert({
    company_id: input.companyId,
    job_id: input.jobId,
    event_type: input.eventType,
    status: input.status,
    title: input.title,
    message: input.message ?? null,
    payload: input.payload ?? {},
  })
  if (error) console.error("[sales-enrichment] diagnosis event insert failed:", error.message)
}

async function fetchQueuedJobs(sb: ServiceSupabase, limit: number): Promise<SalesEnrichmentJob[]> {
  const { data, error } = await sb
    .from("sales_enrichment_jobs")
    .select("*")
    .eq("status", "queued")
    .lte("next_run_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("[sales-enrichment] fetch queued jobs failed:", error.message)
    return []
  }

  return (data ?? []) as SalesEnrichmentJob[]
}

async function markJobFailure(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  message: string,
): Promise<void> {
  const nextAttempts = job.attempts + 1
  const terminal = nextAttempts >= job.max_attempts
  const delayMs = Math.min(30 * 60_000, 2 ** nextAttempts * 60_000)
  const { error } = await sb
    .from("sales_enrichment_jobs")
    .update({
      status: terminal ? "failed" : "queued",
      attempts: nextAttempts,
      error_message: message,
      locked_at: null,
      lock_owner: null,
      next_run_at: new Date(Date.now() + delayMs).toISOString(),
      completed_at: terminal ? new Date().toISOString() : null,
    })
    .eq("id", job.id)

  if (error) console.error("[sales-enrichment] mark failure failed:", error.message)
}

async function claimJob(sb: ServiceSupabase, job: SalesEnrichmentJob, runnerId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("sales_enrichment_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      lock_owner: runnerId,
      error_message: null,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[sales-enrichment] claim failed:", error.message)
    return false
  }
  return !!data
}

function reportUrlFor(company: SalesCompany): string {
  if (company.report_url) return company.report_url
  if (company.slug) return buildReportUrl(normalizeReportLocale(company.report_locale, company.region), company.slug)
  return ""
}

async function completeJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
  resultPayload: JsonRecord,
): Promise<void> {
  const { error } = await sb
    .from("sales_enrichment_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      locked_at: null,
      lock_owner: null,
      result_payload: resultPayload,
    })
    .eq("id", job.id)
  if (error) console.error("[sales-enrichment] complete job failed:", error.message)

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "report_ready",
    status: "success",
    title: "企業カルテと診断レポートを生成しました",
    message: reportUrlFor(company),
    payload: resultPayload,
  })
}

async function processJob(sb: ServiceSupabase, job: SalesEnrichmentJob): Promise<{ ok: boolean; error?: string }> {
  const company = await findCompanyById(job.company_id)
  if (!company) return { ok: false, error: "company not found" }

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "karte_started",
    status: "info",
    title: "企業カルテ生成を開始しました",
    message: company.domain,
  })

  const enrich = await enrichFromContact({
    email: `info@${company.domain}`,
    company: company.company_name,
    message: `Enrichment job ${job.id}`,
    source: job.source ?? "sales_enrichment_job",
  })
  if (!enrich.ok && !enrich.skipped) {
    return { ok: false, error: enrich.error ?? "enrichment failed" }
  }

  const refreshed = (enrich.company ?? (await findCompanyById(company.id))) as SalesCompany | null
  if (!refreshed) return { ok: false, error: "company disappeared after enrichment" }

  const [dify, japanMarketAudit] = await Promise.all([
    runDifyDiagnosis(refreshed),
    auditJapanMarketReadiness(refreshed.domain),
  ])
  const mergedMeta: JsonRecord = {
    ...(refreshed.meta ?? {}),
    japan_market_audit: japanMarketAudit,
    pain_diagnosis: {
      ...dify.summary,
      generated_at: new Date().toISOString(),
      engine: dify.configured ? "dify" : "local_fallback",
      ok: dify.ok,
    },
    dify_diagnosis: dify.raw ?? null,
    enrichment: {
      job_id: job.id,
      completed_at: new Date().toISOString(),
      report_url: reportUrlFor(refreshed),
    },
  }
  const save = await upsertCompanyByDomain({
    domain: refreshed.domain,
    company_name: refreshed.company_name,
    region: refreshed.region,
    report_locale: refreshed.report_locale,
    target_country: refreshed.target_country,
    template_variant: refreshed.template_variant,
    industry: refreshed.industry,
    prefecture: refreshed.prefecture,
    pagespeed_mobile: refreshed.pagespeed_mobile,
    pagespeed_desktop: refreshed.pagespeed_desktop,
    detected_issues: refreshed.detected_issues,
    pipeline_status: "report_ready",
    source: refreshed.source,
    meta: mergedMeta,
  })

  if (!save.ok || !save.company) return { ok: false, error: save.error ?? "company save failed" }

  const report = await fetchDiagnosticReport({
    companyId: save.company.id,
    region: save.company.region,
    reportLocale: save.company.report_locale ?? undefined,
    targetCountry: save.company.target_country ?? undefined,
    templateVariant: save.company.template_variant ?? undefined,
  })
  const demo = report ? await generateReplacementDemo(save.company, report) : { ok: false, demoUrl: null }
  const finalMeta = demo.ok && demo.demoUrl
    ? {
        ...(save.company.meta ?? {}),
        demo_site: {
          url: demo.demoUrl,
          type: "astro_replacement_demo",
          generated_at: new Date().toISOString(),
        },
      }
    : (save.company.meta ?? {})
  const finalCompany = { ...save.company, meta: finalMeta }
  if (demo.ok && demo.demoUrl) {
    const { error } = await sb.from("sales_companies").update({ meta: finalMeta }).eq("id", save.company.id)
    if (error) console.error("[sales-enrichment] demo meta update failed:", error.message)
  }
  await saveSourceCoverageRows(finalCompany)
  const techSave = await saveTechStackDetections(finalCompany)
  if (!techSave.ok && techSave.error) {
    console.error("[sales-enrichment] tech stack save failed:", techSave.error)
  }
  const coverage = computeSourceCoverage(finalCompany)
  const twentySync = await syncCompanyKarteToTwenty(finalCompany.id)
  if (!twentySync.ok && twentySync.configured) {
    console.error("[sales-enrichment] Twenty karte sync failed:", twentySync.error)
  }

  await completeJob(sb, job, save.company, {
    report_url: reportUrlFor(save.company),
    demo_url: demo.demoUrl,
    source_coverage_score: coverage.score,
    twenty_sync: twentySync.ok ? "synced" : twentySync.configured ? "failed" : "not_configured",
    dify_configured: dify.configured,
    dify_ok: dify.ok,
    pain_summary: dify.summary.primaryPain,
  })

  return { ok: true }
}

export async function runEnrichmentJobs(limit = 3): Promise<EnrichmentRunResult> {
  const sb = getSb()
  if (!sb) {
    return { ok: false, processed: 0, completed: 0, failed: 0, errors: ["Supabase service_role not configured"] }
  }

  const safeLimit = Math.max(1, Math.min(limit, 10))
  const runnerId = `next-${process.pid}-${Date.now()}`
  const jobs = await fetchQueuedJobs(sb, safeLimit)
  const errors: string[] = []
  let completed = 0
  let failed = 0

  for (const job of jobs) {
    const claimed = await claimJob(sb, job, runnerId)
    if (!claimed) continue

    const result = await processJob(sb, job)
    if (result.ok) {
      completed++
    } else {
      failed++
      const message = result.error ?? "unknown enrichment error"
      errors.push(`${job.id}: ${message}`)
      await markJobFailure(sb, job, message)
      await logDiagnosisEvent(sb, {
        companyId: job.company_id,
        jobId: job.id,
        eventType: "karte_failed",
        status: "error",
        title: "企業カルテ生成に失敗しました",
        message,
      })
    }
  }

  return { ok: failed === 0, processed: completed + failed, completed, failed, errors }
}

export async function fetchRecentEnrichmentJobs(limit = 30): Promise<DashboardEnrichmentJob[]> {
  const sb = getSb()
  if (!sb) return []

  const { data, error } = await sb
    .from("sales_enrichment_jobs")
    .select("id, company_id, job_type, status, priority, attempts, max_attempts, source, triggered_by, error_message, created_at, updated_at, sales_companies(company_name, domain)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[sales-enrichment] fetch recent jobs failed:", error.message)
    return []
  }

  return ((data ?? []) as RecentJobRow[]).map((item) => {
    const company = Array.isArray(item.sales_companies) ? item.sales_companies[0] : item.sales_companies
    return {
      id: item.id,
      companyId: item.company_id,
      companyName: company?.company_name ?? null,
      domain: company?.domain ?? null,
      jobType: item.job_type,
      status: item.status,
      priority: item.priority ?? 50,
      attempts: item.attempts ?? 0,
      maxAttempts: item.max_attempts ?? 3,
      source: item.source,
      triggeredBy: item.triggered_by,
      errorMessage: item.error_message,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }
  })
}

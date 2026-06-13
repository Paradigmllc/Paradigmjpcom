import { getServiceSalesSupabase } from "@/lib/supabase"
import { enrichFromContact } from "./enrich"
import { findCompanyById, upsertCompanyByDomain } from "./companies"
import { runDifyDiagnosis } from "./dify-diagnosis"
import { fetchDiagnosticReport } from "./diagnostic"
import { generateReplacementDemo } from "./demo-generator"
import { generateDiagnosticVideo } from "./video-generator"
import { computeSourceCoverage, saveSourceCoverageRows } from "./source-coverage"
import { saveTechStackDetections } from "./source-acquisition"
import { syncCompanyKarteToTwenty } from "./twenty-sync"
import { buildReportUrl, normalizeReportLocale } from "./routing"
import { auditJapanMarketReadiness } from "./sources/japan-market-audit"
import type { SalesCompany } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { SalesEnrichmentJob, EnrichmentRunResult, JsonRecord, ServiceSupabase } from "./enrichment-jobs"

export type { EnrichmentRunResult }

function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
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
  const { error } = await sb.from(DB_TABLES.SALES_DIAGNOSIS_EVENTS).insert({
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
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
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
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: terminal ? "failed" : "queued",
      attempts: nextAttempts,
      error_message: message,
      next_run_at: new Date(Date.now() + delayMs).toISOString(),
    })
    .eq("id", job.id)

  if (error) console.error("[sales-enrichment] mark failure failed:", error.message)
}

async function claimJob(sb: ServiceSupabase, job: SalesEnrichmentJob, runnerId: string): Promise<boolean> {
  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "running",
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
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "completed",
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

  // Auto-resume local manual pipeline run if it was waiting for this job
  const pipelineRunId = typeof job.input_payload?.pipeline_run_id === "string" ? job.input_payload.pipeline_run_id : null
  if (pipelineRunId) {
    try {
      const { runSalesPipelineLocally } = await import("./sales-pipeline-execution")
      void runSalesPipelineLocally(pipelineRunId).catch((err: unknown) => {
        console.error("[sales-enrichment] auto-resume pipeline failed:", err)
      })
    } catch (importErr) {
      console.error("[sales-enrichment] failed to import runSalesPipelineLocally for auto-resume:", importErr)
    }
  }
}

export async function processJob(sb: ServiceSupabase, job: SalesEnrichmentJob): Promise<{ ok: boolean; error?: string }> {
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

  // Difyの結果が重要であるため、エラー時はフォールバックを採用せずに明示的にジョブを失敗させる
  if (!dify.ok && dify.configured) {
    return { ok: false, error: dify.error ?? "Dify diagnosis failed" }
  }

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

  const isWebProduction = save.company.template_variant === "website_diagnostic"
  const report = await fetchDiagnosticReport({
    companyId: save.company.id,
    region: save.company.region,
    reportLocale: save.company.report_locale ?? undefined,
    targetCountry: save.company.target_country ?? undefined,
    templateVariant: save.company.template_variant ?? undefined,
  })
  const demo = (report && isWebProduction) ? await generateReplacementDemo(save.company, report) : { ok: false, demoUrl: null }
  const videoPromise = (report && isWebProduction) ? generateDiagnosticVideo(save.company.id, save.company.report_locale).catch(() => null) : Promise.resolve(null)
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
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update({ meta: finalMeta }).eq("id", save.company.id)
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
    dify_error: dify.ok ? null : (dify.error ?? "Dify diagnosis failed silently"),
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

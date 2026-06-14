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

// ── Phase 1: Enrichment (basic data collection + upsert) ──
// Saves company row early so partial results are persisted even if later phases fail.
async function processEnrichmentPhase(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
): Promise<{ ok: boolean; error?: string; company?: SalesCompany }> {
  const enrich = await enrichFromContact({
    email: `info@${company.domain}`,
    company: company.company_name,
    message: `Enrichment job ${job.id}`,
    source: job.source ?? "sales_enrichment_job",
  })
  if (!enrich.ok && !enrich.skipped) {
    return { ok: false, error: enrich.error ?? "enrichment failed", company: enrich.company ?? company }
  }

  const refreshed = (enrich.company ?? company) as SalesCompany
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
    pipeline_status: "scanning",
    source: refreshed.source,
    meta: {
      ...(refreshed.meta ?? {}),
      enrichment: { job_id: job.id, phase1_completed_at: new Date().toISOString() },
    },
    tech_stack: refreshed.meta?.tech as Record<string, unknown> | null,
  })

  if (!save.ok || !save.company) return { ok: false, error: save.error ?? "company save failed" }
  return { ok: true, company: save.company }
}

// ── Phase 2: Diagnosis (Dify Cloud AI + Japan market audit) ──
async function processDiagnosisPhase(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
): Promise<{ ok: boolean; error?: string; difyConfigured: boolean; difyOk: boolean; difyError?: string; painSummary?: string }> {
  const [dify, japanMarketAudit] = await Promise.all([
    runDifyDiagnosis(company),
    auditJapanMarketReadiness(company.domain),
  ])

  const painDiagnosis = {
    ...dify.summary,
    generated_at: new Date().toISOString(),
    engine: dify.configured ? "dify" : "local_fallback",
    ok: dify.ok,
  }

  await upsertCompanyByDomain({
    domain: company.domain,
    company_name: company.company_name,
    region: company.region,
    pipeline_status: dify.ok ? "report_ready" : "scanning",
    meta: {
      ...(company.meta ?? {}),
      enrichment: {
        ...(company.meta?.enrichment as JsonRecord ?? {}),
        phase2_completed_at: new Date().toISOString(),
      },
    },
    pain_diagnosis: painDiagnosis as Record<string, unknown> | null,
    dify_result: dify.raw as Record<string, unknown> | null,
    japan_market_audit: japanMarketAudit as unknown as Record<string, unknown> | null,
  })

  if (!dify.ok && dify.configured) {
    return { ok: false, error: dify.error ?? "Dify diagnosis failed", difyConfigured: dify.configured, difyOk: false, difyError: dify.error ?? undefined, painSummary: dify.summary.primaryPain }
  }

  return { ok: true, difyConfigured: dify.configured, difyOk: dify.ok, difyError: dify.ok ? undefined : (dify.error ?? undefined), painSummary: dify.summary.primaryPain }
}

// ── Phase 3: Report generation + source coverage ──
async function processReportPhase(
  sb: ServiceSupabase,
  _job: SalesEnrichmentJob,
  company: SalesCompany,
): Promise<{ ok: boolean; error?: string; reportData?: Awaited<ReturnType<typeof fetchDiagnosticReport>>; coverageScore: number }> {
  const report = await fetchDiagnosticReport({
    companyId: company.id,
    region: company.region,
    reportLocale: company.report_locale ?? undefined,
    targetCountry: company.target_country ?? undefined,
    templateVariant: company.template_variant ?? undefined,
  })

  await saveSourceCoverageRows(company)
  const coverage = computeSourceCoverage(company)

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: _job.id,
    eventType: "report_generated",
    status: report ? "success" : "warning",
    title: report ? "診断レポート生成完了" : "診断レポート生成スキップ（データ不足）",
    message: report ? reportUrlFor(company) : undefined,
    payload: { coverage_score: coverage.score, has_report: !!report },
  })

  return { ok: true, reportData: report ?? undefined, coverageScore: coverage.score }
}

// ── Phase 4: Asset generation (demo + video + tech stack) ──
// Demo and video are conditional and run in parallel when applicable.
// Cost guards: skip if source coverage is too low or asset was recently generated.
async function processAssetPhase(
  sb: ServiceSupabase,
  _job: SalesEnrichmentJob,
  company: SalesCompany,
  reportData: Awaited<ReturnType<typeof fetchDiagnosticReport>> | undefined,
): Promise<{ ok: boolean; demoUrl: string | null; errors: string[] }> {
  const errors: string[] = []
  const isWebProduction = company.template_variant === "website_diagnostic"

  // Cost guard: check if assets were recently generated (within 30 days)
  const { data: recentAssets } = await sb
    .from(DB_TABLES.SALES_ARTIFACT_MANIFEST)
    .select("artifact_type, created_at")
    .eq("company_id", company.id)
    .in("artifact_type", ["demo_site", "sales_video"])
    .order("created_at", { ascending: false })
    .limit(5)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const hasRecentAsset = (type: string) =>
    (recentAssets ?? []).some(
      (a: { artifact_type: string; created_at: string }) =>
        a.artifact_type === type && new Date(a.created_at) > thirtyDaysAgo,
    )

  // Check source coverage score for cost gating
  const coverage = computeSourceCoverage(company)
  const costGuardVideoEnabled = process.env.COST_GUARD_VIDEO_ENABLED !== "false"
  const costGuardDemoEnabled = process.env.COST_GUARD_DEMO_ENABLED !== "false"

  const shouldGenerateDemo =
    reportData &&
    isWebProduction &&
    costGuardDemoEnabled &&
    coverage.score >= 30 &&
    !hasRecentAsset("demo_site")

  const shouldGenerateVideo =
    reportData &&
    isWebProduction &&
    costGuardVideoEnabled &&
    coverage.score >= 40 &&
    !hasRecentAsset("sales_video")

  if (reportData && isWebProduction && !shouldGenerateDemo && costGuardDemoEnabled) {
    const reason = hasRecentAsset("demo_site") ? "recently_generated" : `coverage_score_${coverage.score}_below_30`
    console.log(`[sales-enrichment] demo skipped for ${company.domain}: ${reason}`)
    await logDiagnosisEvent(sb, {
      companyId: company.id, jobId: _job.id,
      eventType: "cost_guard_skip", status: "info",
      title: "デモ生成スキップ", message: reason,
      payload: { coverage_score: coverage.score, reason },
    })
  }

  if (reportData && isWebProduction && !shouldGenerateVideo && costGuardVideoEnabled) {
    const reason = hasRecentAsset("sales_video") ? "recently_generated" : `coverage_score_${coverage.score}_below_40`
    console.log(`[sales-enrichment] video skipped for ${company.domain}: ${reason}`)
    await logDiagnosisEvent(sb, {
      companyId: company.id, jobId: _job.id,
      eventType: "cost_guard_skip", status: "info",
      title: "動画生成スキップ", message: reason,
      payload: { coverage_score: coverage.score, reason },
    })
  }

  const [demo, videoResult] = await Promise.all([
    shouldGenerateDemo
      ? generateReplacementDemo(company, reportData).catch((e: unknown) => {
          errors.push(`demo generation: ${e instanceof Error ? e.message : String(e)}`)
          return { ok: false, demoUrl: null }
        })
      : Promise.resolve({ ok: false, demoUrl: null as string | null }),

    shouldGenerateVideo
      ? generateDiagnosticVideo(company.id, company.report_locale).catch((e: unknown) => {
          errors.push(`video generation: ${e instanceof Error ? e.message : String(e)}`)
          return null
        })
      : Promise.resolve(null),
  ])

  if (demo.ok && demo.demoUrl) {
    const updatedDemo = { url: demo.demoUrl, type: "astro_replacement_demo", generated_at: new Date().toISOString() }
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      demo_site: updatedDemo,
      meta: { ...(company.meta ?? {}), demo_site: updatedDemo },
    }).eq("id", company.id)
    if (error) errors.push(`demo meta update: ${error.message}`)
    company = { ...company, meta: { ...(company.meta ?? {}), demo_site: updatedDemo }, demo_site: updatedDemo }
  }

  const techSave = await saveTechStackDetections(company)
  if (!techSave.ok && techSave.error) errors.push(`tech stack save: ${techSave.error}`)

  if (errors.length > 0) {
    for (const err of errors) console.error(`[sales-enrichment] asset phase error:`, err)
  }

  return { ok: true, demoUrl: demo.demoUrl, errors }
}

// ── Phase 5: Sync + Completion (Twenty CRM writeback + finalize job) ──
async function processSyncPhase(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
  phaseResults: {
    difyConfigured: boolean
    difyOk: boolean
    difyError?: string
    painSummary?: string
    demoUrl: string | null
    coverageScore: number
  },
): Promise<{ ok: boolean; error?: string }> {
  const twentySync = await syncCompanyKarteToTwenty(company.id)
  if (!twentySync.ok && twentySync.configured) {
    console.error("[sales-enrichment] Twenty karte sync failed:", twentySync.error)
  }

  await completeJob(sb, job, company, {
    report_url: reportUrlFor(company),
    demo_url: phaseResults.demoUrl,
    source_coverage_score: phaseResults.coverageScore,
    twenty_sync: twentySync.ok ? "synced" : twentySync.configured ? "failed" : "not_configured",
    dify_configured: phaseResults.difyConfigured,
    dify_ok: phaseResults.difyOk,
    dify_error: phaseResults.difyError ?? null,
    pain_summary: phaseResults.painSummary ?? null,
  })

  return { ok: true }
}

// ── Orchestrator: runs all 5 phases sequentially, preserves partial results ──
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

  let currentCompany = company

  // Phase 1: Enrichment (save eagerly)
  const phase1 = await processEnrichmentPhase(sb, job, currentCompany)
  if (!phase1.ok) {
    return { ok: false, error: phase1.error }
  }
  currentCompany = phase1.company!

  // Phase 2: Diagnosis (Dify + Japan audit)
  const phase2 = await processDiagnosisPhase(sb, job, currentCompany)
  currentCompany = (await findCompanyById(job.company_id)) as SalesCompany
  if (!currentCompany) return { ok: false, error: "company lost after diagnosis" }

  if (!phase2.ok) {
    return { ok: false, error: phase2.error }
  }

  // Phase 3: Report generation
  const phase3 = await processReportPhase(sb, job, currentCompany)
  if (!phase3.ok) {
    console.error("[sales-enrichment] Report phase failed but enrichment+diagnosis data is saved:", phase3.error)
    // Don't fail the whole job — enrichment and diagnosis are already committed
  }

  // Phase 4: Asset generation (conditional, errors are non-fatal)
  const phase4 = await processAssetPhase(sb, job, currentCompany, phase3.reportData)

  // Phase 5: Sync + Complete
  const phase5 = await processSyncPhase(sb, job, currentCompany, {
    difyConfigured: phase2.difyConfigured,
    difyOk: phase2.difyOk,
    difyError: phase2.difyError,
    painSummary: phase2.painSummary,
    demoUrl: phase4.demoUrl,
    coverageScore: phase3.coverageScore,
  })

  return { ok: phase5.ok, error: phase5.error }
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

  // Claim all jobs first (serial — DB lock requires it), then process in parallel
  const claimedJobs: SalesEnrichmentJob[] = []
  for (const job of jobs) {
    const claimed = await claimJob(sb, job, runnerId)
    if (claimed) claimedJobs.push(job)
  }

  // Process claimed jobs in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    claimedJobs.map(async (job) => {
      const result = await processJob(sb, job)
      return { job, result }
    }),
  )

  for (const settled of results) {
    if (settled.status === "rejected") {
      failed++
      const message = settled.reason instanceof Error ? settled.reason.message : String(settled.reason)
      errors.push(`promise rejection: ${message}`)
    } else {
      const { job, result } = settled.value
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
  }

  return { ok: failed === 0, processed: completed + failed, completed, failed, errors }
}

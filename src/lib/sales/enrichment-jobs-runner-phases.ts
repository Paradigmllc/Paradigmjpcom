import { enrichFromContact } from "./enrich"
import { upsertCompanyByDomain } from "./companies"
import { runDifyDiagnosis } from "./dify-diagnosis"
import { runAssetExtraction } from "./extract-assets"
import { generateDemoDesign, buildDesignInput } from "./demo-design-generator"
import { buildAndDeployDemo } from "./demo-build-deploy"
import { fetchDiagnosticReport, markReportGenerated } from "./diagnostic"
import { autoPersonalize } from "./personalize"
import { generateReplacementDemo } from "./demo-generator"
import { generateDiagnosticVideo } from "./video-generator"
import { computeSourceCoverage, saveSourceCoverageRows } from "./source-coverage"
import { saveTechStackDetections } from "./source-acquisition"
import { syncCompanyKarteToTwenty } from "./twenty-sync"
import { buildReportUrl, normalizeReportLocale } from "./routing"
import { auditJapanMarketReadiness } from "./sources/japan-market-audit"
import { resolveDifyWorkflowKey, normalizeDifyCloudBaseUrl } from "./dify-cloud"
import type { SalesCompany } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { SalesEnrichmentJob, JsonRecord, ServiceSupabase } from "./enrichment-jobs"

export async function logDiagnosisEvent(
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

export function reportUrlFor(company: SalesCompany): string {
  if (company.report_url) return company.report_url
  if (company.slug) return buildReportUrl(normalizeReportLocale(company.report_locale, company.region), company.slug)
  return ""
}

// ── Phase 1: Enrichment (basic data collection + upsert) ──
// Saves company row early so partial results are persisted even if later phases fail.
export async function processEnrichmentPhase(
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

  // Extract real website assets (images, colors, subpage content) for demo personalization.
  // Non-blocking: if extraction fails, enrichment continues with partial data.
  let websiteAssets: Record<string, unknown> | null = null
  try {
    const assets = await runAssetExtraction(refreshed)
    if (assets.ok && assets.assets) {
      websiteAssets = assets.assets as unknown as Record<string, unknown>
    } else {
      console.warn(`[sales-enrichment] website asset extraction skipped: ${assets.error ?? assets.skipped ?? "unknown"}`)
    }
  } catch (e) {
    console.error("[sales-enrichment] website asset extraction failed (non-fatal):", e)
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
    pipeline_status: "scanning",
    source: refreshed.source,
    meta: {
      ...(refreshed.meta ?? {}),
      enrichment: { job_id: job.id, phase1_completed_at: new Date().toISOString() },
      ...(websiteAssets ? { website_assets: websiteAssets } : {}),
    },
    tech_stack: refreshed.meta?.tech as Record<string, unknown> | null,
  })

  if (!save.ok || !save.company) return { ok: false, error: save.error ?? "company save failed" }
  return { ok: true, company: save.company }
}

// ── Phase 2: Diagnosis (Dify Cloud AI + Japan market audit) ──
export async function processDiagnosisPhase(
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
    pipeline_status: "report_ready",
    meta: {
      ...(company.meta ?? {}),
      enrichment: {
        ...(company.meta?.enrichment as JsonRecord ?? {}),
        phase2_completed_at: new Date().toISOString(),
      },
      pain_diagnosis: painDiagnosis,
      dify_diagnosis: dify.raw ?? dify.summary,
      japan_market_audit: japanMarketAudit,
    },
    pain_diagnosis: painDiagnosis as Record<string, unknown> | null,
    dify_result: dify.raw as Record<string, unknown> | null,
    japan_market_audit: japanMarketAudit as unknown as Record<string, unknown> | null,
  })

  // Phase 1 retry-isolation (root-cause fix for "0 reports"): a Dify failure (e.g. HTTP 400)
  // must NOT fail the whole enrichment job or block report generation. The local/DeepSeek
  // fallback summary is already persisted above, so record the Dify error and continue — the
  // diagnostic report and DeepSeek personalization (autoPersonalize) still get produced.
  if (!dify.ok && dify.configured) {
    console.warn(`[sales-enrichment] Dify diagnosis degraded (${dify.error ?? "unknown"}); continuing with fallback summary so the report still generates`)
  }

  return { ok: true, difyConfigured: dify.configured, difyOk: dify.ok, difyError: dify.ok ? undefined : (dify.error ?? undefined), painSummary: dify.summary.primaryPain }
}

// ── Phase 3: Report generation + source coverage ──
export async function processReportPhase(
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

  if (report) {
    await markReportGenerated(company.id)
    // Phase 6-1 / 1-4: generate company-specific report copy into meta.personalized_copy
    // so diagnostic.ts renders a tailored narrative instead of the generic template.
    // personalizeReport uses DeepSeek today; Dify karte→report becomes primary once
    // DIFY_KARTE_TO_REPORT_API_KEY is configured (decision: Dify 正本 / DeepSeek fallback).
    try {
      const personalize = await autoPersonalize(company.id)
      await logDiagnosisEvent(sb, {
        companyId: company.id,
        jobId: _job.id,
        eventType: "report_personalized",
        status: personalize.ok ? "success" : "warning",
        title: personalize.ok ? "診断レポート文面をパーソナライズしました" : "文面パーソナライズをスキップ",
        message: personalize.ok ? undefined : (personalize.skipped ?? personalize.error),
      })
    } catch (e) {
      console.error("[sales-enrichment] autoPersonalize failed (non-fatal):", e)
    }
  }

  const refreshed = await sb.from(DB_TABLES.SALES_COMPANIES).select("*").eq("id", company.id).maybeSingle()
  if (refreshed.error) console.error("[sales-enrichment] refresh after report failed:", refreshed.error.message)
  const coverageCompany = (refreshed.data as SalesCompany | null) ?? company

  await saveSourceCoverageRows(coverageCompany)
  const coverage = computeSourceCoverage(coverageCompany)

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
export async function processAssetPhase(
  sb: ServiceSupabase,
  _job: SalesEnrichmentJob,
  company: SalesCompany,
  reportData: Awaited<ReturnType<typeof fetchDiagnosticReport>> | undefined,
): Promise<{ ok: boolean; demoUrl: string | null; errors: string[] }> {
  const errors: string[] = []
  const isWebProduction = company.template_variant === "website_diagnostic"

  // Cost guard: check if assets were recently generated (within 14 days, overridable)
  const { data: recentAssets } = await sb
    .from(DB_TABLES.SALES_ARTIFACT_MANIFEST)
    .select("artifact_type, created_at")
    .eq("company_id", company.id)
    .in("artifact_type", ["demo_site", "sales_video"])
    .order("created_at", { ascending: false })
    .limit(5)

  const recencyDays = (() => { const v = parseInt(process.env.COST_GUARD_RECENCY_DAYS || "14", 10); return Number.isFinite(v) && v > 0 ? v : 14 })()
  const recencyAgo = new Date(Date.now() - recencyDays * 24 * 60 * 60 * 1000)
  const hasRecentAsset = (type: string) =>
    (recentAssets ?? []).some(
      (a: { artifact_type: string; created_at: string }) =>
        a.artifact_type === type && new Date(a.created_at) > recencyAgo,
    )

  // Check source coverage score for cost gating
  const coverage = computeSourceCoverage(company)
  const costGuardVideoEnabled = process.env.COST_GUARD_VIDEO_ENABLED !== "false"
  const costGuardDemoEnabled = process.env.COST_GUARD_DEMO_ENABLED !== "false"
  const demoMinScore = (() => { const v = parseInt(process.env.COST_GUARD_DEMO_MIN_SCORE || "15", 10); return Number.isFinite(v) ? v : 15 })()
  const videoMinScore = (() => { const v = parseInt(process.env.COST_GUARD_VIDEO_MIN_SCORE || "20", 10); return Number.isFinite(v) ? v : 20 })()

  const shouldGenerateDemo =
    reportData &&
    isWebProduction &&
    costGuardDemoEnabled &&
    coverage.score >= demoMinScore &&
    !hasRecentAsset("demo_site")

  const shouldGenerateVideo =
    reportData &&
    isWebProduction &&
    costGuardVideoEnabled &&
    coverage.score >= videoMinScore &&
    !hasRecentAsset("sales_video")

  if (reportData && isWebProduction && !shouldGenerateDemo && costGuardDemoEnabled) {
    const reason = hasRecentAsset("demo_site") ? "recently_generated" : `coverage_score_${coverage.score}_below_${demoMinScore}`
    console.info(`[sales-enrichment] demo skipped for ${company.domain}: ${reason}`)
    await logDiagnosisEvent(sb, {
      companyId: company.id, jobId: _job.id,
      eventType: "cost_guard_skip", status: "info",
      title: "デモ生成スキップ", message: reason,
      payload: { coverage_score: coverage.score, reason },
    })
  }

  if (reportData && isWebProduction && !shouldGenerateVideo && costGuardVideoEnabled) {
    const reason = hasRecentAsset("sales_video") ? "recently_generated" : `coverage_score_${coverage.score}_below_40`
    console.info(`[sales-enrichment] video skipped for ${company.domain}: ${reason}`)
    await logDiagnosisEvent(sb, {
      companyId: company.id, jobId: _job.id,
      eventType: "cost_guard_skip", status: "info",
      title: "動画生成スキップ", message: reason,
      payload: { coverage_score: coverage.score, reason },
    })
  }

  // Generate hyper-personalized design spec (DeepSeek) when demo conditions are met
  const shouldGenerateDesign = shouldGenerateDemo && !!process.env.DEEPSEEK_API_KEY
  const designSpecPromise = shouldGenerateDesign
    ? (async () => {
        try {
          const websiteAssets = company.meta?.website_assets as Record<string, unknown> | undefined
          const input = buildDesignInput({
            company_name: company.company_name,
            domain: company.domain,
            industry: company.industry ?? null,
            location: company.prefecture ?? null,
            locale: company.report_locale ?? "ja",
            website_assets: websiteAssets ?? null,
            diagnosis: {
              pain_summary: company.pain_diagnosis ?? company.dify_result ?? {},
              detected_issues: company.detected_issues,
              pagespeed_mobile: company.pagespeed_mobile,
              pagespeed_desktop: company.pagespeed_desktop,
              tech_stack: company.tech_stack,
              improvement_actions: reportData?.acts ?? [],
            } as Record<string, unknown>,
          })
          if (!input) return null
          const slug = `${company.domain?.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/-+/g, "-").slice(0, 50) ?? company.id}-demo`
          const result = await generateDemoDesign(input, slug)
          if (result.ok && result.spec) {
            await sb.from("theme_demo_pages").upsert({
              slug,
              theme: "hyper-personalized",
              title: result.spec.pages.home?.title ?? `${company.company_name} Demo`,
              blocks: result.spec,
              meta: {
                ...(company.meta as Record<string, unknown> ?? {}),
                design_spec: result.spec,
                design_philosophy: result.spec.design_philosophy,
                generated_at: new Date().toISOString(),
              },
              is_published: true,
              company_id: company.id,
            }, { onConflict: "slug" })
            return result.spec
          }
          return null
        } catch (e) {
          console.error("[sales-enrichment] design spec generation failed:", e)
          return null
        }
      })()
    : Promise.resolve(null)

  // Hyper-personalized code-generation demo (DeepSeek V4 → complete Astro → R2 deploy)
  const codeGenDemoPromise = shouldGenerateDemo
    ? buildAndDeployDemo(company).catch((e: unknown) => {
        console.error(`[enrichment-phases] code-gen demo build/deploy:`, e instanceof Error ? e.message : String(e))
        errors.push(`code-gen demo: ${e instanceof Error ? e.message : String(e)}`)
        return { ok: false, url: null }
      })
    : Promise.resolve({ ok: false, url: null as string | null, slug: null as string | null })

  const [demo, videoResult] = await Promise.all([
    shouldGenerateDemo
      ? generateReplacementDemo(company, reportData).catch((e: unknown) => {
          console.error(`[enrichment-phases] replacement demo generation:`, e instanceof Error ? e.message : String(e))
          errors.push(`demo generation: ${e instanceof Error ? e.message : String(e)}`)
          return { ok: false, demoUrl: null }
        })
      : Promise.resolve({ ok: false, demoUrl: null as string | null }),

    shouldGenerateVideo
      ? generateDiagnosticVideo(company.id, company.report_locale).catch((e: unknown) => {
          console.error(`[enrichment-phases] diagnostic video generation:`, e instanceof Error ? e.message : String(e))
          errors.push(`video generation: ${e instanceof Error ? e.message : String(e)}`)
          return null
        })
      : Promise.resolve(null),

    designSpecPromise,

    codeGenDemoPromise,
  ])

  let updatedCompany = company
  if (demo.ok && demo.demoUrl) {
    const updatedDemo = { url: demo.demoUrl, type: "astro_replacement_demo", generated_at: new Date().toISOString() }
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      demo_site: updatedDemo,
    }).eq("id", company.id)
    if (!error) {
      // Atomic shallow merge — avoids TOCTOU race from spreading stale company.meta.
      const { error: metaErr } = await sb.rpc("sales_atomic_meta_merge", {
        p_company_id: company.id,
        p_patch: { demo_site: updatedDemo },
      })
      if (metaErr) errors.push(`demo meta merge: ${metaErr.message}`)
    } else {
      errors.push(`demo demo_site update: ${error.message}`)
    }
    updatedCompany = { ...company, meta: { ...(company.meta ?? {}), demo_site: updatedDemo }, demo_site: updatedDemo }
  }

  const techSave = await saveTechStackDetections(updatedCompany)
  if (!techSave.ok && techSave.error) errors.push(`tech stack save: ${techSave.error}`)

  if (errors.length > 0) {
    for (const err of errors) console.error(`[sales-enrichment] asset phase error:`, err)
  }

  return { ok: true, demoUrl: demo.demoUrl, errors }
}

// ── Phase 5: Sync + Completion (Twenty CRM writeback + finalize job) ──
export async function processSyncPhase(
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
  completeJobFn: (
    sb: ServiceSupabase,
    job: SalesEnrichmentJob,
    company: SalesCompany,
    resultPayload: JsonRecord,
  ) => Promise<void>,
): Promise<{ ok: boolean; error?: string }> {
  const twentySync = await syncCompanyKarteToTwenty(company.id)
  if (!twentySync.ok && twentySync.configured) {
    console.error("[sales-enrichment] Twenty karte sync failed:", twentySync.error)
    const { error: diagError } = await sb.from(DB_TABLES.SALES_DIAGNOSIS_EVENTS).insert({
      company_id: company.id,
      event_type: "twenty_sync_failed",
      severity: "warning",
      subject: `Twenty CRM sync failed for ${company.domain}`,
      result: twentySync.error?.slice(0, 500) ?? null,
      payload: { job_id: job.id, sync_error: twentySync.error },
    })
    if (diagError) console.error("[sales-enrichment] diagnosis event insert failed:", diagError.message)
  }

  await completeJobFn(sb, job, company, {
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

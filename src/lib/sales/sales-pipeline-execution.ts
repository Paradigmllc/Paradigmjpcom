/**
 * lib/sales/sales-pipeline-execution.ts
 *
 * sales-pipeline.ts から分離 (C-2 対応)。
 * パイプラインの各ステップの実行ロジック (executeStep) とローカル実行を担う。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte } from "./company-karte"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "./enrichment-jobs"
import { startLeadCandidateEnrichmentFallback } from "./lead-candidate-enrichment-fallback"
import { syncCompanyAcrossSalesTools } from "./external-studio-sync"
import { runOutreachBatch } from "./outreach/orchestrator"
import { getR2StorageConfig, sanitizeR2ObjectName } from "./r2-storage"
import { generateSalesAsset } from "./sales-assets"
import { syncCompanyKarteToTwenty } from "./twenty-sync"
import { createVideoJob, runVideoJobAction } from "./video-pipeline"
import { ensureCompanyVisualEvidence } from "./visual-evidence"

import type {
  JsonRecord,
  SalesPipelineRun,
  SalesPipelineStep,
  SalesPipelineStepKey,
} from "./sales-pipeline-types"

import {
  asRecord,
  insertArtifact,
  updateRun,
  updateStep,
  updateStepByKey,
  fetchRunWithSteps,
  summarizeSalesPipelineStatus,
} from "./sales-pipeline-helpers"
import { DB_TABLES } from "@/lib/sales/db-tables"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export function publicUrlFor(baseUrl: string | null, objectKey: string | null): string | null {
  if (!baseUrl || !objectKey) return null
  return `${baseUrl.replace(/\/+$/, "")}/${objectKey}`
}

async function completeR2ManifestStep(sb: ServiceSupabase, run: SalesPipelineRun, step: SalesPipelineStep): Promise<JsonRecord> {
  const karteResult = await fetchCompanyKarte(sb, run.company_id)
  if (!karteResult.ok) {
    console.error("[sales-pipeline-execution] completeR2ManifestStep karte fetch failed:", karteResult.error)
    throw new Error(karteResult.error)
  }
  const karte = karteResult.karte
  const r2 = getR2StorageConfig()
  const prefix = sanitizeR2ObjectName(`sales-os/${karte.reportLocale}/${karte.domain}/${run.id}`)
  const reportKey = `${prefix}/diagnostic-report.json`
  const deckKey = `${prefix}/sales-deck.md`
  const bundleKey = `${prefix}/delivery-bundle.json`

  await insertArtifact(sb, {
    runId: run.id,
    companyId: run.company_id,
    artifactType: "company_karte",
    sourceTool: "supabase",
    storageProvider: "supabase",
    status: "generated",
    metadata: { source_score: karte.sourceScore, generated_at: karte.generatedAt },
  })
  await insertArtifact(sb, {
    runId: run.id,
    companyId: run.company_id,
    artifactType: "diagnostic_report",
    sourceTool: "nextjs_reports",
    r2Bucket: r2.bucket,
    r2Key: reportKey,
    publicUrl: karte.reportUrl ?? publicUrlFor(r2.publicBaseUrl, reportKey),
    status: karte.reportUrl ? "delivered" : "planned",
    metadata: { report_locale: karte.reportLocale, template_variant: karte.templateVariant },
  })
  await insertArtifact(sb, {
    runId: run.id,
    companyId: run.company_id,
    artifactType: "sales_deck",
    sourceTool: "sales_assets",
    r2Bucket: r2.bucket,
    r2Key: deckKey,
    publicUrl: publicUrlFor(r2.publicBaseUrl, deckKey),
    status: "planned",
    metadata: { directus_sync_expected: run.auto_sync_external_studios },
  })
  await insertArtifact(sb, {
    runId: run.id,
    companyId: run.company_id,
    artifactType: "delivery_bundle",
    sourceTool: "sales_os",
    r2Bucket: r2.bucket,
    r2Key: bundleKey,
    publicUrl: publicUrlFor(r2.publicBaseUrl, bundleKey),
    status: "planned",
    metadata: { includes_video: run.require_video, includes_external_studios: run.auto_sync_external_studios },
  })

  return { prefix, r2_bucket: r2.bucket, r2_ready: r2.ready, public_base_url: r2.publicBaseUrl }
}

async function enqueuePipelineReviewTask(
  sb: ServiceSupabase,
  run: SalesPipelineRun,
  input: { reason: string; queueType?: string; priority?: number; meta?: JsonRecord },
): Promise<void> {
  const companyRes = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("region")
    .eq("id", run.company_id)
    .maybeSingle()
  if (companyRes.error) {
    console.error("[sales-pipeline-execution] enqueuePipelineReviewTask company fetch failed:", companyRes.error.message)
    throw new Error(companyRes.error.message)
  }
  const { error } = await sb.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
    region: typeof companyRes.data?.region === "string" ? companyRes.data.region : "jp",
    company_id: run.company_id,
    queue_type: input.queueType ?? "form_send",
    title: input.reason,
    pipeline_run_id: run.id,
    priority: input.priority ?? 90,
    status: "open",
    source_tool: "trigger_dev",
    target_tool: "appsmith",
    meta: {
      reason: input.reason,
      pipeline_run_id: run.id,
      ...asRecord(input.meta),
    },
  })
  if (error) {
    console.error("[sales-pipeline-execution] enqueuePipelineReviewTask insert failed:", error.message)
    throw new Error(error.message)
  }
}

export async function executeStep(sb: ServiceSupabase, run: SalesPipelineRun, step: SalesPipelineStep): Promise<void> {
  if (step.status === "skipped" || step.status === "completed") return
  // Atomic guard: only claim the step if it hasn't been claimed by another worker
  const { data: updatedSteps, error: claimError } = await sb
    .from(DB_TABLES.SALES_PIPELINE_STEPS)
    .update({ status: "running", error_message: null })
    .eq("id", step.id)
    .not("status", "in", '("skipped","completed","running")')
    .select()
  if (claimError) {
    console.error("[sales-pipeline-execution] step claim failed:", claimError.message)
    return
  }
  if (!(updatedSteps ?? []).length) return // Another worker claimed it first
  await updateRun(sb, run.id, { current_step: step.step_key, status: "running", started_at: run.started_at ?? new Date().toISOString() })

  if (step.step_key === "twenty_csv_intake") {
    const karteResult = await fetchCompanyKarte(sb, run.company_id)
    if (!karteResult.ok) {
      console.error("[sales-pipeline-execution] twenty_csv_intake karte fetch failed:", karteResult.error)
      throw new Error(karteResult.error)
    }
    await updateStep(sb, step, {
      status: "completed",
      output_payload: { domain: karteResult.karte.domain, company_name: karteResult.karte.companyName, source: run.source },
    })
    return
  }

  if (step.step_key === "supabase_normalize") {
    const karteResult = await fetchCompanyKarte(sb, run.company_id)
    if (!karteResult.ok) {
      console.error("[sales-pipeline-execution] supabase_normalize karte fetch failed:", karteResult.error)
      throw new Error(karteResult.error)
    }
    const companyRes = await sb.from(DB_TABLES.SALES_COMPANIES).select("meta").eq("id", run.company_id).maybeSingle()
    if (companyRes.error) {
      console.error("[sales-pipeline-execution] supabase_normalize company fetch failed:", companyRes.error.message)
      throw new Error(companyRes.error.message)
    }
    const currentMeta = asRecord(companyRes.data?.meta)
    const { error: updateError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .update({
        pipeline_status: "scanning",
        meta: {
          ...currentMeta,
          sales_os: {
            ...asRecord(currentMeta.sales_os),
            latest_pipeline_run_id: run.id,
            normalized_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", run.company_id)
    if (updateError) {
      console.error("[sales-pipeline-execution] supabase_normalize update failed:", updateError.message)
      throw new Error(updateError.message)
    }
    await updateStep(sb, step, { status: "completed", output_payload: { report_locale: karteResult.karte.reportLocale } })
    return
  }

  if (step.step_key === "data_collection") {
    const companyRes = await sb.from(DB_TABLES.SALES_COMPANIES).select("domain, company_name, meta").eq("id", run.company_id).maybeSingle()
    if (companyRes.error) {
      console.error("[sales-pipeline-execution] data_collection company fetch failed:", companyRes.error.message)
      throw new Error(companyRes.error.message)
    }
    const domain: string | null = typeof companyRes.data?.domain === "string" && companyRes.data.domain.length > 0
      ? companyRes.data.domain
      : null
    const currentMeta = asRecord(companyRes.data?.meta)

    const collected: JsonRecord = {}
    const errors: string[] = []

    // crt.sh — SSL certificate log count
    if (domain) {
      try {
        const crtUrl = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`
        const crtRes = await fetch(crtUrl, { signal: AbortSignal.timeout(15_000) })
        if (crtRes.ok) {
          const crtData = (await crtRes.json()) as unknown
          const certCount = Array.isArray(crtData) ? crtData.length : 0
          collected.crt_cert_count = certCount
          collected.crt_collected_at = new Date().toISOString()
        } else {
          const crtErr = `crt.sh returned HTTP ${crtRes.status}`
          console.error("[sales-pipeline-execution] data_collection crt.sh failed:", crtErr)
          errors.push(crtErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "crt.sh fetch error"
        console.error("[sales-pipeline-execution] data_collection crt.sh error:", msg)
        errors.push(`crt.sh: ${msg}`)
      }
    } else {
      errors.push("crt.sh: skipped (no domain)")
    }

    // SSL Labs — SSL grade
    if (domain) {
      try {
        const sslUrl = `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&publish=off&startNew=off&fromCache=on&maxAge=24`
        const sslRes = await fetch(sslUrl, { signal: AbortSignal.timeout(20_000) })
        if (sslRes.ok) {
          const sslData = (await sslRes.json()) as Record<string, unknown>
          const sslEndpoints: Array<Record<string, unknown>> = Array.isArray(sslData.endpoints) ? sslData.endpoints as Array<Record<string, unknown>> : []
          const grades = sslEndpoints
            .map((ep) => (typeof ep.grade === "string" ? ep.grade : null))
            .filter((g): g is string => g !== null)
          const overallGrade = sslEndpoints.length > 0 && typeof sslEndpoints[0].grade === "string"
            ? sslEndpoints[0].grade
            : null
          collected.ssl_grade = overallGrade
          collected.ssl_all_grades = grades
          collected.ssl_status = sslData.status ?? null
          collected.ssl_collected_at = new Date().toISOString()
        } else {
          const sslErr = `SSL Labs returned HTTP ${sslRes.status}`
          console.error("[sales-pipeline-execution] data_collection SSL Labs failed:", sslErr)
          errors.push(sslErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "SSL Labs fetch error"
        console.error("[sales-pipeline-execution] data_collection SSL Labs error:", msg)
        errors.push(`SSL Labs: ${msg}`)
      }
    } else {
      errors.push("SSL Labs: skipped (no domain)")
    }

    // Mozilla Observatory — security score
    if (domain) {
      try {
        const obsUrl = `https://http-observatory.security.mozilla.org/api/v1/analyze?host=${encodeURIComponent(domain)}`
        const obsRes = await fetch(obsUrl, { signal: AbortSignal.timeout(20_000) })
        if (obsRes.ok) {
          const obsData = (await obsRes.json()) as Record<string, unknown>
          collected.observatory_grade = obsData.grade ?? null
          collected.observatory_score = obsData.score ?? null
          collected.observatory_tests_passed = obsData.tests_passed ?? null
          collected.observatory_tests_failed = obsData.tests_failed ?? null
          collected.observatory_collected_at = new Date().toISOString()
        } else if (obsRes.status === 404) {
          // Observatory returns 404 if the domain hasn't been scanned yet
          console.warn("[sales-pipeline-execution] data_collection Observatory 404 (not scanned):", domain)
          errors.push("Mozilla Observatory: not yet scanned (submit first)")
        } else {
          const obsErr = `Mozilla Observatory returned HTTP ${obsRes.status}`
          console.error("[sales-pipeline-execution] data_collection Observatory failed:", obsErr)
          errors.push(obsErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Mozilla Observatory fetch error"
        console.error("[sales-pipeline-execution] data_collection Observatory error:", msg)
        errors.push(`Mozilla Observatory: ${msg}`)
      }
    } else {
      errors.push("Mozilla Observatory: skipped (no domain)")
    }

    // OverPass API — OpenStreetMap POI data (coordinates, nearby places)
    if (domain) {
      try {
        // Use OverPass to find potential locations by domain name search in OSM
        const overpassQuery = `[out:json];(node["name"~"${domain.replace(/[^a-zA-Z0-9]/g, " ")}",i];way["name"~"${domain.replace(/[^a-zA-Z0-9]/g, " ")}",i];relation["name"~"${domain.replace(/[^a-zA-Z0-9]/g, " ")}",i];);out center 10;`
        const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: `data=${encodeURIComponent(overpassQuery)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: AbortSignal.timeout(30_000),
        })
        if (overpassRes.ok) {
          const overpassData = (await overpassRes.json()) as Record<string, unknown>
          const elements = Array.isArray(overpassData.elements) ? overpassData.elements : []
          collected.overpass_osm_elements = elements.length
          if (elements.length > 0) {
            const first = elements[0] as Record<string, unknown>
            collected.overpass_first_name = first.tags && typeof first.tags === "object"
              ? (first.tags as Record<string, unknown>).name ?? null
              : null
            collected.overpass_first_lat = first.lat ?? (first.center && typeof first.center === "object"
              ? (first.center as Record<string, unknown>).lat ?? null
              : null)
            collected.overpass_first_lon = first.lon ?? (first.center && typeof first.center === "object"
              ? (first.center as Record<string, unknown>).lon ?? null
              : null)
          }
          collected.overpass_collected_at = new Date().toISOString()
        } else {
          const opErr = `OverPass API returned HTTP ${overpassRes.status}`
          console.error("[sales-pipeline-execution] data_collection OverPass failed:", opErr)
          errors.push(opErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "OverPass API fetch error"
        console.error("[sales-pipeline-execution] data_collection OverPass error:", msg)
        errors.push(`OverPass: ${msg}`)
      }
    } else {
      errors.push("OverPass: skipped (no domain)")
    }

    // Google Trends / PyTrends — Web search interest (keyword-based, no auth needed)
    if (domain) {
      try {
        const cleanName = domain.replace(/\.(com|jp|net|org|io|co\.jp|ne\.jp|ac\.jp|go\.jp|or\.jp)$/i, "").replace(/[^a-zA-Z0-9]/g, " ")
        const trendsKeyword = encodeURIComponent(cleanName.trim() || domain)
        // Use unofficial free trends endpoint (RSS-like)
        const trendsUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=-540&req={"comparisonItem":[{"keyword":"${trendsKeyword}","geo":"","time":"today 12-m"}],"category":0,"property":""}`
        const trendsRes = await fetch(trendsUrl, { signal: AbortSignal.timeout(15_000) })
        if (trendsRes.ok) {
          const trendsText = await trendsRes.text()
          // Google Trends returns JSON with a prepended garbage string; strip it
          const jsonStart = trendsText.indexOf("{")
          if (jsonStart >= 0) {
            const trendsData = JSON.parse(trendsText.slice(jsonStart)) as Record<string, unknown>
            collected.trends_data_available = true
            collected.trends_collected_at = new Date().toISOString()
            // Extract widget tokens for later detailed fetch if needed
            const widgets = trendsData.widgets
            collected.trends_widget_count = Array.isArray(widgets) ? widgets.length : 0
          }
        } else {
          const trErr = `Google Trends returned HTTP ${trendsRes.status}`
          console.error("[sales-pipeline-execution] data_collection Google Trends failed:", trErr)
          errors.push(trErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Google Trends fetch error"
        console.error("[sales-pipeline-execution] data_collection Google Trends error:", msg)
        errors.push(`Google Trends: ${msg}`)
      }
    } else {
      errors.push("Google Trends: skipped (no domain)")
    }

    // SearXNG — private metasearch engine
    try {
      const searchQuery = domain
        ? encodeURIComponent(`${domain} company info services`)
        : encodeURIComponent(`${typeof companyRes.data?.company_name === "string" ? companyRes.data.company_name : "company"} overview`)
      const searxngUrl = `http://services-searxng-1:8080/search?q=${searchQuery}&format=json&categories=general`
      const searxngRes = await fetch(searxngUrl, { signal: AbortSignal.timeout(20_000) })
      if (searxngRes.ok) {
        const searxngData = (await searxngRes.json()) as Record<string, unknown>
        const results = Array.isArray(searxngData.results) ? searxngData.results : []
        collected.searxng_result_count = results.length
        collected.searxng_top_results = (results as Array<Record<string, unknown>>).slice(0, 5).map((r) => ({
          title: r.title ?? null,
          url: r.url ?? null,
          snippet: (typeof r.content === "string" ? r.content : typeof r.snippet === "string" ? r.snippet : null) ?? null,
        }))
        collected.searxng_collected_at = new Date().toISOString()
      } else {
        const sxErr = `SearXNG returned HTTP ${searxngRes.status}`
        console.error("[sales-pipeline-execution] data_collection SearXNG failed:", sxErr)
        errors.push(sxErr)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SearXNG fetch error"
      console.error("[sales-pipeline-execution] data_collection SearXNG error:", msg)
      errors.push(`SearXNG: ${msg}`)
    }

    // Store results in sales_companies.meta.data_collection
    const { error: metaUpdateError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .update({
        meta: {
          ...currentMeta,
          data_collection: {
            collected_at: new Date().toISOString(),
            pipeline_run_id: run.id,
            domain: domain ?? null,
            ...collected,
            errors: errors.length > 0 ? errors : null,
          },
        },
      })
      .eq("id", run.company_id)
    if (metaUpdateError) {
      console.error("[sales-pipeline-execution] data_collection meta update failed:", metaUpdateError.message)
      throw new Error(metaUpdateError.message)
    }

    // Insert source_run records for each data source
    const sourceKeyMap: Array<{ slug: string; collectedKey: string; label: string; category: string }> = [
      { slug: "crt_sh", collectedKey: "crt_cert_count", label: "crt.sh SSL Certificates", category: "security" },
      { slug: "ssl_labs", collectedKey: "ssl_grade", label: "SSL Labs Grade", category: "security" },
      { slug: "mozilla_observatory", collectedKey: "observatory_score", label: "Mozilla Observatory", category: "security" },
      { slug: "overpass_api", collectedKey: "overpass_osm_elements", label: "OverPass API (OSM)", category: "geo" },
      { slug: "google_trends", collectedKey: "trends_data_available", label: "Google Trends", category: "market" },
      { slug: "searxng_search", collectedKey: "searxng_result_count", label: "SearXNG Metasearch", category: "search" },
    ]
    for (const src of sourceKeyMap) {
      const hasData = collected[src.collectedKey] !== undefined && collected[src.collectedKey] !== null
      const { error: srcRunError } = await sb
        .from(DB_TABLES.SALES_SOURCE_RUNS)
        .upsert({
          company_id: run.company_id,
          source_slug: src.slug,
          category: src.category,
          status: hasData ? "collected" : "missing",
          score: hasData ? 75 : 0,
          details: {
            label: src.label,
            pipeline_run_id: run.id,
            collected_at: new Date().toISOString(),
          },
          measured_at: new Date().toISOString(),
        }, { onConflict: "company_id,source_slug" })
      if (srcRunError) {
        console.error(`[sales-pipeline-execution] data_collection source_run upsert failed for ${src.slug}:`, srcRunError.message)
      }
    }

    await updateStep(sb, step, {
      status: "completed",
      output_payload: {
        domain: domain ?? null,
        sources_collected: Object.keys(collected).length,
        errors: errors.length > 0 ? errors : null,
      },
    })
    return
  }

  if (step.step_key === "karte_generate") {
    const existingKarte = await fetchCompanyKarte(sb, run.company_id)
    if (existingKarte.ok && existingKarte.karte.reportUrl) {
      await updateStep(sb, step, {
        status: "completed",
        output_payload: {
          enrichment_job_id: null,
          runner_triggered: false,
          runner_error: null,
          inline_runner_completed: null,
          inline_runner_failed: null,
          report_ready: true,
          report_url: existingKarte.karte.reportUrl,
          source_score: existingKarte.karte.sourceScore,
        },
      })
      return
    }

    const enqueue = await enqueueCompanyEnrichment({
      companyId: run.company_id,
      source: "sales_pipeline",
      triggeredBy: run.requested_by,
      priority: 75,
      payload: { pipeline_run_id: run.id },
    })
    if (!enqueue.ok) {
      console.error("[sales-pipeline-execution] karte_generate enqueue failed:", enqueue.error)
      throw new Error(enqueue.error ?? "enrichment enqueue failed")
    }
    // WW-EVENT / Phase 1-3: do NOT run enrichment inline here (long HTTP occupation).
    // triggerEnrichmentRunner dispatches the Trigger.dev runner when configured, and
    // self-falls-back to a single bounded one-shot drain when it is not. On job
    // completion, completeJob() auto-resumes this pipeline run (enrichment-jobs-runner.ts).
    const trigger = await triggerEnrichmentRunner(1)
    startLeadCandidateEnrichmentFallback(1)
    const karteResult = await fetchCompanyKarte(sb, run.company_id)
    const companyRes = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("pipeline_status, report_url")
      .eq("id", run.company_id)
      .maybeSingle()
    if (companyRes.error) {
      console.error("[sales-pipeline-execution] karte_generate company check failed:", companyRes.error.message)
      throw new Error(companyRes.error.message)
    }
    const reportReady =
      companyRes.data?.pipeline_status === "report_ready" ||
      (typeof companyRes.data?.report_url === "string" && companyRes.data.report_url.length > 0) ||
      (karteResult.ok && !!karteResult.karte.reportUrl)
    await updateStep(sb, step, {
      status: reportReady ? "completed" : "waiting_external",
      output_payload: {
        enrichment_job_id: enqueue.job?.id ?? null,
        runner_triggered: trigger.ok,
        runner_dispatched: trigger.dispatched,
        runner_error: trigger.error ?? null,
        report_ready: reportReady,
        report_url: karteResult.ok ? karteResult.karte.reportUrl : companyRes.data?.report_url ?? null,
        source_score: karteResult.ok ? karteResult.karte.sourceScore : null,
      },
    })
    return
  }

  if (step.step_key === "report_generate") {
    const visualEvidence = await ensureCompanyVisualEvidence({
      sb,
      companyId: run.company_id,
      viewports: ["desktop", "mobile"],
      maxAgeDays: 14,
    })
    const reportAsset = await generateSalesAsset({
      companyIdOrSlugOrDomain: run.company_id,
      assetType: "diagnostic_report",
    })
    if (!reportAsset.ok) {
      console.error("[sales-pipeline-execution] report_generate failed:", reportAsset.error)
      throw new Error(reportAsset.error ?? "diagnostic report generation failed")
    }
    await updateStep(sb, step, {
      status: "completed",
      output_payload: {
        asset_type: reportAsset.asset_type,
        delivery_id: reportAsset.delivery_id ?? null,
        template_title: reportAsset.content_template?.title ?? null,
        visual_evidence_ready: visualEvidence.ok,
        visual_evidence_screenshots: visualEvidence.screenshots.map((shot) => ({
          viewport: shot.viewport,
          provider: shot.provider,
          url: shot.url,
        })),
        visual_evidence_skipped: visualEvidence.skipped,
        visual_evidence_errors: visualEvidence.errors,
        visual_evidence_variant_target: visualEvidence.variantTarget,
      },
    })
    return
  }

  if (step.step_key === "video_generate") {
    if (!run.require_video) {
      await updateStep(sb, step, { status: "skipped", output_payload: { reason: "video not required" } })
      return
    }
    const video = await createVideoJob({
      companyIdOrSlugOrDomain: run.company_id,
      jobType: "sales_video",
      targetPlatform: "report_page",
      renderEngine: "hyperframes",
      pipelineRunId: run.id,
      priority: 75,
      requestedBy: run.requested_by,
    })
    if (!video.ok || !video.job) {
      console.error("[sales-pipeline-execution] video_generate failed:", video.error)
      throw new Error(video.error ?? "video job creation failed")
    }
    const dispatched = await runVideoJobAction({ jobId: video.job.id, action: "dispatch" })
    await updateStep(sb, step, {
      status: dispatched.job?.status === "review_required" ? "needs_review" : "waiting_external",
      error_message: dispatched.error ?? null,
      output_payload: {
        video_job_id: video.job.id,
        video_status: dispatched.job?.status ?? video.job.status,
        message: dispatched.message ?? null,
      },
    })
    return
  }

  if (step.step_key === "r2_manifest") {
    await updateStep(sb, step, { status: "completed", output_payload: await completeR2ManifestStep(sb, run, step) })
    return
  }

  if (step.step_key === "external_studio_sync") {
    if (!run.auto_sync_external_studios) {
      await updateStep(sb, step, { status: "skipped", output_payload: { reason: "external studio sync disabled" } })
      return
    }
    const sync = await syncCompanyAcrossSalesTools(run.company_id, ["directus", "keystatic"], { pipelineRunId: run.id })
    await updateStep(sb, step, {
      status: sync.results.some((item) => item.status === "error") ? "needs_review" : "completed",
      output_payload: { ok: sync.ok, results: sync.results },
    })
    return
  }

  if (step.step_key === "twenty_writeback") {
    const result = await syncCompanyKarteToTwenty(run.company_id, { pipelineRunId: run.id })
    await updateStep(sb, step, {
      status: result.ok ? "completed" : result.configured ? "needs_review" : "skipped",
      error_message: result.ok || !result.configured ? null : result.error ?? "Twenty writeback failed",
      output_payload: {
        configured: result.configured,
        twenty_company_id: result.companyId ?? null,
        opportunity_ids: result.opportunityIds ?? [],
        recommendation_count: result.recommendationCount ?? 0,
      },
    })
    return
  }

  if (step.step_key === "outreach_preflight") {
    const result = await runOutreachBatch({
      companyId: run.company_id,
      pipelineRunId: run.id,
      limit: 1,
      dryRun: true,
      first5Approval: false,
      enableLlm: false,
      checkRobots: true,
    })
    const item = result.items[0] ?? null
    const ready = result.processed > 0 && item?.finalStage !== "manual_queue" && result.failed === 0
    await updateStep(sb, step, {
      status: ready ? "completed" : "needs_review",
      error_message: ready ? null : item?.reason ?? "No outreach candidate was available for this company",
      output_payload: { ...result, first_item: item },
    })
    return
  }

  if (step.step_key === "outreach_send") {
    const payload = asRecord(run.input_payload)
    const allowLiveOutreach = payload.allow_live_outreach === true
    if (!allowLiveOutreach) {
      await enqueuePipelineReviewTask(sb, run, {
        reason: "Live outbound outreach requires explicit approval before form submission",
        priority: 95,
        meta: { approval_required: true, requested_by: run.requested_by },
      })
      await updateStep(sb, step, {
        status: "needs_review",
        error_message: "Live outbound outreach approval is required",
        output_payload: { approval_required: true, dry_run_only: true },
      })
      return
    }

    const result = await runOutreachBatch({
      companyId: run.company_id,
      pipelineRunId: run.id,
      limit: 1,
      dryRun: false,
      first5Approval: payload.first5_approval !== false,
      enableLlm: payload.enable_llm_outreach === true,
      checkRobots: payload.check_robots !== false,
    })
    const submitted = result.submitted > 0
    const needsReview = result.manualQueue > 0 || result.failed > 0 || result.skipped > 0
    await updateStep(sb, step, {
      status: submitted ? "completed" : needsReview ? "needs_review" : "failed",
      error_message: submitted ? null : result.items[0]?.reason ?? "Outbound send did not complete",
      output_payload: result as unknown as JsonRecord,
    })
    if (submitted) {
      await updateStepByKey(sb, run.id, "reply_capture", {
        status: "waiting_external",
        started_at: new Date().toISOString(),
        output_payload: { waiting_for: "chatwoot_or_livekit_reply", submitted_at: new Date().toISOString() },
      })
    }
    return
  }

  if (step.step_key === "reply_capture") {
    await updateStep(sb, step, {
      status: "waiting_external",
      output_payload: { waiting_for: "chatwoot_or_livekit_reply" },
    })
    return
  }

  if (step.step_key === "follow_up_queue") {
    await updateStep(sb, step, { status: "skipped", output_payload: { reason: "created by reply webhooks when needed" } })
  }
}

export async function runSalesPipelineLocally(runId: string): Promise<{ ok: boolean; run?: SalesPipelineRun; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role is not configured" }

  try {
    let run = await fetchRunWithSteps(sb, runId)
    const steps = [...(run.steps ?? [])].sort((a, b) => a.position - b.position)
    for (const step of steps) {
      try {
        await executeStep(sb, run, step)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown pipeline step error"
        console.error(`[sales-pipeline] ${step.step_key} failed:`, error)
        await updateStep(sb, step, { status: step.required ? "failed" : "needs_review", error_message: message })
        if (step.required) break
      }
      run = await fetchRunWithSteps(sb, run.id)
      if (summarizeSalesPipelineStatus(run.steps ?? []) === "waiting_external") break
    }

    const refreshed = await fetchRunWithSteps(sb, run.id)
    const status = summarizeSalesPipelineStatus(refreshed.steps ?? [])
    await updateRun(sb, refreshed.id, {
      status,
      current_step: refreshed.steps?.find((step) => step.status === "queued" || step.status === "running" || step.status === "waiting_external" || step.status === "needs_review")?.step_key ?? null,
      completed_at: status === "completed" || status === "failed" || status === "cancelled" ? new Date().toISOString() : null,
      error_message: refreshed.steps?.find((step) => step.status === "failed")?.error_message ?? null,
      result_payload: {
        step_statuses: Object.fromEntries((refreshed.steps ?? []).map((step) => [step.step_key, step.status])),
      },
    })
    
    if (status === "completed" || status === "failed" || status === "needs_review") {
      const { notifySlack } = await import("@/lib/notify")
      const icon = status === "completed" ? "[OK]" : status === "failed" ? "[FAILED]" : "[REVIEW]"
      await notifySlack(`*Sales Pipeline [${status.toUpperCase()}]* ${icon}\nCompany: ${refreshed.sales_companies?.company_name ?? refreshed.company_id}\nRun ID: ${refreshed.id}`)
      
      if (status === "needs_review" || status === "failed") {
        await enqueuePipelineReviewTask(sb, refreshed, {
          reason: `Pipeline finished with status: ${status}`,
          queueType: "analysis",
          priority: status === "failed" ? 100 : 80,
          meta: { review_reason: status === "failed" ? "error_recovery" : "pipeline_review" },
        })
      }
    }

    return { ok: status !== "failed", run: await fetchRunWithSteps(sb, refreshed.id) }
  } catch (error) {
    console.error("[sales-pipeline] local run failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : "Unknown sales pipeline error" }
  }
}

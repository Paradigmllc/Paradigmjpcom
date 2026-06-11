/**
 * lib/sales/sales-pipeline-execution.ts
 *
 * sales-pipeline.ts から分離 (C-2 対応)。
 * パイプラインの各ステップの実行ロジック (executeStep) とローカル実行を担う。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte } from "./company-karte"
import { enqueueCompanyEnrichment, runEnrichmentJobs, triggerEnrichmentRunner } from "./enrichment-jobs"
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
    .from("sales_companies")
    .select("region")
    .eq("id", run.company_id)
    .maybeSingle()
  if (companyRes.error) {
    console.error("[sales-pipeline-execution] enqueuePipelineReviewTask company fetch failed:", companyRes.error.message)
    throw new Error(companyRes.error.message)
  }
  const { error } = await sb.from("sales_operator_queue_items").insert({
    region: typeof companyRes.data?.region === "string" ? companyRes.data.region : "jp",
    company_id: run.company_id,
    pipeline_run_id: run.id,
    queue_type: input.queueType ?? "form_send",
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
  await updateRun(sb, run.id, { current_step: step.step_key, status: "running", started_at: run.started_at ?? new Date().toISOString() })
  await updateStep(sb, step, { status: "running", error_message: null })

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
    const companyRes = await sb.from("sales_companies").select("meta").eq("id", run.company_id).maybeSingle()
    if (companyRes.error) {
      console.error("[sales-pipeline-execution] supabase_normalize company fetch failed:", companyRes.error.message)
      throw new Error(companyRes.error.message)
    }
    const currentMeta = asRecord(companyRes.data?.meta)
    const { error: updateError } = await sb
      .from("sales_companies")
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

  if (step.step_key === "karte_generate") {
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
    const isTriggerDev = run.trigger_provider === "trigger.dev"
    const trigger = isTriggerDev ? await triggerEnrichmentRunner(1) : { ok: false, error: "local_run_forced_inline" }
    const inlineRun = trigger.ok ? null : await runEnrichmentJobs(1)
    const karteResult = await fetchCompanyKarte(sb, run.company_id)
    const companyRes = await sb
      .from("sales_companies")
      .select("pipeline_status")
      .eq("id", run.company_id)
      .maybeSingle()
    if (companyRes.error) {
      console.error("[sales-pipeline-execution] karte_generate company check failed:", companyRes.error.message)
      throw new Error(companyRes.error.message)
    }
    const reportReady = companyRes.data?.pipeline_status === "report_ready"
    await updateStep(sb, step, {
      status: reportReady ? "completed" : "waiting_external",
      output_payload: {
        enrichment_job_id: enqueue.job?.id ?? null,
        runner_triggered: trigger.ok,
        runner_error: trigger.error ?? null,
        inline_runner_completed: inlineRun?.completed ?? null,
        inline_runner_failed: inlineRun?.failed ?? null,
        report_ready: reportReady,
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

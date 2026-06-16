import { logger, task, schedules } from "@trigger.dev/sdk/v3"
import { z } from "zod"

import { runEnrichmentJobs } from "../src/lib/sales/enrichment-jobs"
import { markLeadCandidateRunFailed, processLeadCandidateRun, triggerLeadCandidateRunner } from "../src/lib/sales/lead-candidate-runs"
import { processPassiveInventoryRun, triggerPassiveInventoryRunner } from "../src/lib/sales/passive-inventory-runner"
import { runSalesPipelineLocally } from "../src/lib/sales/sales-pipeline-execution"
import { runVideoJobAction } from "../src/lib/sales/video-pipeline"
import { pullTwentyCompaniesToSupabase } from "../src/lib/sales/twenty-pull"

const salesPipelinePayload = z.object({
  run_id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  source: z.string().optional(),
  require_video: z.boolean().optional(),
  auto_sync_external_studios: z.boolean().optional(),
})

const enrichmentPayload = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
})

const leadCandidatePayload = z.object({
  run_id: z.string().uuid(),
  batch_size: z.coerce.number().int().min(1).max(250).default(120),
  max_batches: z.coerce.number().int().min(1).max(20).default(10),
})

const passiveInventoryPayload = z.object({
  run_id: z.string().uuid(),
  max_segments: z.coerce.number().int().min(1).max(20).default(3),
})

const postOutreachPayload = z.object({
  source: z.enum(["chatwoot", "livekit"]),
  received_at: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const videoPayload = z.object({
  job_id: z.string().uuid(),
  output_url: z.string().url().optional().nullable(),
  note: z.string().optional().nullable(),
})

function recordPayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {}
}

function isHealthCheckPayload(payload: unknown): boolean {
  return recordPayload(payload).health_check === true
}

function healthCheckResult(taskId: string) {
  return { ok: true, taskId, healthCheck: true }
}

async function handlePostOutreach(payload: unknown) {
  if (isHealthCheckPayload(payload)) return healthCheckResult("post-outreach-router")
  const parsed = postOutreachPayload.parse(payload)
  logger.info("Post-outreach event accepted", {
    source: parsed.source,
    receivedAt: parsed.received_at ?? null,
    companyId: typeof parsed.summary?.companyId === "string" ? parsed.summary.companyId : null,
    pipelineRunId: typeof parsed.summary?.pipelineRunId === "string" ? parsed.summary.pipelineRunId : null,
  })

  return {
    ok: true,
    source: parsed.source,
    routed: true,
    queuedForHumanReview: false,
  }
}

export const salesOsPipelineTask = task({
  id: "sales-os-pipeline",
  description: "Run the end-to-end Sales OS pipeline from Supabase state.",
  queue: { name: "sales-os-pipeline", concurrencyLimit: 2 },
  maxDuration: 1800,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("sales-os-pipeline")
    const parsed = salesPipelinePayload.parse(payload)
    logger.info("Sales OS pipeline started", { runId: parsed.run_id, companyId: parsed.company_id ?? null })

    const result = await runSalesPipelineLocally(parsed.run_id)
    if (!result.ok) throw new Error(result.error ?? "Sales OS pipeline failed")

    return {
      ok: true,
      runId: parsed.run_id,
      status: result.run?.status ?? "unknown",
      currentStep: result.run?.current_step ?? null,
    }
  },
})

export const salesEnrichmentRunnerTask = task({
  id: "sales-enrichment-runner",
  description: "Drain queued Sales OS enrichment jobs.",
  queue: { name: "sales-enrichment", concurrencyLimit: 3 },
  maxDuration: 2400,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("sales-enrichment-runner")
    const parsed = enrichmentPayload.parse(payload ?? {})
    logger.info("Sales enrichment runner started", { limit: parsed.limit })
    return runEnrichmentJobs(parsed.limit)
  },
})

export const salesLeadCandidateRunnerTask = task({
  id: "sales-lead-candidate-runner",
  description: "Drain large RevenueOS lead candidate acquisition runs.",
  queue: { name: "sales-lead-candidates", concurrencyLimit: 2 },
  maxDuration: 2400,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("sales-lead-candidate-runner")
    const parsed = leadCandidatePayload.parse(payload ?? {})
    logger.info("Lead candidate runner started", {
      runId: parsed.run_id,
      batchSize: parsed.batch_size,
      maxBatches: parsed.max_batches,
    })
    try {
      const result = await processLeadCandidateRun(parsed.run_id, {
        batchSize: parsed.batch_size,
        maxBatches: parsed.max_batches,
      })
      if (result.hasMore) {
        logger.warn("Lead candidate run still has pending candidates", { runId: parsed.run_id, processed: result.processed })
        await triggerLeadCandidateRunner(parsed.run_id)
      }
      return result
    } catch (error) {
      logger.error("Lead candidate run failed", { runId: parsed.run_id, error })
      await markLeadCandidateRunFailed(parsed.run_id, error)
      throw error
    }
  },
})

export const salesPassiveInventoryRunnerTask = task({
  id: "sales-passive-inventory-runner",
  description: "Drain durable BuiltWith-style passive inventory segments.",
  queue: { name: "sales-passive-inventory", concurrencyLimit: 1 },
  maxDuration: 2400,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("sales-passive-inventory-runner")
    const parsed = passiveInventoryPayload.parse(payload ?? {})
    logger.info("Passive inventory runner started", { runId: parsed.run_id, maxSegments: parsed.max_segments })
    const result = await processPassiveInventoryRun(parsed.run_id, { maxSegments: parsed.max_segments })
    if (result.hasMore) {
      logger.warn("Passive inventory run still has queued segments", { runId: parsed.run_id, processedSegments: result.processedSegments })
      await triggerPassiveInventoryRunner(parsed.run_id)
    }
    return result
  },
})

export const postOutreachRouterTask = task({
  id: "post-outreach-router",
  description: "Accept post-outreach events from Chatwoot or LiveKit.",
  queue: { name: "post-outreach", concurrencyLimit: 2 },
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: handlePostOutreach,
})

export const chatwootReplyRouterTask = task({
  id: "chatwoot-reply-router",
  description: "Accept Chatwoot replies after outbound outreach.",
  queue: { name: "post-outreach", concurrencyLimit: 2 },
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("chatwoot-reply-router")
    return handlePostOutreach({ ...recordPayload(payload), source: "chatwoot" })
  },
})

export const livekitDiscoveryRouterTask = task({
  id: "livekit-discovery-router",
  description: "Accept LiveKit discovery-call events after outreach.",
  queue: { name: "post-outreach", concurrencyLimit: 2 },
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("livekit-discovery-router")
    return handlePostOutreach({ ...recordPayload(payload), source: "livekit" })
  },
})

export const salesVideoPipelineTask = task({
  id: "sales-video-pipeline",
  description: "Mark Trigger-owned Sales OS video jobs as ready for renderer review.",
  queue: { name: "sales-video-pipeline", concurrencyLimit: 2 },
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: unknown) => {
    if (isHealthCheckPayload(payload)) return healthCheckResult("sales-video-pipeline")
    const parsed = videoPayload.parse(payload)
    if (!parsed.output_url) {
      logger.info("Sales video task accepted; waiting for renderer callback", { jobId: parsed.job_id })
      return { ok: true, jobId: parsed.job_id, status: "waiting_render", rendererCallbackRequired: true }
    }

    const result = await runVideoJobAction({
      jobId: parsed.job_id,
      action: "complete",
      outputUrl: parsed.output_url,
      note: parsed.note ?? "Completed by Trigger.dev Sales OS task",
    })
    if (!result.ok) throw new Error(result.error ?? "Sales video pipeline task failed")
    return { ok: true, jobId: parsed.job_id, status: result.job?.status ?? null }
  },
})

/**
 * Scheduled task: pull companies from Twenty CRM every 5 minutes.
 * When new companies are found, automatically creates them in Supabase
 * and dispatches the Sales OS pipeline (enrichment → report → video).
 */
export const twentySyncCron = schedules.task({
  id: "twenty-sync-cron",
  cron: "* * * * *", // Every 1 minute — near real-time Twenty sync
  maxDuration: 180,
  run: async () => {
    logger.info("Twenty CRM scheduled sync starting")
    const result = await pullTwentyCompaniesToSupabase(500, {
      autoRunPipeline: true,
      dispatchPipeline: true,
      requestedBy: "twenty_sync_cron",
    })
    logger.info("Twenty CRM sync completed", {
      scanned: result.scanned,
      created: result.created,
      updated: result.updated,
      pipelineRunsCreated: result.pipelineRunsCreated,
    })
    return { ok: true, scanned: result.scanned, created: result.created, updated: result.updated, pipelineRunsCreated: result.pipelineRunsCreated }
  },
})

/**
 * Scheduled task: regenerate diagnostic reports for companies whose data has changed.
 * Runs every 5 minutes. Scans for companies with report_generated_at IS NULL
 * (set by DB trigger when relevant fields change) and regenerates their reports.
 */
export const salesReportRegeneratorTask = schedules.task({
  id: "sales-report-regenerator",
  cron: "*/5 * * * *", // Every 5 minutes
  maxDuration: 300,
  run: async () => {
    const { getServiceSalesSupabase } = await import("../src/lib/supabase")
    const DB_TABLES = (await import("../src/lib/sales/db-tables")).DB_TABLES
    const sb = getServiceSalesSupabase()
    if (!sb) return { ok: false, error: "Supabase not configured" }

    // Find companies needing regeneration (report_generated_at is NULL, not pending)
    const { data: staleCompanies, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, domain, company_name")
      .is("report_generated_at", null)
      .eq("pipeline_status", "report_ready")
      .limit(10)

    if (error) {
      logger.error("Report regenerator: fetch stale companies failed", { error: error.message })
      return { ok: false, error: error.message }
    }

    if (!staleCompanies || staleCompanies.length === 0) {
      return { ok: true, regenerated: 0 }
    }

    const { fetchDiagnosticReport, markReportGenerated } = await import("../src/lib/sales/diagnostic")
    let regenerated = 0
    let failed = 0

    for (const co of staleCompanies) {
      try {
        const report = await fetchDiagnosticReport({ companyId: co.id, forceRegenerate: true })
        if (report) {
          await markReportGenerated(co.id)
          regenerated++
        }
      } catch (e) {
        failed++
        logger.error("Report regenerator: failed", { companyId: co.id, domain: co.domain, error: e instanceof Error ? e.message : String(e) })
      }
    }

    logger.info("Report regenerator completed", { regenerated, failed })
    return { ok: true, regenerated, failed }
  },
})

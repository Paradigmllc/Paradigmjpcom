import { logger, task } from "@trigger.dev/sdk/v3"
import { z } from "zod"

import { runEnrichmentJobs } from "../src/lib/sales/enrichment-jobs"
import { runSalesPipelineLocally } from "../src/lib/sales/sales-pipeline-execution"
import { runVideoJobAction } from "../src/lib/sales/video-pipeline"

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

async function handlePostOutreach(payload: unknown) {
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
  queue: { name: "sales-enrichment", concurrencyLimit: 1 },
  maxDuration: 1200,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 60_000,
    maxTimeoutInMs: 300_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: unknown) => {
    const parsed = enrichmentPayload.parse(payload ?? {})
    logger.info("Sales enrichment runner started", { limit: parsed.limit })
    return runEnrichmentJobs(parsed.limit)
  },
})

export const postOutreachRouterTask = task({
  id: "post-outreach-router",
  description: "Accept post-outreach events from Chatwoot or LiveKit.",
  queue: { name: "post-outreach", concurrencyLimit: 2 },
  maxDuration: 300,
  run: handlePostOutreach,
})

export const chatwootReplyRouterTask = task({
  id: "chatwoot-reply-router",
  description: "Accept Chatwoot replies after outbound outreach.",
  queue: { name: "post-outreach", concurrencyLimit: 2 },
  maxDuration: 300,
  run: async (payload: unknown) => handlePostOutreach({ ...recordPayload(payload), source: "chatwoot" }),
})

export const livekitDiscoveryRouterTask = task({
  id: "livekit-discovery-router",
  description: "Accept LiveKit discovery-call events after outreach.",
  queue: { name: "post-outreach", concurrencyLimit: 2 },
  maxDuration: 300,
  run: async (payload: unknown) => handlePostOutreach({ ...recordPayload(payload), source: "livekit" }),
})

export const salesVideoPipelineTask = task({
  id: "sales-video-pipeline",
  description: "Mark Trigger-owned Sales OS video jobs as ready for renderer review.",
  queue: { name: "sales-video-pipeline", concurrencyLimit: 2 },
  maxDuration: 600,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: unknown) => {
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

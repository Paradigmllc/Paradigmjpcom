import type { SalesVideoJob } from "./video-pipeline-types"

export interface OpenClawVideoPipelineConfig {
  taskId: string
  endpoint: null
  secretKey: null
  apiUrl: string
  dashboardUrl: null
}

export function getOpenClawVideoPipelineConfig(): OpenClawVideoPipelineConfig {
  return {
    taskId: "openclaw-video-pipeline",
    endpoint: null,
    secretKey: null,
    apiUrl: "",
    dashboardUrl: null,
  }
}

/** @deprecated 2026-07-06 — Trigger.dev decommissioned. Use getOpenClawVideoPipelineConfig(). */
export const getTriggerVideoPipelineConfig = getOpenClawVideoPipelineConfig

export async function dispatchVideoJobViaOpenClaw(job: SalesVideoJob): Promise<{ executionId: string | null; manual: boolean; message: string }> {
  return { executionId: null, manual: true, message: "OpenClaw video pipeline: manual dispatch (Phase 3 SSH wiring pending)" }
}

/** @deprecated 2026-07-06 — Trigger.dev decommissioned. Use dispatchVideoJobViaOpenClaw(). */
export const dispatchVideoJobToTriggerDev = dispatchVideoJobViaOpenClaw

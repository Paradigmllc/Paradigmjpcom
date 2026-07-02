/**
 * @deprecated 2026-07-02 — OpenClaw has replaced Trigger.dev as the pipeline orchestrator.
 * All tasks below are no-op tombstones. The real pipeline runs via OpenClaw skills:
 *   lead-discovery → diagnosis-output → crm-sync → outreach-exec
 * Trigger.dev is retained only as a dormant fallback (not invoked in production).
 */

import { logger, task } from "@trigger.dev/sdk/v3"

// ============================================================
// ALL TASKS DEPRECATED 2026-07-02
// Pipeline now runs via OpenClaw skills:
//   lead-discovery → diagnosis-output → crm-sync → outreach-exec
// Trigger.dev retained only as dormant fallback.
// ============================================================

/** @deprecated 2026-07-02 — Pipeline now runs via OpenClaw, not Trigger.dev. */
export const salesOsPipelineTask = task({
  id: "sales-os-pipeline",
  description: "DEPRECATED: OpenClaw replaced Trigger.dev as pipeline orchestrator.",
  maxDuration: 30,
  run: async () => {
    logger.warn("sales-os-pipeline invoked but is deprecated — pipeline runs via OpenClaw now")
    return { ok: true, deprecated: true, replacement: "openclaw lead-discovery → diagnosis-output → crm-sync → outreach-exec" }
  },
})

/** @deprecated 2026-07-02 — Enrichment now handled by OpenClaw diagnosis-output skill. */
export const salesEnrichmentRunnerTask = task({
  id: "sales-enrichment-runner",
  description: "DEPRECATED: OpenClaw replaced Trigger.dev enrichment.",
  maxDuration: 30,
  run: async () => {
    logger.warn("sales-enrichment-runner invoked but is deprecated — enrichment runs via OpenClaw")
    return { ok: true, deprecated: true, replacement: "openclaw diagnosis-output" }
  },
})

/** @deprecated 2026-07-02 — Lead discovery moved to OpenClaw lead-discovery skill. */
export const salesLeadCandidateRunnerTask = task({
  id: "sales-lead-candidate-runner",
  description: "DEPRECATED: OpenClaw handles lead discovery.",
  maxDuration: 30,
  run: async () => {
    logger.warn("sales-lead-candidate-runner invoked but is deprecated — leads via OpenClaw")
    return { ok: true, deprecated: true, replacement: "openclaw lead-discovery" }
  },
})

/** @deprecated 2026-07-02 — Passive inventory moved to OpenClaw lead-discovery skill. */
export const salesPassiveInventoryRunnerTask = task({
  id: "sales-passive-inventory-runner",
  description: "DEPRECATED: OpenClaw handles passive inventory.",
  maxDuration: 30,
  run: async () => {
    logger.warn("sales-passive-inventory-runner invoked but is deprecated")
    return { ok: true, deprecated: true, replacement: "openclaw lead-discovery" }
  },
})

/** @deprecated 2026-07-02 — Outreach moved to OpenClaw outreach-exec skill. */
export const postOutreachRouterTask = task({
  id: "post-outreach-router",
  description: "DEPRECATED: Outreach routes via OpenClaw.",
  maxDuration: 30,
  run: async () => {
    logger.warn("post-outreach-router invoked but is deprecated")
    return { ok: true, deprecated: true, replacement: "openclaw outreach-exec" }
  },
})

export const chatwootReplyRouterTask = task({
  id: "chatwoot-reply-router",
  description: "DEPRECATED: OpenClaw replaced Trigger.dev Chatwoot routing.",
  maxDuration: 30,
  run: async () => {
    logger.warn("chatwoot-reply-router invoked but is deprecated")
    return { ok: true, deprecated: true }
  },
})

export const livekitDiscoveryRouterTask = task({
  id: "livekit-discovery-router",
  description: "DEPRECATED: OpenClaw replaced Trigger.dev LiveKit routing.",
  maxDuration: 30,
  run: async () => {
    logger.warn("livekit-discovery-router invoked but is deprecated")
    return { ok: true, deprecated: true }
  },
})

/** @deprecated 2026-07-02 — Video pipeline deferred to OpenClaw future skill. */
export const salesVideoPipelineTask = task({
  id: "sales-video-pipeline",
  description: "DEPRECATED: Video pipeline deferred to OpenClaw.",
  maxDuration: 30,
  run: async () => {
    logger.warn("sales-video-pipeline invoked but is deprecated")
    return { ok: true, deprecated: true }
  },
})

export const twentySyncCronTombstone = task({
  id: "twenty-sync-cron",
  description: "Deprecated tombstone for the old scheduled Twenty sync. It does no work.",
  maxDuration: 30,
  run: async () => {
    logger.warn("Deprecated twenty-sync-cron invoked; no-op because WW-EVENT forbids scheduled sync")
    return { ok: true, deprecated: true, workPerformed: false }
  },
})

/** @deprecated 2026-07-02 — Twenty sync now handled by OpenClaw crm-sync skill. */
export const twentySyncEventTask = task({
  id: "twenty-sync-event",
  description: "DEPRECATED: Twenty sync runs via OpenClaw crm-sync.",
  maxDuration: 30,
  run: async () => {
    logger.warn("twenty-sync-event invoked but is deprecated — sync via OpenClaw crm-sync")
    return { ok: true, deprecated: true, replacement: "openclaw crm-sync" }
  },
})

export const salesReportRegeneratorTombstone = task({
  id: "sales-report-regenerator",
  description: "Deprecated tombstone for the old scheduled report regenerator. It does no work.",
  maxDuration: 30,
  run: async () => {
    logger.warn("Deprecated sales-report-regenerator invoked; no-op because WW-EVENT forbids scheduled regeneration")
    return { ok: true, deprecated: true, workPerformed: false }
  },
})

/** @deprecated 2026-07-02 — Report regeneration now handled by OpenClaw diagnosis-output. */
export const salesReportRegeneratorEventTask = task({
  id: "sales-report-regenerator-event",
  description: "DEPRECATED: Reports regenerated via OpenClaw diagnosis-output.",
  maxDuration: 30,
  run: async () => {
    logger.warn("sales-report-regenerator-event invoked but is deprecated — via OpenClaw diagnosis-output")
    return { ok: true, deprecated: true, replacement: "openclaw diagnosis-output" }
  },
})

/**
 * Pipeline Slack notifications — alerts for failures and critical events.
 *
 * Sends to #all-paradigm when:
 *   - Pipeline step fails
 *   - Pipeline completes with errors
 *   - Re-verification triggers
 *
 * 2026-07-07: AGENTS.md Rule N compliance.
 */

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL

export interface PipelineAlert {
  title: string
  message: string
  severity: "info" | "warning" | "error"
  link?: string
}

async function sendSlack(alert: PipelineAlert): Promise<void> {
  if (!SLACK_WEBHOOK) return

  const color =
    alert.severity === "error" ? "#ff0000"
    : alert.severity === "warning" ? "#ffaa00"
    : "#36a64f"

  try {
    await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [{
          color,
          title: alert.title,
          text: alert.message,
          title_link: alert.link,
          footer: "OpenClaw Pipeline",
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch (e) {
    console.error("[pipeline-slack] notification failed:", e instanceof Error ? e.message : String(e))
  }
}

// ─── Pipeline event handlers ───

export async function notifyPipelineStarted(params: {
  skill: string
  details: string
  link?: string
}): Promise<void> {
  await sendSlack({
    title: `🔍 Pipeline: ${params.skill} started`,
    message: params.details,
    severity: "info",
    link: params.link,
  })
}

export async function notifyPipelineCompleted(params: {
  skill: string
  discovered: number
  diagnosed: number
  synced: number
  durationSec: number
  link?: string
}): Promise<void> {
  await sendSlack({
    title: `✅ Pipeline: ${params.skill} completed`,
    message: [
      `Discovered: ${params.discovered}`,
      `Diagnosed: ${params.diagnosed}`,
      `Synced: ${params.synced}`,
      `Duration: ${params.durationSec}s`,
    ].join(" | "),
    severity: "info",
    link: params.link,
  })
}

export async function notifyPipelineFailed(params: {
  skill: string
  error: string
  step: string
  link?: string
}): Promise<void> {
  await sendSlack({
    title: `❌ Pipeline: ${params.skill} FAILED at ${params.step}`,
    message: params.error,
    severity: "error",
    link: params.link,
  })
}

export async function notifyPipelineWarning(params: {
  skill: string
  message: string
  link?: string
}): Promise<void> {
  await sendSlack({
    title: `⚠️ Pipeline: ${params.skill} warning`,
    message: params.message,
    severity: "warning",
    link: params.link,
  })
}

export async function notifyReVerifyTriggered(params: {
  count: number
  reason: string
}): Promise<void> {
  await sendSlack({
    title: `🔄 Freshness TTL: ${params.count} candidates flagged for re-verification`,
    message: `Reason: ${params.reason}`,
    severity: "warning",
  })
}

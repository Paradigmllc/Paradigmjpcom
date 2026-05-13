/**
 * lib/notify.ts — Slack Bot API 通知 (Sprint 11)
 *
 * 役割: 既存 Coolify env の SLACK_BOT_TOKEN + SLACK_CHANNEL_ID を使い
 *       chat.postMessage で Slack 通知。Resend より高機能 (Block Kit 等)。
 *
 * 使用箇所:
 *   - track-view: HOT lead 検知時
 *   - api/contact: フォーム送信時
 *   - admin: 異常検知時
 */

const SLACK_API = "https://slack.com/api"

interface HotLeadPayload {
  company_name: string
  domain: string
  report_views: number
  diagnostic_url: string
}

async function slackPost(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN ?? ""
  if (!token) {
    console.warn("[notify] SLACK_BOT_TOKEN not set — no-op")
    return { ok: false, error: "SLACK_BOT_TOKEN not configured" }
  }
  try {
    const res = await fetch(`${SLACK_API}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    })
    const data = (await res.json()) as { ok: boolean; error?: string }
    return data
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** HOT lead 検知時の Block Kit 通知 */
export async function notifyHotLead(p: HotLeadPayload): Promise<void> {
  const channel = process.env.SLACK_CHANNEL_ID ?? "#all-paradigm"
  await slackPost("chat.postMessage", {
    channel,
    text: `🔥 HOT LEAD: ${p.company_name} (${p.report_views} views)`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🔥 HOT LEAD: ${p.company_name}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*ドメイン*\n${p.domain}` },
          { type: "mrkdwn", text: `*閲覧回数*\n${p.report_views} 回 (3+ で HOT 判定)` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "診断レポートを見る" },
            url: p.diagnostic_url,
            style: "primary",
          },
        ],
      },
    ],
  })
}

/** 一般通知 (text + 任意 blocks) */
export async function notifySlack(text: string, blocks?: unknown[]): Promise<void> {
  const channel = process.env.SLACK_CHANNEL_ID ?? "#all-paradigm"
  await slackPost("chat.postMessage", {
    channel,
    text,
    ...(blocks ? { blocks } : {}),
  })
}

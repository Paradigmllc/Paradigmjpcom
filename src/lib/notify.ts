import { DB_TABLES } from "@/lib/sales/db-tables"
const SLACK_API = "https://slack.com/api"

interface HotLeadPayload {
  company_name: string
  domain: string
  report_views: number
  diagnostic_url: string
  video_url?: string | null
}

interface SlackPostResult {
  ok: boolean
  error?: string
}

interface NotifyBothOptions {
  title: string
  message: string
  link?: string
  type?: string
  region?: "jp" | "global"
  priority?: number
}

async function slackPost(method: string, body: Record<string, unknown>): Promise<SlackPostResult> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token || token.trim().length === 0) {
    console.warn("[notify] SLACK_BOT_TOKEN not set; Slack notification skipped")
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
    const data = (await res.json()) as SlackPostResult
    if (!data.ok) console.error("[notify] Slack API error:", data.error ?? "unknown error")
    return data
  } catch (error) {
    console.error("[notify] Slack post failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function notifyHotLead(payload: HotLeadPayload): Promise<void> {
  const channel = process.env.SLACK_CHANNEL_ID ?? "#all-paradigm"
  await slackPost("chat.postMessage", {
    channel,
    text: `HOT LEAD: ${payload.company_name} (${payload.report_views} views)`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `HOT LEAD: ${payload.company_name}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Domain*\n${payload.domain}` },
          { type: "mrkdwn", text: `*Report views*\n${payload.report_views}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open diagnostic report" },
            url: payload.diagnostic_url,
            style: "primary",
          },
          ...(payload.video_url
            ? [
                {
                  type: "button",
                  text: { type: "plain_text", text: "Open video preview" },
                  url: payload.video_url,
                },
              ]
            : []),
        ],
      },
    ],
  })
}

export async function notifySlack(text: string, blocks?: unknown[]): Promise<void> {
  const channel = process.env.SLACK_CHANNEL_ID ?? "#all-paradigm"
  await slackPost("chat.postMessage", {
    channel,
    text,
    ...(blocks ? { blocks } : {}),
  })
}

export async function notifyBothChannels(text: string, options: NotifyBothOptions): Promise<void> {
  const slackResult = await slackPost("chat.postMessage", {
    channel: process.env.SLACK_CHANNEL_ID ?? "#all-paradigm",
    text,
  })

  if (!slackResult.ok) {
    console.error("[notify] Slack notification failed:", slackResult.error ?? "unknown error")
  }

  try {
    const { getServiceSalesSupabase } = await import("@/lib/supabase")
    const sb = getServiceSalesSupabase()
    if (!sb) {
      console.warn("[notify] Supabase client not available for DB notification")
      return
    }

    const { error } = await sb.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
      region: options.region ?? "jp",
      queue_type: "analysis",
      priority: options.priority ?? 80,
      status: "open",
      source_tool: "trigger_dev",
      target_tool: "appsmith",
      meta: {
        type: options.type ?? "system_alert",
        title: options.title,
        message: options.message,
        link: options.link ?? null,
        created_by: "notify_both_channels",
        slack_ok: slackResult.ok,
        slack_error: slackResult.error ?? null,
      },
    })
    if (error) console.error("[notify] DB queue notification insert failed:", error.message)
  } catch (error) {
    console.error("[notify] DB notification failed:", error)
  }
}

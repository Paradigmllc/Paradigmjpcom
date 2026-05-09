/**
 * Slack Block Kit helpers — B36 #19 MVP.
 * 例外通知のみ・happy path 無音.
 */

const SLACK_API = "https://slack.com/api";

export type SlackAlertLevel = "🔴" | "🟡" | "🔵" | "🟢";
export type SlackAlertKind =
  | "dead_letter"
  | "violation_review"
  | "hot_lead"
  | "quota_exhausted"
  | "form_structure_changed"
  | "entity_disambiguation"
  | "cron_stopped"
  | "report_url_verify_failed"
  | "schema_mismatch"
  | "locale_mismatch"
  | "daily_summary";

interface SlackPostOptions {
  text: string;
  blocks?: unknown[];
  threadTs?: string;
}

export async function postToSlack(opts: SlackPostOptions): Promise<{
  ok: boolean;
  threadTs?: string;
  errorMessage?: string;
}> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID ?? "C0B1JJ1L276";
  if (!token) {
    return { ok: false, errorMessage: "SLACK_BOT_TOKEN missing" };
  }
  try {
    const res = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text: opts.text,
        blocks: opts.blocks,
        thread_ts: opts.threadTs,
      }),
    });
    const json = (await res.json()) as { ok: boolean; ts?: string; error?: string };
    if (!json.ok) return { ok: false, errorMessage: json.error };
    return { ok: true, threadTs: json.ts };
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : String(e) };
  }
}

export function buildViolationApprovalBlocks(p: {
  runId: string;
  leadId: string;
  companyName: string;
  formUrl: string;
  body: string;
  violationReason: string;
}): unknown[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "🟡 規約違反疑い — 承認待ち" },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Run ID*\n\`${p.runId}\`` },
        { type: "mrkdwn", text: `*Lead*\n${p.companyName}` },
        { type: "mrkdwn", text: `*Form URL*\n${p.formUrl}` },
        { type: "mrkdwn", text: `*検出理由*\n${p.violationReason}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*生成本文*\n\`\`\`\n${p.body.slice(0, 2500)}\n\`\`\`` },
    },
    {
      type: "actions",
      block_id: `mvp_violation_${p.runId}`,
      elements: [
        {
          type: "button",
          action_id: "approve_send",
          text: { type: "plain_text", text: "✅ 承認して送信" },
          style: "primary",
          value: p.runId,
        },
        {
          type: "button",
          action_id: "skip_send",
          text: { type: "plain_text", text: "⏭ skip" },
          value: p.runId,
        },
        {
          type: "button",
          action_id: "edit_send",
          text: { type: "plain_text", text: "✏️ 編集 (UIへ)" },
          url: `${process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com"}/sales/global/mvp/${p.runId}`,
          value: p.runId,
        },
      ],
    },
  ];
}

export function buildAlertBlocks(p: {
  level: SlackAlertLevel;
  kind: SlackAlertKind;
  title: string;
  fields?: Array<{ label: string; value: string }>;
  cta?: { label: string; url: string };
}): unknown[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: `${p.level} ${p.title}` },
    },
    ...(p.fields && p.fields.length > 0
      ? [
          {
            type: "section",
            fields: p.fields.map((f) => ({
              type: "mrkdwn",
              text: `*${f.label}*\n${f.value}`,
            })),
          },
        ]
      : []),
    ...(p.cta
      ? [
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: p.cta.label },
                url: p.cta.url,
              },
            ],
          },
        ]
      : []),
  ];
}

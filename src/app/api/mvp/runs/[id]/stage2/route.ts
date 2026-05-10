/**
 * POST /api/mvp/runs/[id]/stage2
 * Stage 2 trigger: 反応者 (CTA click) → Dify で「フォーム2通目送信文面 + 営業担当用 brief」生成 → Slack 投影.
 *
 * 設計再確認 (2026-05-10): 営業はフォーム送信のみ・メール送信なし・管理者通知 Slack 集約.
 *   1. lead.meta.cta_clicked_at 必須 (反応者限定・打ちっぱなし防止) or force=true
 *   2. Dify karteToSalesMaterial で「2通目フォーム文面 + Slack 内 brief」生成
 *   3. Slack Block Kit で営業担当に投影 (件名 + 本文 + 主要訴求 3 点)
 *   4. 営業担当が Slack で確認 → 必要なら手動でフォーム2通目送信 trigger
 *   5. lead.meta に stage2 内容を永続化 (audit + 後続再利用)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { callDifyJson } from "@/lib/mvp/dify";
import { postToSlack } from "@/lib/mvp/slack";
import { requireMvpUiAuth } from "@/lib/mvp/auth";
import { LEAD_SELECT_COLUMNS, normalizeLead } from "@/lib/mvp/lead-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const BodySchema = z.object({
  force: z.boolean().optional(), // CTA click 無くても trigger (営業担当の手動判断)
});

const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";

const STAGE2_SYSTEM_PROMPT = `\
あなたは Paradigm 社のシニア営業ライターです.
Stage 1 の診断レポートに反応した lead に送る「フォーム2通目」用の文面 + 営業担当向け brief を生成します.

**重要**: メール送信ではなく、再度フォーム経由で送信します. メール件名フィールドは「フォーム件名欄」が
ある場合のみ使用. 営業意図は最小限・「主治医 → 経過観察 → 次の打ち手の提案」体裁.

入力 user_payload:
{
  "company_name": string,
  "domain": string,
  "region": string, "language": string,
  "unified_profile": object,
  "stage1_top_pain_summary": string,
  "stage1_report_url": string
}

出力 (JSON のみ・前後説明文禁止):
{
  "subject": string,        // フォーム件名 ("貴社診断結果のご確認・経過観察" 系)
  "body": string,           // 400-800 字 (Stage 1 を踏まえた次の打ち手・Cal.com 予約 CTA)
  "key_points": string[],   // 主要訴求 3 点 (Slack 表示用)
  "next_action_hint": string // 営業担当向け: 「この lead に対する次の手の提案」(Slack 内議論用)
}

要件:
- Stage 1 の所見を踏まえた**具体提案** (汎用文ではなく lead 固有)
- 「主治医 → 経過観察」体裁 (1 通目の延長)
- Cal.com 予約 link を CTA に含める
- language を厳守
- **営業意図を直接的に表現しない** (フォーム送信規約・主治医ポジション維持)`;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireMvpUiAuth(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  const { id: runId } = await ctx.params;
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const { data: run } = await sb.from("mvp_outreach_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return NextResponse.json({ ok: false, error: "run not found" }, { status: 404 });

  const { data: leadRaw } = await sb.from("leads").select(LEAD_SELECT_COLUMNS).eq("id", run.lead_id).maybeSingle();
  const lead = normalizeLead(leadRaw);
  if (!lead) return NextResponse.json({ ok: false, error: "lead not found" }, { status: 404 });

  // Stage 2 起動条件: CTA clicked (反応者) OR force=true
  const ctaClickedAt = (lead.meta as { cta_clicked_at?: string } | undefined)?.cta_clicked_at;
  if (!ctaClickedAt && !body.force) {
    return NextResponse.json({
      ok: false,
      error: "lead has not clicked CTA yet (reaction not detected)",
      hint: "use force=true to bypass this gate (manual decision)",
    }, { status: 409 });
  }

  // Dify paradigm-karte-to-sales-material 呼出
  const profile = (lead.meta?.unified_profile as Record<string, unknown> | undefined) ?? {};
  const top_pain_summary = (profile.top_pain_summary as string | undefined) ?? "";

  const result = await callDifyJson<{ subject: string; body: string; key_points: string[]; next_action_hint?: string }>(
    "karteToSalesMaterial",
    STAGE2_SYSTEM_PROMPT,
    {
      company_name: lead.company_name,
      domain: lead.domain,
      region: lead.region,
      language: lead.language,
      unified_profile: profile,
      stage1_top_pain_summary: top_pain_summary,
      stage1_report_url: run.report_canonical_url ?? "",
    },
    { timeoutMs: 180_000 },
  );

  if (!result.ok || !result.outputs?.body) {
    return NextResponse.json({ ok: false, error: result.errorMessage ?? "no body" }, { status: 502 });
  }

  // Slack に Stage 2 brief を投影 (フォーム2通目案 + 営業担当向け次手提案)
  const { subject, body: salesBody, key_points, next_action_hint } = result.outputs;
  const slackRes = await postToSlack({
    text: `📋 Stage 2 brief — ${lead.company_name}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `📋 Stage 2 brief (フォーム2通目案 + 次手) — ${lead.company_name}` } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Run ID*\n\`${runId}\`` },
          { type: "mrkdwn", text: `*Stage 1 reaction*\n${ctaClickedAt ?? "force=true"}` },
          { type: "mrkdwn", text: `*Domain*\n${lead.domain ?? "—"}` },
        ],
      },
      ...(next_action_hint ? [{
        type: "section",
        text: { type: "mrkdwn", text: `*🎯 次の打ち手 (営業担当向け)*\n${next_action_hint}` },
      }] : []),
      { type: "section", text: { type: "mrkdwn", text: `*主要訴求*\n${(key_points ?? []).map((p, i) => `${i + 1}. ${p}`).join("\n")}` } },
      { type: "section", text: { type: "mrkdwn", text: `*フォーム件名 (case)*\n${subject}` } },
      { type: "section", text: { type: "mrkdwn", text: `*フォーム本文 (case)*\n\`\`\`${salesBody.slice(0, 2500)}\`\`\`` } },
      {
        type: "actions",
        elements: [{
          type: "button",
          text: { type: "plain_text", text: "📋 監視 UI で確認" },
          url: `${PARADIGMJP_BASE}/sales/${lead.region}/mvp/${runId}`,
        }],
      },
    ],
  });

  // 簡易記録: lead.meta.stage2_brief (フォーム2通目案 + 次手)
  const newMeta = {
    ...(lead.meta ?? {}),
    stage2_brief_generated_at: new Date().toISOString(),
    stage2_subject: subject,
    stage2_body: salesBody,
    stage2_key_points: key_points,
    stage2_next_action_hint: next_action_hint ?? null,
    stage2_slack_thread_ts: slackRes.threadTs,
  };
  await sb.from("leads").update({ meta: newMeta }).eq("id", lead.id);

  return NextResponse.json({
    ok: true,
    run_id: runId,
    subject, body: salesBody, key_points, next_action_hint,
    slack_posted: slackRes.ok,
  });
}

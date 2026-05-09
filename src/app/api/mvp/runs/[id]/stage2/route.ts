/**
 * POST /api/mvp/runs/[id]/stage2
 * Stage 2 trigger: 反応者 (CTA click) → Dify karteToSalesMaterial → Slack 承認 → メール送信.
 *
 * Phase 4 設計:
 *   1. lead.meta.cta_clicked_at 必須 (反応者限定・打ちっぱなし防止)
 *   2. Dify paradigm-karte-to-sales-material で営業資料 copy 生成
 *   3. Slack Block Kit で承認待ち (人間 1 click 介在)
 *   4. 承認後に Resend でメール送信 (送信先 = lead.contact_email or 担当者)
 *   5. mvp_outreach_runs に stage2_status / stage2_material_id を記録 (今後 schema 拡張)
 *
 * 現状 MVP-of-MVP:
 *   - 営業資料 generation + Slack 承認待ちまで実装
 *   - 実際のメール送信は Slack 承認時の手動コピペ (Phase 4-B でメール送信自動化)
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
診断レポート (Stage 1) に反応した lead に送る、より具体的な営業資料 copy を生成します.

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
  "subject": string,        // メール件名 ("貴社診断レポートのフォローアップ" 系)
  "body": string,           // 800-1500 字 (具体的な処方箋 + Cal.com 予約 CTA)
  "key_points": string[]    // 主要訴求 3 点 (Slack 表示用)
}

要件:
- Stage 1 の発見事項を踏まえた具体提案 (汎用文ではなく lead 固有)
- 「主治医 → 専門治療提案」体裁
- Cal.com 予約 link を CTA に含める (caller が inject)
- language を厳守`;

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

  const result = await callDifyJson<{ subject: string; body: string; key_points: string[] }>(
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

  // Slack で営業担当に承認待ち通知 (Phase 4-A: 承認 → 手動コピペでメール送信)
  const { subject, body: salesBody, key_points } = result.outputs;
  const slackRes = await postToSlack({
    text: `📨 Stage 2 営業資料生成完了 — ${lead.company_name}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `📨 Stage 2 営業資料準備完了 — ${lead.company_name}` } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Run ID*\n\`${runId}\`` },
          { type: "mrkdwn", text: `*Stage 1 reaction*\n${ctaClickedAt ?? "force=true"}` },
          { type: "mrkdwn", text: `*Domain*\n${lead.domain ?? "—"}` },
        ],
      },
      { type: "section", text: { type: "mrkdwn", text: `*主要訴求*\n${(key_points ?? []).map((p, i) => `${i + 1}. ${p}`).join("\n")}` } },
      { type: "section", text: { type: "mrkdwn", text: `*件名*\n${subject}` } },
      { type: "section", text: { type: "mrkdwn", text: `*本文*\n\`\`\`${salesBody.slice(0, 2500)}\`\`\`` } },
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

  // 簡易記録: lead.meta.stage2_material_generated_at + content
  const newMeta = {
    ...(lead.meta ?? {}),
    stage2_material_generated_at: new Date().toISOString(),
    stage2_material_subject: subject,
    stage2_material_body: salesBody,
    stage2_material_key_points: key_points,
    stage2_slack_thread_ts: slackRes.threadTs,
  };
  await sb.from("leads").update({ meta: newMeta }).eq("id", lead.id);

  return NextResponse.json({
    ok: true,
    run_id: runId,
    subject, body: salesBody, key_points,
    slack_posted: slackRes.ok,
  });
}

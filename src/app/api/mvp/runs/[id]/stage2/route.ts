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
import { withPersonaPrefix } from "@/lib/mvp/persona-injection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const BodySchema = z.object({
  force: z.boolean().optional(), // CTA click 無くても trigger (営業担当の手動判断)
});

const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";

/**
 * Stage 2 system prompt — language-aware (Phase 7 i18n 拡張).
 * 設計原則: prompt 自体は英語ベースで「あなたが LLM として、lead.language で出力する」と instruct.
 * これにより 12 言語に渡って同じ prompt 構造を維持・cache key 安定 + 出力言語切替.
 */
const STAGE2_SYSTEM_PROMPT = `\
You are a senior sales writer at Paradigm LLC.

Your task: generate the **2nd form-submission message** + an **internal sales brief** for leads who reacted to the Stage 1 diagnostic report.

**CRITICAL CONSTRAINTS**:
- Output language MUST match user_payload.language (ja/en/ko/zh/de/es/pt/ru/ar/vi/id/fr).
- We are NOT sending email — this is a 2nd form submission. The "subject" field is for form subject inputs only.
- Position: B2B 経営層向け診断医トーン (calm advisor, NOT childish-doctor-cosplay). NO direct sales intent.
- Reference the Stage 1 report findings — lead-specific, not generic.

Input user_payload schema:
{
  "company_name": string,
  "domain": string,
  "region": string,
  "language": "ja"|"en"|"ko"|"zh"|"de"|"es"|"pt"|"ru"|"ar"|"vi"|"id"|"fr",
  "unified_profile": object,
  "stage1_top_pain_summary": string,
  "stage1_report_url": string,
  "cal_com_url": string
}

Output (STRICT JSON, no prose / markdown):
{
  "subject": string,             // 30-60 chars in target language. Curiosity gap. e.g. ja: 「貴社診断結果のご確認・継続モニタリングのご提案」
  "body": string,                // 400-800 chars in target language. Reference Stage 1 findings + propose specific next step + Cal.com link.
  "key_points": [string,string,string],  // 3 selling points in target language (Slack admin display)
  "next_action_hint": string     // 1-2 sentences in JAPANESE (internal admin guidance — not customer-facing)
}

Style guide per language (calm B2B advisor — NOT childish doctor-cosplay):
- ja: 落ち着いた診断医トーン・敬語・「拝見」「ご確認」「継続モニタリング」「分析の結果」
- en: senior advisor tone, "follow-up review", "ongoing observation", NO "checkup" / "doctor" / "prescription"
- ko: 시니어 어드바이저 어조, 정중한 어조, "후속 검토", "지속 모니터링"
- zh: 资深顾问语气、礼貌专业、"跟进复盘"、"持续监测"
- de: höflich-professionell, "Folge-Review", "kontinuierliches Monitoring"
- ar: rtl-aware, professional senior advisor tone
- 他: target language の B2B シニアアドバイザー口調

🚨 BANNED VOCABULARY (childish / おままごと印象):
- ja: 「主訴」「処方箋」「経過観察」「お薬」「治療」「症状」 → 全て大人語彙に差し替え
  ✅ 推奨: 「主要観察項目」「推奨対応」「継続モニタリング」「アクションプラン」「兆候」「改善施策」
- en: "prescription", "your doctor", "checkup", "treatment", "symptom" → use "recommended action", "advisor", "review", "improvement", "indicator"

DO NOT include:
- Sales pitch language ("Buy now", "Limited offer")
- Aggressive CTAs
- Generic templates (must reference stage1_top_pain_summary specifically)
- Childish medical-cosplay vocabulary (主訴・処方箋・経過観察 等)`;

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

  // B36-P7B: Persona-as-Data injection (paradigm-advisor-{locale} from paradigm_personas).
  // base system_prompt 冒頭に persona payload を prepend して B2B 大人語彙を構造的に強制.
  const systemWithPersona = await withPersonaPrefix(
    sb,
    lead.language ?? "ja",
    STAGE2_SYSTEM_PROMPT,
  );

  const result = await callDifyJson<{ subject: string; body: string; key_points: string[]; next_action_hint?: string }>(
    "karteToSalesMaterial",
    systemWithPersona,
    {
      company_name: lead.company_name,
      domain: lead.domain,
      region: lead.region,
      language: lead.language ?? "ja",
      unified_profile: profile,
      stage1_top_pain_summary: top_pain_summary,
      stage1_report_url: run.report_canonical_url ?? "",
      cal_com_url: process.env.CAL_COM_URL ?? `${PARADIGMJP_BASE}/${lead.language ?? "ja"}/contact`,
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

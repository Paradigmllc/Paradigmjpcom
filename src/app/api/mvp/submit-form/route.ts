/**
 * POST /api/mvp/submit-form — production grade.
 *
 * Critical fixes vs P2:
 *   B-fix: caller-side mustache pre-substitute → LLM は文体磨きのみ
 *   Legal: footer (送信者情報 + opt-out URL + プライバシー URL) 強制 inject
 *   C-fix: violation detector に confidence + categories 構造化判定
 *   Eligibility: 大企業/反社/cooling/blocklist/time/quota 8 軸 gate (skip 可)
 *   Tracking: report_url を tracked redirect に置換 (CTR 計測)
 *   Dry-run: dry_run_recipient へ stdout (実 form は叩かない)
 *   Cost guard: per-run quota increment + auto-pause respect
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { callDifyJson } from "@/lib/mvp/dify";
import { SYSTEM_PROMPT_FORM_MESSAGE_GENERATOR_POLISH, SYSTEM_PROMPT_FORM_VIOLATION_DETECTOR } from "@/lib/mvp/dify-prompts";
import { pickFormMessageTemplate, isValidRegion, isValidLanguage, type Language, type SalesRegion } from "@/lib/mvp/pick-template";
import { postToSlack, buildViolationApprovalBlocks } from "@/lib/mvp/slack";
import { requireMvpSecret } from "@/lib/mvp/auth";
import { renderTemplate, appendLegalFooter } from "@/lib/mvp/template-engine";
import { checkEligibility } from "@/lib/mvp/eligibility";
import { incrementQuota } from "@/lib/mvp/cost-guard";
import { makeOptoutToken, buildTrackedUrl } from "@/lib/mvp/tracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const BodySchema = z.object({ run_id: z.string().uuid(), skip_eligibility: z.boolean().optional() });

const N8N_PLAYWRIGHT_WEBHOOK = process.env.N8N_PLAYWRIGHT_FORM_WEBHOOK ?? "https://n8n.appexx.me/webhook/form-outreach";
const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";
const SENDER_NAME = process.env.PARADIGM_SENDER_NAME ?? "Paradigm 合同会社";
const SENDER_ADDRESS = process.env.PARADIGM_SENDER_ADDRESS ?? "東京都新宿区";
const VIOLATION_NG_THRESHOLD = parseFloat(process.env.MVP_VIOLATION_NG_THRESHOLD ?? "0.6");

export async function POST(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  let body: z.infer<typeof BodySchema>;
  try { body = BodySchema.parse(await req.json()); } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "invalid body" }, { status: 400 });
  }

  const { data: run, error: runErr } = await sb.from("mvp_outreach_runs").select("*").eq("id", body.run_id).maybeSingle();
  if (runErr || !run) return NextResponse.json({ ok: false, error: `run not found: ${body.run_id}` }, { status: 404 });
  if (run.status !== "report_ready") return NextResponse.json({ ok: false, error: `run status invalid: ${run.status}` }, { status: 409 });
  if (!run.report_canonical_url) return NextResponse.json({ ok: false, error: "report_canonical_url missing" }, { status: 400 });

  const { data: lead, error: leadErr } = await sb.from("leads")
    .select("id, company_name, domain, region, language, country_code, contact_form_url, meta")
    .eq("id", run.lead_id).maybeSingle();
  if (leadErr || !lead) return NextResponse.json({ ok: false, error: `lead not found: ${run.lead_id}` }, { status: 404 });

  // Eligibility re-check (form submission 時も再評価・state may have changed since report_ready)
  if (!body.skip_eligibility && !run.is_dry_run) {
    const elig = await checkEligibility(sb, lead, { isDryRun: false });
    if (elig.verdict === "block") {
      await markSkipped(run.id, "eligibility_block", JSON.stringify(elig.reasons));
      return NextResponse.json({ ok: false, skipped: true, reasons: elig.reasons }, { status: 200 });
    }
  }

  if (!run.is_dry_run && !lead.contact_form_url) {
    await markFailed(run.id, "failed_form_url", "lead.contact_form_url missing");
    return NextResponse.json({ ok: false, error: "contact_form_url missing" }, { status: 400 });
  }

  const region = run.region as SalesRegion;
  const language = run.language as Language;
  if (!isValidRegion(region) || !isValidLanguage(language)) {
    return NextResponse.json({ ok: false, error: "invalid region/language" }, { status: 400 });
  }

  await sb.from("mvp_outreach_runs").update({
    status: "form_message_generating", step: "pick_template",
    step_started_at: new Date().toISOString(), form_url: lead.contact_form_url,
  }).eq("id", run.id);

  const template = await pickFormMessageTemplate(sb, {
    region, language,
    industrySlug: (lead.meta?.industry_slug as string | undefined) ?? "default",
    variant: "a",
  });
  if (!template) {
    await markFailed(run.id, "failed_violation", `no template for region=${region} language=${language}`);
    return NextResponse.json({ ok: false, error: "no template" }, { status: 404 });
  }

  // ─── B-fix: deterministic placeholder substitution (mustache) ───
  const optoutToken = makeOptoutToken();
  await sb.from("mvp_optout_tokens").insert({
    token: optoutToken,
    entity_id: run.entity_id,
    lead_id: lead.id,
    domain: lead.domain ?? null,
  });
  const optoutUrl = `${PARADIGMJP_BASE}/api/mvp/track/optout/${optoutToken}`;
  const trackedReportUrl = buildTrackedUrl(PARADIGMJP_BASE, run.id, lead.id, "cta", run.report_canonical_url);
  const profile = (lead.meta?.unified_profile as Record<string, unknown> | undefined) ?? {};
  const top_pain_summary = (profile.top_pain_summary as string | undefined) ?? "";

  const subjectVars = {
    company_name: lead.company_name ?? "",
    lead_domain: lead.domain ?? "",
    report_url: trackedReportUrl,
    top_pain_summary,
  };
  const subjectRendered = template.subject_template ? renderTemplate(template.subject_template, subjectVars).rendered : null;
  const bodyRendered = renderTemplate(template.body_template, subjectVars);

  if (bodyRendered.missingKeys.length > 0) {
    await markFailed(run.id, "failed_violation", `missing template vars: ${bodyRendered.missingKeys.join(",")}`);
    return NextResponse.json({ ok: false, error: "missing template vars" }, { status: 500 });
  }

  // LLM 校閲のみ (文体磨き・敬語チェック・字数調整) — placeholder substitution はもう完了済
  const polishResult = await callDifyJson<{ subject?: string; body: string }>(
    "formMessageGenerator",
    SYSTEM_PROMPT_FORM_MESSAGE_GENERATOR_POLISH,
    {
      pre_rendered_body: bodyRendered.rendered,
      pre_rendered_subject: subjectRendered ?? "",
      company_name: lead.company_name,
      lead_domain: lead.domain,
      region, language,
    },
  );
  // graceful fallback: LLM 失敗時は pre_rendered そのまま使う (法務 footer は必ず付加)
  const polishedBody = polishResult.ok && polishResult.outputs?.body ? polishResult.outputs.body : bodyRendered.rendered;
  const polishedSubject = polishResult.ok && polishResult.outputs?.subject ? polishResult.outputs.subject : subjectRendered;

  // 法務 footer 強制 inject (送信者情報 + opt-out + privacy)
  const messageBody = appendLegalFooter(polishedBody, {
    senderName: SENDER_NAME,
    senderAddress: SENDER_ADDRESS,
    optoutUrl,
    privacyUrl: `${PARADIGMJP_BASE}/${language}/privacy`,
    language,
  });

  await sb.from("mvp_outreach_runs").update({
    form_message_body: messageBody, status: "form_violation_check", step: "violation_detect",
  }).eq("id", run.id);

  // ─── C-fix lite: violation detector with confidence + categories ───
  const violation = await callDifyJson<{
    verdict: "ok" | "ng";
    confidence: number;
    categories?: string[];
    reason?: string;
  }>("formViolationDetector", SYSTEM_PROMPT_FORM_VIOLATION_DETECTOR, {
    body: messageBody,
    form_url: lead.contact_form_url ?? "",
    company_name: lead.company_name,
    language,
  });

  const verdict = violation.outputs?.verdict ?? "ng";
  const confidence = Number(violation.outputs?.confidence ?? 0);
  const categories = violation.outputs?.categories ?? [];
  const reason = violation.outputs?.reason ?? violation.errorMessage ?? "no verdict";

  // Slack escalate のしきい値: ng AND confidence >= threshold (低 confidence は ok 扱いで Slack 飽和回避)
  const needsHumanReview = verdict === "ng" && confidence >= VIOLATION_NG_THRESHOLD;
  if (needsHumanReview && !run.is_dry_run) {
    const slackRes = await postToSlack({
      text: `🟡 規約違反疑い (conf=${confidence}) — run ${run.id}`,
      blocks: buildViolationApprovalBlocks({
        runId: run.id, leadId: lead.id, companyName: lead.company_name ?? lead.id,
        formUrl: lead.contact_form_url ?? "", body: messageBody,
        violationReason: `${reason} (categories: ${categories.join(",")} / conf=${confidence})`,
      }),
    });
    await sb.from("mvp_outreach_runs").update({
      status: "form_pending_approval", step: "awaiting_slack_approval",
      form_violation_verdict: "ng", form_violation_reason: reason,
      violation_confidence: confidence, violation_categories: categories,
      slack_thread_ts: slackRes.threadTs ?? null,
    }).eq("id", run.id);
    return NextResponse.json({ ok: true, run_id: run.id, next: "awaiting_slack_approval", confidence });
  }

  // OK or low-confidence ng → submit
  await sb.from("mvp_outreach_runs").update({
    status: "form_submitting", step: "playwright_dispatch",
    form_violation_verdict: "ok", violation_confidence: confidence, violation_categories: categories,
    form_submit_started_at: new Date().toISOString(),
  }).eq("id", run.id);

  // Dry-run: 実フォームは叩かず Slack に内容投影のみ
  if (run.is_dry_run) {
    await postToSlack({
      text: `📝 [DRY-RUN] ${run.dry_run_recipient ?? "no-recipient"} 宛 prepared body (lead=${lead.company_name})\n\`\`\`${messageBody.slice(0, 2500)}\`\`\``,
    });
    await sb.from("mvp_outreach_runs").update({
      status: "sent", step: "dry_run_complete",
      form_submit_completed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      pickup_locked_at: null,
    }).eq("id", run.id);
    return NextResponse.json({ ok: true, run_id: run.id, next: "dry_run_complete" });
  }

  // Real submit via n8n form-outreach webhook
  const callbackUrl = `${PARADIGMJP_BASE}/api/mvp/webhook/slack-action?evt=playwright_callback&run_id=${run.id}&secret=${encodeURIComponent(process.env.MVP_API_SECRET ?? "")}`;
  const dispatchRes = await fetch(N8N_PLAYWRIGHT_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_id: run.id, campaign_id: run.campaign_id ?? "mvp-b36",
      lead_id: lead.id, company_name: lead.company_name,
      form_url: lead.contact_form_url, body: messageBody,
      subject: polishedSubject ?? null,
      callback_url: callbackUrl,
    }),
  });
  if (!dispatchRes.ok) {
    const errText = await dispatchRes.text().catch(() => "");
    await markFailed(run.id, "failed_submit", `n8n dispatch ${dispatchRes.status}: ${errText}`);
    return NextResponse.json({ ok: false, error: errText }, { status: 502 });
  }

  // cost increment (LLM 校閲 + violation detect)
  await incrementQuota(sb, "global", "all", "llm_cost_jpy", 0.03);
  await incrementQuota(sb, "global", "all", "playwright_dispatch", 1);
  await incrementQuota(sb, "region", region, "send_count", 1);

  return NextResponse.json({ ok: true, run_id: run.id, next: "playwright_dispatched" });
}

async function markFailed(runId: string, status: string, errorMessage: string): Promise<void> {
  const sb = getMvpSupabase();
  const { data: cur } = await sb.from("mvp_outreach_runs").select("error_log").eq("id", runId).maybeSingle();
  const errLog = Array.isArray(cur?.error_log) ? cur.error_log : [];
  errLog.push({ step: status, error: errorMessage, ts: new Date().toISOString() });
  await sb.from("mvp_outreach_runs").update({
    status, error_log: errLog, step_completed_at: new Date().toISOString(), pickup_locked_at: null,
  }).eq("id", runId);
}
async function markSkipped(runId: string, step: string, reason: string): Promise<void> {
  const sb = getMvpSupabase();
  const { data: cur } = await sb.from("mvp_outreach_runs").select("error_log").eq("id", runId).maybeSingle();
  const errLog = Array.isArray(cur?.error_log) ? cur.error_log : [];
  errLog.push({ step, error: reason, ts: new Date().toISOString() });
  await sb.from("mvp_outreach_runs").update({
    status: "skipped", step, error_log: errLog,
    completed_at: new Date().toISOString(), pickup_locked_at: null,
  }).eq("id", runId);
}

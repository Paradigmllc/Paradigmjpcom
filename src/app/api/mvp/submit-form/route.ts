/**
 * POST /api/mvp/submit-form
 * n8n が叩く. report_ready の lead を Dify form-message-generator → form-violation-detector → Playwright submit.
 *
 * 永久ルール準拠:
 *   B33 #17 STRICT_LANGUAGE_GUARD (form_message_templates 経由)
 *   B28 #11 customer-facing は Dify 必須
 *   B36 #19 cross-domain: Playwright trigger は既存 n8n form-outreach webhook を再利用
 *   AE-5  Zod boundary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { callDify } from "@/lib/mvp/dify";
import { pickFormMessageTemplate, isValidRegion, isValidLanguage, type Language, type SalesRegion } from "@/lib/mvp/pick-template";
import { postToSlack, buildViolationApprovalBlocks } from "@/lib/mvp/slack";
import { requireMvpSecret } from "@/lib/mvp/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const BodySchema = z.object({
  run_id: z.string().uuid(),
});

const N8N_PLAYWRIGHT_WEBHOOK = process.env.N8N_PLAYWRIGHT_FORM_WEBHOOK
  ?? "https://n8n.appexx.me/webhook/form-outreach";
const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";

export async function POST(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;
  const sb = getMvpSupabase();
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "invalid body" }, { status: 400 });
  }

  const { data: run, error: runErr } = await sb
    .from("mvp_outreach_runs")
    .select("*")
    .eq("id", body.run_id)
    .maybeSingle();
  if (runErr || !run) {
    return NextResponse.json({ ok: false, error: `run not found: ${body.run_id}` }, { status: 404 });
  }
  if (run.status !== "report_ready") {
    return NextResponse.json({ ok: false, error: `run status invalid: ${run.status}` }, { status: 409 });
  }
  if (!run.report_canonical_url) {
    return NextResponse.json({ ok: false, error: "report_canonical_url missing" }, { status: 400 });
  }

  const { data: lead, error: leadErr } = await sb
    .from("leads")
    .select("id, company_name, domain, contact_form_url, meta")
    .eq("id", run.lead_id)
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: `lead not found: ${run.lead_id}` }, { status: 404 });
  }
  if (!lead.contact_form_url) {
    await markFailed(run.id, "failed_form_url", "lead.contact_form_url missing");
    return NextResponse.json({ ok: false, error: "contact_form_url missing" }, { status: 400 });
  }

  const region = run.region as SalesRegion;
  const language = run.language as Language;
  if (!isValidRegion(region) || !isValidLanguage(language)) {
    return NextResponse.json({ ok: false, error: "invalid region/language" }, { status: 400 });
  }

  await sb.from("mvp_outreach_runs").update({
    status: "form_message_generating",
    step: "pick_template",
    step_started_at: new Date().toISOString(),
    form_url: lead.contact_form_url,
  }).eq("id", run.id);

  const template = await pickFormMessageTemplate(sb, {
    region,
    language,
    industrySlug: lead.meta?.industry_slug ?? "default",
    variant: "a",
  });
  if (!template) {
    await markFailed(run.id, "failed_violation", `no template for region=${region} language=${language}`);
    return NextResponse.json({ ok: false, error: "no template" }, { status: 404 });
  }

  const msgGen = await callDify<{ subject?: string; body: string }>("formMessageGenerator", {
    template_id: template.id,
    template_body: template.body_template,
    template_subject: template.subject_template ?? "",
    template_cta: template.cta_phrase ?? "",
    company_name: lead.company_name,
    lead_domain: lead.domain,
    report_url: run.report_canonical_url,
    region,
    language,
    top_pain_summary: lead.meta?.unified_profile?.top_pain_summary ?? "",
  });
  if (!msgGen.ok || !msgGen.outputs?.body) {
    await markFailed(run.id, "failed_violation", `form-message-gen: ${msgGen.errorMessage ?? "no body"}`);
    return NextResponse.json({ ok: false, error: msgGen.errorMessage ?? "no body" }, { status: 500 });
  }
  const messageBody = msgGen.outputs.body;

  await sb.from("mvp_outreach_runs").update({
    form_message_body: messageBody,
    status: "form_violation_check",
    step: "violation_detect",
  }).eq("id", run.id);

  const violation = await callDify<{ verdict: "ok" | "ng"; reason?: string }>("formViolationDetector", {
    body: messageBody,
    form_url: lead.contact_form_url,
    company_name: lead.company_name,
    language,
  });
  const verdict = violation.outputs?.verdict ?? "ng";
  const reason = violation.outputs?.reason ?? violation.errorMessage ?? "no verdict";

  if (verdict === "ng") {
    const slackRes = await postToSlack({
      text: `🟡 規約違反疑い — run ${run.id}`,
      blocks: buildViolationApprovalBlocks({
        runId: run.id,
        leadId: lead.id,
        companyName: lead.company_name ?? lead.id,
        formUrl: lead.contact_form_url,
        body: messageBody,
        violationReason: reason,
      }),
    });
    await sb.from("mvp_outreach_runs").update({
      status: "form_pending_approval",
      step: "awaiting_slack_approval",
      form_violation_verdict: "ng",
      form_violation_reason: reason,
      slack_thread_ts: slackRes.threadTs ?? null,
    }).eq("id", run.id);
    return NextResponse.json({
      ok: true,
      run_id: run.id,
      next: "awaiting_slack_approval",
      slack_thread_ts: slackRes.threadTs,
    });
  }

  await sb.from("mvp_outreach_runs").update({
    status: "form_submitting",
    step: "playwright_dispatch",
    form_violation_verdict: "ok",
    form_submit_started_at: new Date().toISOString(),
  }).eq("id", run.id);

  const callbackUrl = `${PARADIGMJP_BASE}/api/mvp/webhook/slack-action?evt=playwright_callback&run_id=${run.id}&secret=${encodeURIComponent(process.env.MVP_API_SECRET ?? "")}`;
  const dispatchRes = await fetch(N8N_PLAYWRIGHT_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_id: run.id,
      campaign_id: "mvp-b36",
      lead_id: lead.id,
      company_name: lead.company_name,
      form_url: lead.contact_form_url,
      body: messageBody,
      callback_url: callbackUrl,
    }),
  });
  if (!dispatchRes.ok) {
    const errText = await dispatchRes.text().catch(() => "");
    await markFailed(run.id, "failed_submit", `n8n dispatch ${dispatchRes.status}: ${errText}`);
    return NextResponse.json({ ok: false, error: errText }, { status: 502 });
  }

  return NextResponse.json({ ok: true, run_id: run.id, next: "playwright_dispatched" });
}

async function markFailed(runId: string, status: string, errorMessage: string): Promise<void> {
  const sb = getMvpSupabase();
  const { data: cur } = await sb.from("mvp_outreach_runs").select("error_log").eq("id", runId).maybeSingle();
  const errLog = Array.isArray(cur?.error_log) ? cur.error_log : [];
  errLog.push({ step: status, error: errorMessage, ts: new Date().toISOString() });
  await sb.from("mvp_outreach_runs").update({
    status,
    error_log: errLog,
    step_completed_at: new Date().toISOString(),
  }).eq("id", runId);
}

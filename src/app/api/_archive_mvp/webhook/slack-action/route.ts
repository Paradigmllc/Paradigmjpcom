/**
 * POST /api/mvp/webhook/slack-action
 * 2 つの口を兼ねる:
 *   ① Slack interactivity (Block Kit ボタン: approve_send / skip_send)
 *   ② Playwright callback from n8n (?evt=playwright_callback&run_id=xxx)
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { postToSlack, buildAlertBlocks } from "@/lib/mvp/slack";
import { requireMvpSecret, verifySlackSignature } from "@/lib/mvp/auth";
import { LEAD_SELECT_COLUMNS, normalizeLead } from "@/lib/mvp/lead-adapter";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const evt = url.searchParams.get("evt");

  if (evt === "playwright_callback") {
    const denied = requireMvpSecret(req);
    if (denied) return denied;
    return handlePlaywrightCallback(req, url);
  }

  // Slack interactivity: TODO — add Slack signing secret verification.
  // 暫定: action.value (runId) が DB lookup で hit しない限り何もしない.
  return handleSlackInteractivity(req);
}

async function handlePlaywrightCallback(req: Request, url: URL): Promise<Response> {
  const sb = getMvpSupabase();
  const runId = url.searchParams.get("run_id");
  if (!runId) return NextResponse.json({ ok: false, error: "run_id missing" }, { status: 400 });

  const payload = (await req.json().catch(() => ({}))) as {
    success?: boolean;
    classification?: "succeeded" | "uncertain" | "failed";
    pre_screenshot_url?: string;
    post_screenshot_url?: string;
    response_html_url?: string;
    error?: string;
  };

  const cls = payload.classification ?? (payload.success ? "succeeded" : "failed");
  const newStatus =
    cls === "succeeded" ? "sent" :
    cls === "uncertain" ? "sent" :
    "failed_submit";

  await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({
    status: newStatus,
    step: "playwright_callback",
    step_completed_at: new Date().toISOString(),
    form_submit_completed_at: new Date().toISOString(),
    form_submit_response: payload as never,
    form_pre_screenshot_url: payload.pre_screenshot_url ?? null,
    form_post_screenshot_url: payload.post_screenshot_url ?? null,
    completed_at: newStatus === "sent" ? new Date().toISOString() : null,
  }).eq("id", runId);

  if (newStatus === "failed_submit") {
    const { data: cur } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).select("retry_count, max_retry").eq("id", runId).maybeSingle();
    const retry = cur?.retry_count ?? 0;
    const maxRetry = cur?.max_retry ?? 3;
    if (retry >= maxRetry) {
      await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({ status: "dead_letter" }).eq("id", runId);
      await postToSlack({
        text: "🔴 dead letter",
        blocks: buildAlertBlocks({
          level: "🔴",
          kind: "dead_letter",
          title: `dead letter — run ${runId}`,
          fields: [
            { label: "Error", value: payload.error ?? "unknown" },
            { label: "Retry", value: `${retry}/${maxRetry}` },
          ],
        }),
      });
    } else {
      const nextRetryAt = new Date(Date.now() + Math.min(5 * 60_000 * 2 ** retry, 3 * 3600_000)).toISOString();
      await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({
        status: "queued",
        retry_count: retry + 1,
        next_retry_at: nextRetryAt,
      }).eq("id", runId);
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleSlackInteractivity(req: Request): Promise<Response> {
  const sb = getMvpSupabase();
  const ct = req.headers.get("content-type") ?? "";
  let payload: Record<string, unknown> = {};

  // Slack interactivity raw body 取得 (signature 検証で必要)
  const rawBody = await req.clone().text();
  // Slack signing secret verification (Phase 4)
  const slackVerify = await verifySlackSignature(req, rawBody);
  if (!slackVerify.ok) {
    return NextResponse.json({ ok: false, error: `slack signature invalid: ${slackVerify.error}` }, { status: 401 });
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    const raw = params.get("payload");
    if (typeof raw === "string") {
      try { payload = JSON.parse(raw); } catch { /* ignore */ }
    }
  } else if (ct.includes("application/json")) {
    try { payload = JSON.parse(rawBody) as Record<string, unknown>; } catch { /* ignore */ }
  }

  const actions = (payload.actions as Array<{ action_id: string; value: string }> | undefined) ?? [];
  if (actions.length === 0) {
    return NextResponse.json({ ok: false, error: "no actions" }, { status: 400 });
  }
  const action = actions[0];
  const runId = action.value;
  const actionId = action.action_id;

  const { data: run } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).select("*").eq("id", runId).maybeSingle();
  if (!run) return NextResponse.json({ ok: false, error: "run not found" }, { status: 404 });
  if (run.status !== "form_pending_approval") {
    return NextResponse.json({ ok: false, error: `invalid status: ${run.status}` }, { status: 409 });
  }

  if (actionId === "skip_send") {
    await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({
      status: "skipped",
      step: "skip_by_slack",
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    return NextResponse.json({ ok: true, response_action: "update", text: "⏭ skip 確定" });
  }

  if (actionId === "approve_send") {
    await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({
      status: "form_submitting",
      form_violation_verdict: "approved_after_review",
      step: "playwright_dispatch_after_approval",
    }).eq("id", runId);

    // B36-AUDIT FIX #2: lead schema uses business_name/website_url, not company_name/domain.
    // Use normalizeLead() canonical adapter (LEAD_SELECT_COLUMNS) to avoid schema drift.
    const { data: leadRaw } = await sb.from(DB_TABLES.LEADS).select(LEAD_SELECT_COLUMNS).eq("id", run.lead_id).maybeSingle();
    const lead = normalizeLead(leadRaw);
    if (!lead?.contact_form_url) {
      return NextResponse.json({ ok: false, error: "lead form_url missing" }, { status: 400 });
    }

    const callbackUrl = `${process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com"}/api/mvp/webhook/slack-action?evt=playwright_callback&run_id=${runId}&secret=${encodeURIComponent(process.env.MVP_API_SECRET ?? "")}`;
    // B36-AUDIT FIX #5: error check on n8n dispatch (silent stuck-at-form_submitting prevention)
    let dispatchOk = true; let dispatchErr = "";
    try {
      const res = await fetch(process.env.N8N_PLAYWRIGHT_FORM_WEBHOOK ?? "https://n8n.appexx.me/webhook/form-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: runId,
          campaign_id: "mvp-b36",
          lead_id: lead.id,
          company_name: lead.company_name,
          form_url: lead.contact_form_url,
          body: run.form_message_body,
          callback_url: callbackUrl,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) { dispatchOk = false; dispatchErr = `n8n HTTP ${res.status}`; }
    } catch (e) {
      dispatchOk = false; dispatchErr = e instanceof Error ? e.message : String(e);
    }
    if (!dispatchOk) {
      // フォールバック: 失敗時は status を failed_submit にして再 retry 可能化 (CLAUDE.md s10-1 障害対応)
      const { data: cur } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).select("error_log").eq("id", runId).maybeSingle();
      const errLog = Array.isArray(cur?.error_log) ? cur.error_log : [];
      errLog.push({ step: "playwright_dispatch_after_approval", error: dispatchErr, ts: new Date().toISOString() });
      await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({
        status: "failed_submit", error_log: errLog, step_completed_at: new Date().toISOString(),
      }).eq("id", runId);
      return NextResponse.json({ ok: false, response_action: "update", text: `❌ 送信失敗: ${dispatchErr}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, response_action: "update", text: "✅ 承認・送信開始" });
  }

  return NextResponse.json({ ok: false, error: `unknown action: ${actionId}` }, { status: 400 });
}

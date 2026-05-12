/**
 * GET /api/mvp/cron-pickup?step=report|form
 * Production grade: RPC pickup_mvp_runs (FOR UPDATE SKIP LOCKED) で重複 pickup 根治.
 *
 * step=report: enrichment 完了 lead を pickup → mvp_outreach_runs INSERT (queued)
 *              plus 既存 queued / failed_X / retry-window 超過 runs を pickup
 * step=form:   report_ready 状態の runs を pickup
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpSecret } from "@/lib/mvp/auth";
import { isPaused } from "@/lib/mvp/cost-guard";
import { regionToPrimaryLanguage, isValidRegion, type SalesRegion } from "@/lib/mvp/pick-template";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PICKUP_LIMIT = parseInt(process.env.MVP_PICKUP_LIMIT ?? "50", 10);
const LEASE_SECONDS = parseInt(process.env.MVP_PICKUP_LEASE_SECONDS ?? "300", 10);

export async function GET(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  const url = new URL(req.url);
  const step = url.searchParams.get("step") ?? "report";
  const region = url.searchParams.get("region");
  const workerId = url.searchParams.get("worker") ?? "cron";

  // Global pause respect
  const paused = await isPaused(sb, "global", "all");
  if (paused.paused) {
    return NextResponse.json({ ok: true, picked: [], paused: true, reason: paused.reason });
  }

  if (step === "report") {
    return pickupForReport(sb, region, workerId);
  }
  if (step === "form") {
    return pickupForForm(sb, workerId);
  }
  return NextResponse.json({ ok: false, error: "step must be report|form" }, { status: 400 });
}

async function pickupForReport(sb: ReturnType<typeof getMvpSupabase>, region: string | null, workerId: string): Promise<Response> {
  // ① enrichment 完了で MVP run 未生成の lead を新規 pickup → INSERT (status=queued)
  // 注意: leads schema は language 列なし → meta.language or region から派生
  let q = sb
    .from("leads")
    .select("id, region, meta")
    .eq("meta->>enrichment_complete", "true")
    .not("contact_form_url", "is", null);
  if (region) q = q.eq("region", region);
  q = q.limit(PICKUP_LIMIT * 2);

  const { data: leads, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const filteredIds = await filterAlreadyHasActiveRun(sb, (leads ?? []).map((l) => l.id));
  const newLeads = (leads ?? []).filter((l) => filteredIds.includes(l.id)).slice(0, PICKUP_LIMIT);

  const enqueued: string[] = [];
  for (const lead of newLeads) {
    const region = (lead.region ?? "ja") as string;
    const meta = (lead.meta ?? {}) as Record<string, unknown>;
    // B36-AUDIT FIX #4: language fallback was returning region literal (europe/sea/africa/others)
    // which fails VALID_LANGUAGES gate downstream. Use regionToPrimaryLanguage canonical mapping.
    const metaLang = meta.language as string | undefined;
    const language = metaLang
      ?? (isValidRegion(region) ? regionToPrimaryLanguage(region as SalesRegion) : "ja");
    const { error: insErr } = await sb.from("mvp_outreach_runs").insert({
      lead_id: lead.id,
      region, language,
      status: "queued",
      step: "auto_enqueue",
      triggered_by: "cron",
    });
    if (!insErr) enqueued.push(lead.id);
  }

  // ② 既存 queued (新規 + retry) を RPC で pickup
  const { data: picked } = await sb.rpc("pickup_mvp_runs", {
    p_target_status: "queued", p_limit: PICKUP_LIMIT, p_worker_id: workerId, p_lease_seconds: LEASE_SECONDS,
  });
  const pickedRows = (picked ?? []) as Array<{ run_id: string; lead_id: string; region: string; language: string; priority: string; is_dry_run: boolean }>;

  return NextResponse.json({
    ok: true,
    enqueued: enqueued.length,
    picked: pickedRows.map((r) => ({ run_id: r.run_id, lead_id: r.lead_id })),
  });
}

async function pickupForForm(sb: ReturnType<typeof getMvpSupabase>, workerId: string): Promise<Response> {
  const { data: picked } = await sb.rpc("pickup_mvp_runs", {
    p_target_status: "report_ready", p_limit: PICKUP_LIMIT, p_worker_id: workerId, p_lease_seconds: LEASE_SECONDS,
  });
  const pickedRows = (picked ?? []) as Array<{ run_id: string }>;
  return NextResponse.json({ ok: true, picked: pickedRows.map((r) => r.run_id) });
}

async function filterAlreadyHasActiveRun(sb: ReturnType<typeof getMvpSupabase>, leadIds: string[]): Promise<string[]> {
  if (leadIds.length === 0) return [];
  const { data: existing } = await sb
    .from("mvp_outreach_runs")
    .select("lead_id")
    .in("lead_id", leadIds)
    .not("status", "in", "(sent,replied,dead_letter,skipped)");
  const taken = new Set((existing ?? []).map((r) => r.lead_id));
  return leadIds.filter((id) => !taken.has(id));
}

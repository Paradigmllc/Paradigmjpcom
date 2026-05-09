/**
 * GET /api/mvp/cron-pickup?step=report|form
 * n8n cron が叩く. enrichment 完了 lead を自動 pickup して queue に投入 + 既存 queue を処理.
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpSecret } from "@/lib/mvp/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PICKUP_LIMIT = 50;

export async function GET(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;
  const sb = getMvpSupabase();
  const url = new URL(req.url);
  const step = url.searchParams.get("step") ?? "report";

  if (step === "report") {
    return pickupForReport(sb);
  }
  if (step === "form") {
    return pickupForForm(sb);
  }
  return NextResponse.json({ ok: false, error: "step must be report|form" }, { status: 400 });
}

async function pickupForReport(sb: ReturnType<typeof getMvpSupabase>): Promise<Response> {
  const fallback = await sb
    .from("leads")
    .select("id, region, language, meta")
    .eq("meta->>enrichment_complete", "true")
    .not("contact_form_url", "is", null)
    .limit(PICKUP_LIMIT);
  if (fallback.error) {
    return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
  }
  const picked = fallback.data ?? [];
  const filtered = await filterAlreadyHasActiveRun(sb, picked.map((l) => l.id));
  return NextResponse.json({ ok: true, picked: filtered });
}

async function pickupForForm(sb: ReturnType<typeof getMvpSupabase>): Promise<Response> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("mvp_outreach_runs")
    .select("id")
    .eq("status", "report_ready")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .limit(PICKUP_LIMIT);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, picked: (data ?? []).map((r) => r.id) });
}

async function filterAlreadyHasActiveRun(
  sb: ReturnType<typeof getMvpSupabase>,
  leadIds: string[]
): Promise<string[]> {
  if (leadIds.length === 0) return [];
  const { data: existing } = await sb
    .from("mvp_outreach_runs")
    .select("lead_id")
    .in("lead_id", leadIds)
    .not("status", "in", "(sent,replied,dead_letter,skipped)");
  const taken = new Set((existing ?? []).map((r) => r.lead_id));
  return leadIds.filter((id) => !taken.has(id));
}

/**
 * POST /api/mvp/runs/[id]/retry
 * dead_letter / failed_* runs を queued に戻して再投入.
 * UI から呼ばれる (Basic Auth gate 経由・X-MVP-Secret も accept).
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpUiAuth } from "@/lib/mvp/auth";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireMvpUiAuth(req);
  if (denied) return denied;
  const sb = getMvpSupabase();
  const { id } = await ctx.params;

  const { data: run, error } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).select("status, retry_count, max_retry").eq("id", id).maybeSingle();
  if (error || !run) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const allowedFromStatuses = ["dead_letter","failed_report","failed_form_url","failed_violation","failed_submit","skipped"];
  if (!allowedFromStatuses.includes(run.status)) {
    return NextResponse.json({ ok: false, error: `cannot retry from status=${run.status}` }, { status: 409 });
  }

  await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).update({
    status: "queued",
    step: "retry_enqueue",
    next_retry_at: null,
    pickup_locked_at: null,
    retry_count: (run.retry_count ?? 0) + 1,
    max_retry: (run.max_retry ?? 3) + 1, // 手動 retry は max を 1 増やす
  }).eq("id", id);

  return NextResponse.json({ ok: true, run_id: id, retry_count: (run.retry_count ?? 0) + 1 });
}

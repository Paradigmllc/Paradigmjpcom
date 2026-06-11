/**
 * GET /api/mvp/runs?region=ja&status=*&limit=50
 * 監視 UI が叩く list endpoint.
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpUiAuth } from "@/lib/mvp/auth";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireMvpUiAuth(req);
  if (denied) return denied;
  const sb = getMvpSupabase();
  const url = new URL(req.url);
  const region = url.searchParams.get("region");
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  let q = sb
    .from(DB_TABLES.MVP_OUTREACH_RUNS)
    .select("id, lead_id, region, language, status, step, template_id, report_canonical_url, report_http_status, retry_count, created_at, updated_at, completed_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (region) q = q.eq("region", region);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  return NextResponse.json({ ok: true, runs: data ?? [], counts });
}

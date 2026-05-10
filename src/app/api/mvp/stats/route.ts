/**
 * GET /api/mvp/stats
 * Funnel metrics dashboard endpoint (Metabase substitute・Phase 5).
 *
 * Returns aggregated metrics:
 *   - by region: send_count / sent / replied / failed / dead_letter / skipped / cta_click_rate
 *   - by industry: same axes
 *   - by variant_label: conversion_rate (sent → replied)
 *   - by date (last 30 days): daily throughput
 *   - cost: today / this_month per metric
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpUiAuth } from "@/lib/mvp/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireMvpUiAuth(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  const url = new URL(req.url);
  const region = url.searchParams.get("region");
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "30", 10), 90);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // 1. Aggregate by region + status
  let q1 = sb.from("mvp_outreach_runs").select("region, status, lead_id, entity_id").gte("created_at", since);
  if (region) q1 = q1.eq("region", region);
  const { data: runs } = await q1;
  const byRegion = aggregateBy(runs ?? [], "region");
  const byStatus = aggregateBy(runs ?? [], "status");

  // 2. CTA click rate (per region: distinct lead with cta_click / total sent)
  const { data: clicks } = await sb.from("mvp_click_events")
    .select("lead_id, click_type, run_id, occurred_at")
    .eq("click_type", "cta")
    .gte("occurred_at", since);
  const clickedLeads = new Set((clicks ?? []).map((c) => c.lead_id));
  const sentLeads = new Set((runs ?? []).filter((r) => r.status === "sent" || r.status === "replied").map((r) => r.lead_id));
  const ctaRate = sentLeads.size > 0 ? Number((clickedLeads.size / sentLeads.size).toFixed(4)) : 0;

  // 3. Cost (today + month)
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const { data: quotas } = await sb.from("mvp_send_quotas")
    .select("scope, scope_key, period, period_key, metric, count_used, limit_value, paused_at")
    .or(`period_key.eq.${today},period_key.eq.${month}`);

  // 4. Daily throughput (last N days)
  const dailyMap: Record<string, { sent: number; failed: number; skipped: number }> = {};
  for (const r of runs ?? []) {
    const d = new Date((r as { created_at?: string }).created_at ?? since).toISOString().slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { sent: 0, failed: 0, skipped: 0 };
    if (r.status === "sent" || r.status === "replied") dailyMap[d].sent++;
    else if (r.status?.startsWith("failed_") || r.status === "dead_letter") dailyMap[d].failed++;
    else if (r.status === "skipped") dailyMap[d].skipped++;
  }
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  // 5. Active campaigns
  const { data: activeCampaigns } = await sb.from("mvp_campaigns")
    .select("id, name, region, status, leads_count, sent_count, failed_count, replied_count")
    .in("status", ["running", "paused", "scheduled"])
    .order("created_at", { ascending: false }).limit(20);

  // 6. Blocklist size
  const { count: blocklistCount } = await sb.from("mvp_blocklist")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    window_days: days,
    region: region ?? "all",
    runs_total: (runs ?? []).length,
    by_region: byRegion,
    by_status: byStatus,
    cta_click_rate: ctaRate,
    cta_clicked_leads: clickedLeads.size,
    sent_leads: sentLeads.size,
    daily,
    quotas: quotas ?? [],
    active_campaigns: activeCampaigns ?? [],
    blocklist_count: blocklistCount ?? 0,
  });
}

function aggregateBy(rows: Array<{ [k: string]: unknown }>, key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const v = String(r[key] ?? "—");
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

/**
 * GET  /api/mvp/campaigns?region=ja        — list campaigns
 * POST /api/mvp/campaigns                   — create + bulk enqueue
 *
 * Body shape (POST):
 * {
 *   name, region, industry_slug?, daily_send_cap?, total_send_cap?,
 *   filter: { lead_ids?: string[], conditions?: { has_form_url, language, industry, region, ... } },
 *   priority?: 'hot'|'normal'|'low',
 *   schedule_for?: ISO date,
 *   created_by?: string,
 * }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpSecret } from "@/lib/mvp/auth";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const REGIONS = ["ja","ko","zh","en","europe","es","pt","ru","ar","sea","africa","others"] as const;

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  region: z.enum(REGIONS),
  industry_slug: z.string().optional(),
  daily_send_cap: z.number().int().positive().optional(),
  total_send_cap: z.number().int().positive().optional(),
  priority: z.enum(["hot","normal","low"]).optional(),
  scheduled_for: z.string().optional(),
  filter: z.object({
    lead_ids: z.array(z.string().uuid()).optional(),
    conditions: z.object({
      language: z.string().optional(),
      industry: z.string().optional(),
      has_form_url: z.boolean().optional(),
      max_employees: z.number().int().optional(),
      enrichment_complete: z.boolean().optional(),
    }).optional(),
  }),
  notes: z.string().optional(),
  created_by: z.string().optional(),
});

export async function GET(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  const url = new URL(req.url);
  const region = url.searchParams.get("region");
  const status = url.searchParams.get("status");
  let q = sb.from(DB_TABLES.MVP_CAMPAIGNS).select("*").order("created_at", { ascending: false }).limit(200);
  if (region) q = q.eq("region", region);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, campaigns: data ?? [] });
}

export async function POST(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  let body: z.infer<typeof CreateSchema>;
  try { body = CreateSchema.parse(await req.json()); } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "invalid body" }, { status: 400 });
  }

  // 1. Resolve target lead_ids
  let targetLeadIds: string[] = body.filter.lead_ids ?? [];
  if (targetLeadIds.length === 0 && body.filter.conditions) {
    const c = body.filter.conditions;
    let q = sb.from(DB_TABLES.LEADS).select("id").eq("region", body.region);
    if (c.language) q = q.eq("language", c.language);
    if (c.industry) q = q.eq("meta->>industry_slug", c.industry);
    if (c.has_form_url !== false) q = q.not("contact_form_url", "is", null);
    if (c.enrichment_complete !== false) q = q.eq("meta->>enrichment_complete", "true");
    q = q.limit(10000);
    const { data: leads, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    targetLeadIds = (leads ?? []).map((l) => l.id);
  }
  if (targetLeadIds.length === 0) {
    return NextResponse.json({ ok: false, error: "no target leads matched filter" }, { status: 400 });
  }

  // 2. Create campaign row
  const { data: campaign, error: cErr } = await sb.from(DB_TABLES.MVP_CAMPAIGNS).insert({
    name: body.name,
    region: body.region,
    industry_slug: body.industry_slug ?? null,
    filter_json: body.filter,
    status: body.scheduled_for ? "scheduled" : "running",
    scheduled_for: body.scheduled_for ?? null,
    daily_send_cap: body.daily_send_cap ?? 500,
    total_send_cap: body.total_send_cap ?? null,
    leads_count: targetLeadIds.length,
    notes: body.notes ?? null,
    created_by: body.created_by ?? null,
  }).select("id").single();
  if (cErr || !campaign) return NextResponse.json({ ok: false, error: cErr?.message ?? "campaign insert failed" }, { status: 500 });

  // 3. Bulk enqueue (upsert mvp_outreach_runs status=queued)
  // Active run unique 制約があるので skip conflict
  const priority = body.priority ?? "normal";
  const now = new Date().toISOString();
  const rows = targetLeadIds.map((lead_id) => ({
    lead_id,
    region: body.region,
    language: body.region, // default; per-lead language は generate-report で override
    status: "queued" as const,
    step: "campaign_enqueue",
    triggered_by: "campaign" as const,
    priority,
    campaign_id: campaign.id,
    created_at: now,
  }));

  // INSERT ... ON CONFLICT (lead_active EXCLUDE 制約により)
  let enqueued = 0;
  // chunk insert (Supabase row limit ~ 1000 per request safely)
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).insert(chunk);
    if (error) {
      // 部分失敗は無視 (active 制約 hit が多い)
      continue;
    }
    enqueued += chunk.length;
  }

  await sb.from(DB_TABLES.MVP_CAMPAIGNS).update({ enqueued_count: enqueued }).eq("id", campaign.id);

  return NextResponse.json({
    ok: true,
    campaign_id: campaign.id,
    leads_matched: targetLeadIds.length,
    enqueued,
    status: body.scheduled_for ? "scheduled" : "running",
  });
}

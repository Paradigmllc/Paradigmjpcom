/**
 * GET /api/mvp/runs/[id]
 * 監視 UI 1 lead trace.
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpUiAuth } from "@/lib/mvp/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = requireMvpUiAuth(req);
  if (denied) return denied;
  const sb = getMvpSupabase();
  const { id } = await ctx.params;

  const { data: run, error } = await sb
    .from("mvp_outreach_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!run) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const { data: lead } = await sb
    .from("leads")
    .select("id, company_name, domain, country_code, contact_form_url, meta")
    .eq("id", run.lead_id)
    .maybeSingle();

  let cmsBlock: unknown = null;
  if (run.cms_content_block_id) {
    const r = await sb
      .from("cms_content_blocks")
      .select("id, slug, title, schema_version, canonical_url, created_at")
      .eq("id", run.cms_content_block_id)
      .maybeSingle();
    cmsBlock = r.data ?? null;
  }

  return NextResponse.json({ ok: true, run, lead, cms_content_block: cmsBlock });
}

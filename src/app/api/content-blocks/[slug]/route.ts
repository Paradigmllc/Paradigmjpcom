// 笏笏笏 /api/content-blocks/[slug] 窶・cms_content_blocks 蜊倅ｸ陦悟叙蠕・笏笏笏笏
// Phase 1 (2026-05-01)
//
// GET: slug 縺ｧ cms_content_blocks 1 陦後ｒ霑斐☆ (BlockRenderer 縺ｧ謠冗判)
//   - 蜈ｬ髢句髄縺代お繝ｳ繝峨・繧､繝ｳ繝・(anon 縺ｧ繧ょ娼縺代ｋ)
//   - 蠢・医ヵ繧｣繝ｫ繧ｿ:
//       is_active = true       窶ｦ 隲也炊蜑企勁縺輔ｌ縺ｦ縺・↑縺・％縺ｨ
//       is_published = true    窶ｦ 荳区嶌縺咲憾諷九・蜈ｬ髢九＠縺ｪ縺・(CDN 繧ｭ繝｣繝・す繝･莠区腐髦ｲ豁｢)
//       page_type 竏・蜈ｬ髢玖ｨｱ蜿ｯ繝ｪ繧ｹ繝・窶ｦ sales_material / email 縺ｯ蛻･邨瑚ｷｯ (PDF/繝｡繝ｼ繝ｫ) 逕ｨ
//
// PATCH: blocks 驟榊・繧呈峩譁ｰ (admin-secret 隱崎ｨｼ)
//
// 2026-05-01 hardening (Critical #2 + #5):
//   - 譌ｧ螳溯｣・・ is_active 縺ｮ縺ｿ繝輔ぅ繝ｫ繧ｿ + page_type 繝√ぉ繝・け縺ｪ縺・//   - 繧ｯ繝ｩ繧､繧｢繝ｳ繝亥・縺ｧ繧・is_published 繧貞・蛻､螳壹＠縺ｦ縺・◆縺後，DN 縺ｯ API 繝ｬ繧ｹ繝昴Φ繧ｹ繧・//     60s 繧ｭ繝｣繝・す繝･縺吶ｋ縺溘ａ荳区嶌縺阪′ s-maxage 60 遘偵□縺代Μ繝ｼ繧ｯ縺吶ｋ邨瑚ｷｯ縺後≠縺｣縺・//   - sales_material / email 縺ｯ譛ｬ譚･縺薙・蜈ｬ髢九お繝ｳ繝峨・繧､繝ｳ繝医〒驟阪▲縺ｦ縺ｯ縺・￠縺ｪ縺・page_type
//     縺ｪ縺ｮ縺ｧ API 蛛ｴ縺ｧ繝帙Ρ繧､繝医Μ繧ｹ繝亥ｼｷ蛻ｶ縺励∝挨騾・/api/sales-material/* /api/email/* 縺ｫ蛻・屬

import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// 蜈ｬ髢九Ν繝ｼ繝医〒驟堺ｿ｡蜿ｯ閭ｽ縺ｪ page_type 縺ｮ繝帙Ρ繧､繝医Μ繧ｹ繝・const PUBLIC_PAGE_TYPES = ["report", "demo", "landing"] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const sb = getServiceSupabase()
    if (!sb) return NextResponse.json({ error: "supabase service role key not configured" }, { status: 500 })
    const { data, error } = await sb
      .from("cms_content_blocks")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .eq("is_published", true)
      .in("page_type", PUBLIC_PAGE_TYPES as unknown as string[])
      .maybeSingle()
    if (error) {
      console.warn(`[content-blocks/${slug}] fetch failed:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (e) {
    console.error(`[content-blocks/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // 隱崎ｨｼ
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) return NextResponse.json({ error: "secret not set" }, { status: 500 })
  if (req.headers.get("x-admin-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.json().catch(() => ({}))

  try {
    const sb = getServiceSupabase()
    if (!sb) return NextResponse.json({ error: "supabase service role key not configured" }, { status: 500 })
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.blocks !== undefined) updates.blocks = body.blocks
    if (body.meta !== undefined) updates.meta = body.meta
    if (body.is_published !== undefined) updates.is_published = body.is_published
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 })
    }
    const { data, error } = await sb
      .from("cms_content_blocks")
      .update(updates)
      .eq("slug", slug)
      .select()
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

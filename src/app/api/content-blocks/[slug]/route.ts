// 隨渉隨渉隨渉 /api/content-blocks/[slug] 遯ｶ繝ｻcms_content_blocks 陷雁・ｽｸﾂ髯ｦ謔溷徐陟輔・隨渉隨渉隨渉隨渉
// Phase 1 (2026-05-01)
//
// GET: slug 邵ｺ・ｧ cms_content_blocks 1 髯ｦ蠕鯉ｽ帝恆譁絶・ (BlockRenderer 邵ｺ・ｧ隰蜀怜愛)
//   - 陷茨ｽｬ鬮｢蜿･鬮・ｸｺ莉｣縺顔ｹ晢ｽｳ郢晏ｳｨ繝ｻ郢ｧ・､郢晢ｽｳ郢昴・(anon 邵ｺ・ｧ郢ｧ繧・ｨｼ邵ｺ莉｣・・
//   - 陟｢繝ｻ・ｰ蛹ｻ繝ｵ郢ｧ・｣郢晢ｽｫ郢ｧ・ｿ:
//       is_active = true       遯ｶ・ｦ 髫ｲ荵溽ｊ陷台ｼ∝求邵ｺ霈費ｽ檎ｸｺ・ｦ邵ｺ繝ｻ竊醍ｸｺ繝ｻ・・ｸｺ・ｨ
//       is_published = true    遯ｶ・ｦ 闕ｳ蛹ｺ蠍檎ｸｺ蜥ｲ諞ｾ隲ｷ荵昴・陷茨ｽｬ鬮｢荵晢ｼ邵ｺ・ｪ邵ｺ繝ｻ(CDN 郢ｧ・ｭ郢晢ｽ｣郢昴・縺咏ｹ晢ｽ･闔蛹ｺ閻宣ｫｦ・ｲ雎・ｽ｢)
//       page_type 遶上・陷茨ｽｬ鬮｢邇厄ｽｨ・ｱ陷ｿ・ｯ郢晢ｽｪ郢ｧ・ｹ郢昴・遯ｶ・ｦ sales_material / email 邵ｺ・ｯ陋ｻ・･驍ｨ迹夲ｽｷ・ｯ (PDF/郢晢ｽ｡郢晢ｽｼ郢晢ｽｫ) 騾包ｽｨ
//
// PATCH: blocks 鬩滓ｦ翫・郢ｧ蜻亥ｳｩ隴・ｽｰ (admin-secret 髫ｱ蟠趣ｽｨ・ｼ)
//
// 2026-05-01 hardening (Critical #2 + #5):
//   - 隴鯉ｽｧ陞ｳ貅ｯ・｣繝ｻ繝ｻ is_active 邵ｺ・ｮ邵ｺ・ｿ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ + page_type 郢昶・縺臥ｹ昴・縺醍ｸｺ・ｪ邵ｺ繝ｻ//   - 郢ｧ・ｯ郢晢ｽｩ郢ｧ・､郢ｧ・｢郢晢ｽｳ郢昜ｺ･繝ｻ邵ｺ・ｧ郢ｧ繝ｻis_published 郢ｧ雋槭・陋ｻ・､陞ｳ螢ｹ・邵ｺ・ｦ邵ｺ繝ｻ笳・ｸｺ蠕個・轡N 邵ｺ・ｯ API 郢晢ｽｬ郢ｧ・ｹ郢晄亢ﾎｦ郢ｧ・ｹ郢ｧ繝ｻ//     60s 郢ｧ・ｭ郢晢ｽ｣郢昴・縺咏ｹ晢ｽ･邵ｺ蜷ｶ・狗ｸｺ貅假ｽ∬叉蛹ｺ蠍檎ｸｺ髦ｪ窶ｲ s-maxage 60 驕伜・笆｡邵ｺ莉｣ﾎ懃ｹ晢ｽｼ郢ｧ・ｯ邵ｺ蜷ｶ・矩お迹夲ｽｷ・ｯ邵ｺ蠕娯旺邵ｺ・｣邵ｺ繝ｻ//   - sales_material / email 邵ｺ・ｯ隴幢ｽｬ隴夲ｽ･邵ｺ阮吶・陷茨ｽｬ鬮｢荵昴♀郢晢ｽｳ郢晏ｳｨ繝ｻ郢ｧ・､郢晢ｽｳ郢晏現縲帝ｩ滄亂笆ｲ邵ｺ・ｦ邵ｺ・ｯ邵ｺ繝ｻ・邵ｺ・ｪ邵ｺ繝ｻpage_type
//     邵ｺ・ｪ邵ｺ・ｮ邵ｺ・ｧ API 陋幢ｽｴ邵ｺ・ｧ郢晏ｸ厥｡郢ｧ・､郢晏現ﾎ懃ｹｧ・ｹ郢昜ｺ･・ｼ・ｷ陋ｻ・ｶ邵ｺ蜉ｱﾂ竏晄肩鬨ｾ繝ｻ/api/sales-material/* /api/email/* 邵ｺ・ｫ陋ｻ繝ｻ螻ｬ

import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// 陷茨ｽｬ鬮｢荵斟晉ｹ晢ｽｼ郢晏現縲帝ｩ溷ｺ・ｿ・｡陷ｿ・ｯ髢ｭ・ｽ邵ｺ・ｪ page_type 邵ｺ・ｮ郢晏ｸ厥｡郢ｧ・､郢晏現ﾎ懃ｹｧ・ｹ郢昴・const PUBLIC_PAGE_TYPES = ["report", "demo", "landing"] as const

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
    // Batch 16 fuzzy lookup: slug にマッチしない場合 (legacy URL `report-{runId}` など)
    // diagnostic_runs から該当 run を探して最小限の fallback ページを返す
    if (!data) {
      // パターン1: report-{uuid} (legacy v1 slug)
      // パターン2: {company}-{8charPrefix} (Batch 16 new slug)
      const possibleRunIdMatch = slug.match(/([0-9a-f]{8})(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?/)
      if (possibleRunIdMatch) {
        const idPrefix = possibleRunIdMatch[1]
        const { data: run } = await sb
          .from("diagnostic_runs")
          .select("id,company_name,target_url,overall_score,total_annual_loss_jpy,started_at,status")
          .like("id", `${idPrefix}%`)
          .limit(1)
          .maybeSingle()
        if (run) {
          return NextResponse.json({
            slug, page_type: "report", region: "ja",
            title: `Webサイト健康診断レポート｜${run.company_name || "(企業名未設定)"}様専用`,
            blocks: [
              { id: "fallback-hero", type: "hero", props: {
                title: `${run.company_name || "Web"}健康診断レポート (準備中)`,
                subtitle: `総合スコア ${run.overall_score ?? "—"}/100 · 推定年間機会損失 ¥${(run.total_annual_loss_jpy ?? 0).toLocaleString()}`,
                ctaLabel: "Cal.com で 30 分相談予約", ctaUrl: "https://cal.com/paradigm/japan-entry-30min",
                variant: "centered",
              }},
              { id: "fallback-cta", type: "cta", props: {
                heading: "詳細レポートは準備中です",
                description: "engine v2 パイプラインで再生成中。完了次第こちらに公開されます。お急ぎの場合は直接ご連絡ください。",
                buttonLabel: "Paradigm に問い合わせ",
                buttonUrl: "mailto:checkup@paradigmjp.com",
              }},
            ],
            meta: { fallback: true, run_id: run.id, status: run.status },
            is_published: true, is_active: true,
          }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" } })
        }
      }
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
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
  // 髫ｱ蟠趣ｽｨ・ｼ
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

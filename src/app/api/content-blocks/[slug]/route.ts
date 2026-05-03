// ─── /api/content-blocks/[slug] — cms_content_blocks 単一行取得 ────
// Phase 1 (2026-05-01)
//
// GET: slug で cms_content_blocks 1 行を返す (BlockRenderer で描画)
//   - 公開向けエンドポイント (anon でも叩ける)
//   - 必須フィルタ:
//       is_active = true       … 論理削除されていないこと
//       is_published = true    … 下書き状態は公開しない (CDN キャッシュ事故防止)
//       page_type ∈ 公開許可リスト … sales_material / email は別経路 (PDF/メール) 用
//
// PATCH: blocks 配列を更新 (admin-secret 認証)
//
// 2026-05-01 hardening (Critical #2 + #5):
//   - 旧実装は is_active のみフィルタ + page_type チェックなし
//   - クライアント側でも is_published を再判定していたが、CDN は API レスポンスを
//     60s キャッシュするため下書きが s-maxage 60 秒だけリークする経路があった
//   - sales_material / email は本来この公開エンドポイントで配ってはいけない page_type
//     なので API 側でホワイトリスト強制し、別途 /api/sales-material/* /api/email/* に分離

import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// 公開ルートで配信可能な page_type のホワイトリスト
const PUBLIC_PAGE_TYPES = ["report", "demo", "landing"] as const

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
    // Batch 16 fuzzy lookup: slug にマッチしない場合 (legacy URL report-{runId} など)
    // diagnostic_runs から該当 run を探して最小限の fallback ページを返す
    if (!data) {
      const possibleRunIdMatch = slug.match(/([0-9a-f]{8})(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?/)
      if (possibleRunIdMatch) {
        const idPrefix = possibleRunIdMatch[1]
        const { data: run } = await sb
          .from('diagnostic_runs')
          .select('id,company_name,target_url,overall_score,total_annual_loss_jpy,started_at,status')
          .like('id', `${slug}%`)
          .limit(1)
          .maybeSingle()
        if (run) {
          return NextResponse.json({
            slug, page_type: 'report', region: 'ja',
            title: `${run.company_name ?? 'お客様'} 様 — 診断レポート (準備中)`,
            blocks: [
              { id: 'fallback-hero', type: 'hero', props: {
                title: `${run.company_name ?? 'お客様'} 様の診断レポートを準備しています`,
                subtitle: '詳細レポートは engine v2 パイプラインで再生成中です。完了次第こちらに表示されます。',
                ctaLabel: 'Cal.com で 30 分相談予約', ctaUrl: 'https://cal.com/paradigm/japan-entry-30min',
                variant: 'centered',
              }},
              { id: 'fallback-cta', type: 'cta', props: {
                heading: '詳細レポートは準備中です',
                description: 'engine v2 パイプラインで再生成中。完了次第こちらに公開されます。',
                buttonLabel: 'Paradigm に問い合わせ',
                buttonUrl: 'mailto:checkup@paradigmjp.com',
              }},
            ],
            meta: { fallback: true, run_id: run.id, status: run.status },
            is_published: true, is_active: true,
          }, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60' } })
        }
      }
      return NextResponse.json({ error: 'not found' }, { status: 404 })
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
  // 認証
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

/**
 * /report/[slug] — locale-aware permanent redirect (B33 Phase 2 — 2026-05-07)
 *
 * 旧版 (2026-04-30 / B33 Phase 1 まで): 全スラッグを `/ja/report/[slug]` に固定 redirect.
 *   問題: en / ko / zh / es 等で生成されたレポートも `/ja/` に redirect され、
 *         next-intl で日本語 messages が読み込まれて「内容は英語・UIは日本語」のキメラ表示になる致命バグ.
 *
 * 新版 (B33 Phase 2): cms_content_blocks から region を lookup → 正しい locale prefix へ redirect.
 *   - lookup 失敗時 (slug 存在しない / DB 障害) は legacy fallback として /ja/ を維持
 *     (壊れた slug でも next-intl 404 ハンドリングが動くようにする方が UX 良し).
 *   - region → locale 変換は @paradigmllc/blocks の regionToLocale() 純関数経由で
 *     両 repo の派生ロジックを統一する (silently-mismatch 防止).
 *
 * 永久ルール:
 *   - 顧客向けページ canonical = /[locale]/report/[slug]
 *   - locale 派生は regionToLocale() 1 箇所のみ (ハードコード /ja/ は禁止)
 *   - 308 (Permanent Redirect) で被リンクの価値を locale 別に集約
 */

import { permanentRedirect } from "next/navigation"
import { regionToLocale } from "@paradigmllc/blocks"
import { getServiceSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic"

export default async function LegacyReportRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // cms_content_blocks (page_type='report'/'demo'/'landing') から region を引く.
  // is_published / is_active フィルタは shim 段階では適用しない (404 ハンドリングは
  // [locale]/report/[slug] 配下に委譲する方が責務分離が綺麗).
  let locale = "ja"  // fallback
  try {
    const sb = getServiceSupabase()
    if (sb) {
      const { data } = await sb
        .from(DB_TABLES.CMS_CONTENT_BLOCKS)
        .select("region")
        .eq("slug", slug)
        .maybeSingle()
      if (data?.region) {
        locale = regionToLocale(data.region as Parameters<typeof regionToLocale>[0])
      }
    } else {
      console.warn(`[report/[slug]] getServiceSupabase() returned null — env vars missing. Falling back to /ja/.`)
    }
  } catch (e) {
    // DB 障害時は ja fallback で続行 (UX 優先・log のみ残す).
    console.warn(`[report/[slug]] region lookup failed for ${slug}: ${e instanceof Error ? e.message : String(e)}`)
  }

  permanentRedirect(`/${locale}/report/${slug}`)
}

/**
 * GET /api/sales/track-view?slug=... — Sprint 11 (Sprint 13 URL refactor)
 *
 * 役割: 診断レポート閲覧トラッキング (1x1 透明 GIF) + report_views++
 *       3 回以上閲覧で is_hot_lead = true → Slack 通知.
 *
 * 認証: なし (public・閲覧トラッキング用)
 *       slug = sales_companies.slug (Sprint 13 以降) / 旧 id(uuid)/domain も互換維持
 */

import { NextRequest, NextResponse } from "next/server"
import {
  findCompanyById,
  findCompanyByDomain,
  findCompanyBySlug,
  markHotLead,
} from "@/lib/sales/companies"
import { getServiceSupabase } from "@/lib/supabase"
import { notifyHotLead } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HOT_THRESHOLD = 3

// 1x1 透明 GIF (base64)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
const isDomain = (s: string): boolean => /\./.test(s)

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    })
  }

  // Sprint 13: slug 優先 lookup. 旧形式 (uuid / domain) も backward compat.
  let company = await findCompanyBySlug(slug)
  if (!company) {
    company = isUuid(slug)
      ? await findCompanyById(slug)
      : isDomain(slug)
        ? await findCompanyByDomain(slug)
        : null
  }

  if (company) {
    const sb = getServiceSupabase()
    if (sb) {
      const newCount = (company.report_views ?? 0) + 1
      await sb
        .from("sales_companies")
        .update({ report_views: newCount })
        .eq("id", company.id)

      // HOT lead 判定: 3 回閲覧で HOT 化
      if (newCount >= HOT_THRESHOLD && !company.is_hot_lead) {
        await markHotLead(company.id, true)
        // Slack 通知 (best-effort・Sprint 14 で動画 preview URL も追加)
        const reportUrl = company.slug
          ? `https://paradigmjp.com/ja/report/${company.slug}`
          : `https://paradigmjp.com/ja/report/${company.domain}`
        const videoUrl = company.slug
          ? `https://paradigmjp.com/ja/report/${company.slug}/video`
          : null
        await notifyHotLead({
          company_name: company.company_name,
          domain: company.domain,
          report_views: newCount,
          diagnostic_url: reportUrl,
          video_url: videoUrl,
        }).catch(() => {}) // never throw
      }
    }
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}

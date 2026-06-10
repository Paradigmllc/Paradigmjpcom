/**
 * GET /api/sales/track-view?slug=...&event=...&ref=...
 * 
 * トラッキングイベント:
 *   event=load     — 初回読み込み（report_views++）
 *   event=scroll   — 50%スクロール到達
 *   event=cta      — CTAボタンクリック
 *   event=stay     — 30秒滞在（自動ping）
 * 
 * 3回以上閲覧で is_hot_lead = true → Slack通知.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  findCompanyById,
  findCompanyByDomain,
  findCompanyBySlug,
  markHotLead,
} from "@/lib/sales/companies"
import { localeToRegion } from "@/lib/sales/types"
import { getRoutingMeta } from "@/lib/sales/routing"
import { getServiceSalesSupabase } from "@/lib/supabase"
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
  const locale = req.nextUrl.searchParams.get("locale") ?? "ja"
  if (!slug) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    })
  }

  // Sprint 13: slug 優先 lookup. 旧形式 (uuid / domain) も backward compat.
  const region = localeToRegion(locale)
  let company = await findCompanyBySlug(slug, region)
  if (!company) {
    company = isUuid(slug)
      ? await findCompanyById(slug)
      : isDomain(slug)
        ? await findCompanyByDomain(slug)
        : null
  }

  if (company) {
    const sb = getServiceSalesSupabase()
    const event = req.nextUrl.searchParams.get("event") ?? "load"
    const referrer = req.nextUrl.searchParams.get("ref") ?? req.headers.get("referer") ?? "direct"

    if (sb) {
      const newCount = (company.report_views ?? 0) + 1
      const now = new Date().toISOString()

      const patch: Record<string, unknown> = { report_views: newCount }

      // HOT lead 判定
      if (newCount >= HOT_THRESHOLD && !company.is_hot_lead) {
        patch.is_hot_lead = true
        const routing = getRoutingMeta(company.meta)
        const reportLocale = company.report_locale ?? routing.report_locale ?? locale
        const reportUrl = company.slug
          ? `https://paradigmjp.com/${reportLocale}/report/${company.slug}`
          : `https://paradigmjp.com/${reportLocale}/report/${company.domain}`
        const videoUrl = company.slug
          ? `https://paradigmjp.com/${reportLocale}/report/${company.slug}/video`
          : null
        await notifyHotLead({
          company_name: company.company_name,
          domain: company.domain,
          report_views: newCount,
          diagnostic_url: reportUrl,
          video_url: videoUrl,
        }).catch((e) => console.error("[track-view] hot-lead Slack notification failed:", e))
      }

      // Mark last activity
      if (event === "stay") {
        patch.last_viewed_at = now
      } else if (event === "scroll") {
        patch.last_scrolled_at = now
      } else if (event === "cta") {
        patch.cta_clicked_at = now
      }

      await sb.from("sales_companies").update(patch).eq("id", company.id)

      // Log tracking event
      await sb.from("sales_activities").insert({
        company_id: company.id,
        activity_type: event === "load" ? "report_viewed" : event === "scroll" ? "report_scrolled" : event === "cta" ? "cta_clicked" : "report_engaged",
        subject: event === "load" ? "レポート閲覧" : event === "scroll" ? "50%スクロール到達" : event === "cta" ? "CTAクリック" : "30秒滞在",
        result: referrer,
        occurred_at: now,
      }).then(() => {}, () => {}) // best-effort
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

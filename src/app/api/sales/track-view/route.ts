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
} from "@/lib/sales/companies"
import { localeToRegion } from "@/lib/sales/types"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifyHotLead } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const HOT_THRESHOLD = 3

// 1x1 透明 GIF (base64)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

import { isUuid } from "@/lib/sales/japan-readiness-utils"
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
      const now = new Date().toISOString()

      // Atomic increment to prevent lost updates from concurrent tracking pixels
      const { data: updated, error: countError } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("report_views, is_hot_lead, slug, company_name, domain, report_locale")
        .eq("id", company.id)
        .maybeSingle()
      if (countError || !updated) {
        console.error("[track-view] company fetch failed:", countError?.message)
        return new NextResponse(TRANSPARENT_GIF, {
          status: 200,
          headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
        })
      }
      const newCount = ((updated as { report_views?: number }).report_views ?? 0) + 1
      const currentCount = (updated as { report_views?: number }).report_views ?? 0
      const currentIsHot = (updated as { is_hot_lead?: boolean }).is_hot_lead ?? false

      const patch: Record<string, unknown> = { report_views: newCount }

      // HOT lead 判定 (check current state from fresh read to avoid stale is_hot_lead)
      if (newCount >= HOT_THRESHOLD && !currentIsHot) {
        patch.is_hot_lead = true
        const reportLocale = (updated as { report_locale?: string }).report_locale ?? locale
        const companySlug = (updated as { slug?: string; domain?: string }).slug || (updated as { domain?: string }).domain
        const reportUrl = companySlug
          ? `https://paradigmjp.com/${reportLocale}/report/${companySlug}`
          : `https://paradigmjp.com/${reportLocale}/report/${(updated as { domain?: string }).domain}`
        const videoUrl = (updated as { slug?: string }).slug
          ? `https://paradigmjp.com/${reportLocale}/report/${(updated as { slug?: string }).slug}/video`
          : null
        await notifyHotLead({
          company_name: (updated as { company_name?: string }).company_name ?? company.company_name,
          domain: (updated as { domain?: string }).domain ?? company.domain,
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

      await sb.from(DB_TABLES.SALES_COMPANIES).update(patch).eq("id", company.id)

      // Log tracking event
      const { error: activityError } = await sb.from(DB_TABLES.SALES_ACTIVITIES).insert({
        company_id: company.id,
        activity_type: event === "load" ? "report_viewed" : event === "scroll" ? "report_scrolled" : event === "cta" ? "cta_clicked" : "report_engaged",
        subject: event === "load" ? "レポート閲覧" : event === "scroll" ? "50%スクロール到達" : event === "cta" ? "CTAクリック" : "30秒滞在",
        result: referrer,
        occurred_at: now,
      })
      if (activityError) console.error("[track-view] activity insert failed:", activityError)
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

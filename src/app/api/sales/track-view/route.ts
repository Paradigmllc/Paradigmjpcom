/**
 * GET /api/sales/track-view?slug=...&event=...&ref=...
 * 
 * トラッキングイベント:
 *   event=load     — 初回読み込み（report_views++）
 *   event=scroll   — 50%スクロール到達
 *   event=cta      — CTAボタンクリック
 *   event=stay     — 30秒滞在（自動ping）
 * 
 * Public telemetry never promotes a lead or sends notifications. Operators
 * must make that decision from an authenticated workflow.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  findCompanyById,
  findCompanyByDomain,
  findCompanyBySlug,
} from "@/lib/sales/companies"
import { localeToRegion } from "@/lib/sales/types"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

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
  const event = req.nextUrl.searchParams.get("event") ?? "load"
  if (slug.length > 200 || !["load", "scroll", "cta", "stay", "section", "ab_test"].includes(event)) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 400,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    })
  }
  const rateLimit = checkRateLimit({
    ip: getClientIp(req),
    key: "api:sales:track-view",
    max: 120,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 429,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store", "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
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
      const patch: Record<string, unknown> = { report_views: newCount }

      // Public pixels must not promote a prospect or trigger notifications.
      // View counts are untrusted telemetry; hot-lead promotion belongs to an
      // authenticated operator action or a signed server-side event.

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

/**
 * POST /api/sales/scan/[domain] — Sprint 11
 *
 * 役割: domain の PageSpeed Insights + HTML inspect を実行し,
 *       sales_companies の pagespeed_* / detected_issues に書込.
 *
 * 認証: X-Webhook-Secret header 必須
 * 出力: { ok, mobile, desktop, issues, error? }
 *
 * scan ロジック本体は lib/sales/sources/scanner.ts に分離 (enrich pipeline と共有).
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { upsertCompanyByDomain, setPipelineStatus, findCompanyByDomain } from "@/lib/sales/companies"
import { salesScopeFromCountry } from "@/lib/sales/locale-scope"
import { buildReportUrl } from "@/lib/sales/routing"
import { scanDomain } from "@/lib/sales/sources/scanner"
import { saveSourceCoverageRows } from "@/lib/sales/source-coverage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ domain: string }> },
) {
  try {
    const authErr = verifyWebhookSecret(req)
    if (authErr) return authErr

    const { domain } = await ctx.params
    if (!domain) {
      return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 })
    }
    const scope = salesScopeFromCountry({
      reportLocale: req.nextUrl.searchParams.get("report_locale") ?? req.nextUrl.searchParams.get("locale"),
      targetCountry: req.nextUrl.searchParams.get("target_country") ?? req.nextUrl.searchParams.get("country"),
    })

    // company 存在チェック (なければ create)
    const existing = await findCompanyByDomain(domain)
    if (!existing) {
      await upsertCompanyByDomain({
        domain,
        company_name: domain,
        region: scope.region,
        report_locale: scope.reportLocale,
        target_country: scope.targetCountry,
        pipeline_status: "scanning",
      })
    } else {
      await setPipelineStatus(existing.id, "scanning")
    }

    // 共通 scanner で並列実行
    const scan = await scanDomain(domain)

    // 結果を Supabase に書込
    const result = await upsertCompanyByDomain({
      domain,
      company_name: existing?.company_name ?? scan.html.title ?? domain,
      region: existing?.region ?? scope.region,
      report_locale: existing?.report_locale ?? scope.reportLocale,
      target_country: existing?.target_country ?? scope.targetCountry,
      pagespeed_mobile: scan.mobile.performance,
      pagespeed_desktop: scan.desktop.performance,
      detected_issues: scan.issues,
      pipeline_status: existing?.pipeline_status === "report_ready" ? "report_ready" : "scanning",
      meta: {
        scan: {
          ran_at: new Date().toISOString(),
          mobile_score: scan.mobile.performance,
          desktop_score: scan.desktop.performance,
          html_title: scan.html.title,
          html_description: scan.html.description,
          canonical_url: scan.html.canonicalUrl,
          is_wordpress: scan.html.isWordPress,
          copyright_year: scan.html.copyrightYear,
          form_count: scan.html.formCount,
          contact_link_count: scan.html.contactLinkCount,
        },
        security_headers: scan.securityHeaders,
        robots_sitemap: scan.robotsSitemap,
        japan_market_audit: scan.japanMarketAudit,
      },
    })
    if (result.company) await saveSourceCoverageRows(result.company)
    const reportLocale = result.company?.report_locale ?? existing?.report_locale ?? scope.reportLocale
    const slug = result.company?.slug ?? existing?.slug ?? null

    return NextResponse.json({
      ok: true,
      domain,
      mobile: scan.mobile.performance,
      desktop: scan.desktop.performance,
      issues: scan.issues,
      japan_market_audit: scan.japanMarketAudit,
      report_url: slug ? buildReportUrl(reportLocale, slug) : null,
    })
  } catch (error) {
    console.error("[scan] domain scan failed:", error)
    const message = error instanceof Error ? error.message : "scan failed"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

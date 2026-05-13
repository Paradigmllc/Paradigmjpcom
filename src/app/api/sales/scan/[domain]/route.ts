/**
 * POST /api/sales/scan/[domain] — Sprint 11
 *
 * 役割: domain の PageSpeed Insights を実行し、issue を自動推定して
 *       sales_companies の pagespeed_mobile / detected_issues に書込.
 *
 * 認証: X-Webhook-Secret header 必須
 * 出力: { ok, mobile, desktop, issues, error? }
 *
 * 課題推定ルール (Sprint 11 simple version):
 *   - mobile < 50  → speed_critical
 *   - ssl 期限近い (Lighthouse audits 経由) → ssl_expired
 *   - WordPress (HTTP headers / meta から判別) → wp_outdated (簡易版・後で Wappalyzer)
 *   - OGP meta なし → no_ogp
 *   - copyright 年が 2 年以上前 → copyright_old
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { upsertCompanyByDomain, setPipelineStatus, findCompanyByDomain } from "@/lib/sales/companies"
import type { IssueCode } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

interface PsiResult {
  performance: number | null
  audits: {
    ssl?: boolean
    https: boolean
    htmlMeta?: string
  }
}

async function runPsi(url: string, strategy: "mobile" | "desktop"): Promise<PsiResult> {
  const key = process.env.GOOGLE_PSI_API_KEY ?? ""
  const params = new URLSearchParams({ url, strategy, category: "performance" })
  if (key) params.set("key", key)
  try {
    const res = await fetch(`${PSI_API}?${params.toString()}`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      return { performance: null, audits: { https: url.startsWith("https") } }
    }
    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } }
      }
    }
    const score = data.lighthouseResult?.categories?.performance?.score
    return {
      performance: typeof score === "number" ? Math.round(score * 100) : null,
      audits: { https: url.startsWith("https") },
    }
  } catch {
    return { performance: null, audits: { https: url.startsWith("https") } }
  }
}

/** ドメインの HTML を fetch して OGP / WP / copyright 年を推定 */
async function inspectHtml(url: string): Promise<{
  hasOgp: boolean
  isWordPress: boolean
  copyrightYear: number | null
}> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (Paradigm Diagnostic Bot/1.0)" },
    })
    const html = await res.text()
    const hasOgp = /<meta[^>]+property=["']og:/i.test(html)
    const isWordPress = /wp-content|wp-includes|generator.*wordpress/i.test(html)
    const yearMatch = html.match(/©\s*(\d{4})|copyright\s*(\d{4})|&copy;\s*(\d{4})/i)
    const copyrightYear = yearMatch
      ? Number.parseInt(yearMatch[1] || yearMatch[2] || yearMatch[3], 10)
      : null
    return { hasOgp, isWordPress, copyrightYear }
  } catch {
    return { hasOgp: false, isWordPress: false, copyrightYear: null }
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ domain: string }> },
) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  const { domain } = await ctx.params
  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 })
  }

  const url = domain.startsWith("http") ? domain : `https://${domain}`

  // company 存在チェック (なければ create)
  const existing = await findCompanyByDomain(domain)
  if (!existing) {
    await upsertCompanyByDomain({
      domain,
      company_name: domain,
      pipeline_status: "scanning",
    })
  } else {
    await setPipelineStatus(existing.id, "scanning")
  }

  // 並列で PSI mobile/desktop + HTML inspect
  const [mobile, desktop, html] = await Promise.all([
    runPsi(url, "mobile"),
    runPsi(url, "desktop"),
    inspectHtml(url),
  ])

  const issues: IssueCode[] = []
  if (mobile.performance !== null && mobile.performance < 50) issues.push("speed_critical")
  if (!html.hasOgp) issues.push("no_ogp")
  if (html.isWordPress) issues.push("wp_outdated")
  if (!html.copyrightYear || html.copyrightYear < new Date().getFullYear() - 2) {
    issues.push("copyright_old")
  }
  if (!mobile.audits.https) issues.push("ssl_expired")

  // 結果を Supabase に書込
  await upsertCompanyByDomain({
    domain,
    company_name: existing?.company_name ?? domain,
    pagespeed_mobile: mobile.performance,
    pagespeed_desktop: desktop.performance,
    detected_issues: issues,
    pipeline_status: "report_ready",
  })

  return NextResponse.json({
    ok: true,
    domain,
    mobile: mobile.performance,
    desktop: desktop.performance,
    issues,
    diagnostic_url: `https://paradigmjp.com/ja/diagnostic/${domain}`,
  })
}

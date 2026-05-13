/**
 * lib/sales/sources/scanner.ts — Sprint 11
 *
 * 役割: domain を渡すと PageSpeed Insights + HTML inspect を実行し,
 *       Sales OS の IssueCode 配列に変換して返す共通スキャナ.
 *
 * 入力: domain (例 "example.com")
 * 出力: { mobile, desktop, issues, htmlInspect }
 *
 * 利用者: /api/sales/scan (n8n webhook) / lib/sales/enrich (contact form 経由)
 *
 * AE-PHP-4 準拠.
 */

import type { IssueCode } from "../types"

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

export interface PsiResult {
  performance: number | null
  https: boolean
}

export interface HtmlInspect {
  hasOgp: boolean
  isWordPress: boolean
  copyrightYear: number | null
  title: string | null
}

export interface ScanResult {
  mobile: PsiResult
  desktop: PsiResult
  html: HtmlInspect
  issues: IssueCode[]
}

async function runPsi(
  url: string,
  strategy: "mobile" | "desktop",
): Promise<PsiResult> {
  const key = process.env.GOOGLE_PSI_API_KEY ?? ""
  const params = new URLSearchParams({ url, strategy, category: "performance" })
  if (key) params.set("key", key)
  try {
    const res = await fetch(`${PSI_API}?${params.toString()}`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      return { performance: null, https: url.startsWith("https") }
    }
    const data = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number } } }
    }
    const score = data.lighthouseResult?.categories?.performance?.score
    return {
      performance: typeof score === "number" ? Math.round(score * 100) : null,
      https: url.startsWith("https"),
    }
  } catch {
    return { performance: null, https: url.startsWith("https") }
  }
}

async function inspectHtml(url: string): Promise<HtmlInspect> {
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
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() ?? null
    return { hasOgp, isWordPress, copyrightYear, title }
  } catch {
    return { hasOgp: false, isWordPress: false, copyrightYear: null, title: null }
  }
}

/**
 * domain を完全スキャンして IssueCode 配列に変換.
 *
 * 課題推定ルール:
 *   - mobile PSI < 50  → speed_critical
 *   - https なし       → ssl_expired
 *   - WordPress        → wp_outdated (簡易版・後で Wappalyzer)
 *   - OGP meta なし    → no_ogp
 *   - copyright 2 年以上前 → copyright_old
 */
export async function scanDomain(domain: string): Promise<ScanResult> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`
  const [mobile, desktop, html] = await Promise.all([
    runPsi(url, "mobile"),
    runPsi(url, "desktop"),
    inspectHtml(url),
  ])

  const issues: IssueCode[] = []
  if (mobile.performance !== null && mobile.performance < 50) issues.push("speed_critical")
  if (!mobile.https) issues.push("ssl_expired")
  if (!html.hasOgp) issues.push("no_ogp")
  if (html.isWordPress) issues.push("wp_outdated")
  if (!html.copyrightYear || html.copyrightYear < new Date().getFullYear() - 2) {
    issues.push("copyright_old")
  }

  return { mobile, desktop, html, issues }
}

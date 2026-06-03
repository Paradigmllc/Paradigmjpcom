import type { IssueCode } from "../types"
import { auditJapanMarketReadiness, type JapanMarketAudit } from "./japan-market-audit"
import { getProxyFetchOptions } from "../proxy-agent"

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
const USER_AGENT = "Mozilla/5.0 (Paradigm Diagnostic Bot/1.0; +https://paradigmjp.com)"

export interface PsiResult {
  performance: number | null
  https: boolean
}

export interface HtmlInspect {
  hasOgp: boolean
  isWordPress: boolean
  hasRecaptcha: boolean
  hasTurnstile: boolean
  hasCloudflareChallenge: boolean
  copyrightYear: number | null
  title: string | null
  description: string | null
  canonicalUrl: string | null
  formCount: number
  contactLinkCount: number
}

export interface HttpSecurityHeaders {
  hasHsts: boolean
  hasCsp: boolean
  hasXFrameOptions: boolean
  hasNoSniff: boolean
  server: string | null
}

export interface RobotsSitemapInspect {
  robotsTxt: boolean
  sitemapXml: boolean
  sitemapUrlCount: number
}

export interface ScanResult {
  mobile: PsiResult
  desktop: PsiResult
  html: HtmlInspect
  securityHeaders: HttpSecurityHeaders
  robotsSitemap: RobotsSitemapInspect
  japanMarketAudit: JapanMarketAudit
  issues: IssueCode[]
}

async function runPsi(url: string, strategy: "mobile" | "desktop"): Promise<PsiResult> {
  const key = process.env.GOOGLE_PSI_API_KEY ?? ""
  const params = new URLSearchParams({ url, strategy, category: "performance" })
  if (key) params.set("key", key)

  try {
    const res = await fetch(`${PSI_API}?${params.toString()}`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) return { performance: null, https: url.startsWith("https") }
    const data = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number } } }
    }
    const score = data.lighthouseResult?.categories?.performance?.score
    return {
      performance: typeof score === "number" ? Math.round(score * 100) : null,
      https: url.startsWith("https"),
    }
  } catch (e) {
    console.warn("[sales-scanner] PageSpeed request failed:", e)
    return { performance: null, https: url.startsWith("https") }
  }
}

function emptyHtmlInspect(): HtmlInspect {
  return {
    hasOgp: false,
    isWordPress: false,
    hasRecaptcha: false,
    hasTurnstile: false,
    hasCloudflareChallenge: false,
    copyrightYear: null,
    title: null,
    description: null,
    canonicalUrl: null,
    formCount: 0,
    contactLinkCount: 0,
  }
}

function firstMetaContent(html: string, name: string): string | null {
  const pattern = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")
  return html.match(pattern)?.[1]?.trim() ?? null
}

async function inspectHtml(url: string): Promise<HtmlInspect> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": USER_AGENT },
      })
    )
    const html = await res.text()
    const yearMatch = html.match(/(?:copyright|&copy;|©)\s*(\d{4})/i)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)

    return {
      hasOgp: /<meta[^>]+property=["']og:/i.test(html),
      isWordPress: /wp-content|wp-includes|generator.*wordpress/i.test(html),
      hasRecaptcha: /google\.com\/recaptcha|g-recaptcha|grecaptcha/i.test(html),
      hasTurnstile: /cf-turnstile|challenges\.cloudflare\.com\/turnstile|turnstile\.render/i.test(html),
      hasCloudflareChallenge: /cdn-cgi\/challenge-platform|cf-chl-|cf-browser-verification|Attention Required! \| Cloudflare/i.test(html),
      copyrightYear: yearMatch ? Number.parseInt(yearMatch[1] ?? "", 10) : null,
      title: titleMatch?.[1]?.trim() ?? null,
      description: firstMetaContent(html, "description"),
      canonicalUrl: canonicalMatch?.[1]?.trim() ?? null,
      formCount: (html.match(/<form\b/gi) ?? []).length,
      contactLinkCount: (
        html.match(/href=["'][^"']*(contact|inquiry|toiawase|otoiawase|form)[^"']*["']/gi) ?? []
      ).length,
    }
  } catch (e) {
    console.warn("[sales-scanner] HTML inspect failed:", e)
    return emptyHtmlInspect()
  }
}

async function inspectSecurityHeaders(url: string): Promise<HttpSecurityHeaders> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": USER_AGENT },
      })
    )
    return {
      hasHsts: !!res.headers.get("strict-transport-security"),
      hasCsp: !!res.headers.get("content-security-policy"),
      hasXFrameOptions: !!res.headers.get("x-frame-options"),
      hasNoSniff: (res.headers.get("x-content-type-options") ?? "").toLowerCase() === "nosniff",
      server: res.headers.get("server"),
    }
  } catch (e) {
    console.warn("[sales-scanner] security header inspect failed:", e)
    return { hasHsts: false, hasCsp: false, hasXFrameOptions: false, hasNoSniff: false, server: null }
  }
}

async function fetchOptionalText(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        redirect: "follow",
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": USER_AGENT },
      })
    )
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    console.warn("[sales-scanner] optional text fetch failed:", e)
    return null
  }
}

async function inspectRobotsSitemap(origin: string): Promise<RobotsSitemapInspect> {
  const [robots, sitemap] = await Promise.all([
    fetchOptionalText(`${origin}/robots.txt`),
    fetchOptionalText(`${origin}/sitemap.xml`),
  ])
  return {
    robotsTxt: !!robots,
    sitemapXml: !!sitemap,
    sitemapUrlCount: sitemap ? (sitemap.match(/<loc>/gi) ?? []).length : 0,
  }
}

export async function scanDomain(domain: string): Promise<ScanResult> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`
  const origin = new URL(url).origin
  const [mobile, desktop, html, securityHeaders, robotsSitemap, japanMarketAudit] = await Promise.all([
    runPsi(url, "mobile"),
    runPsi(url, "desktop"),
    inspectHtml(url),
    inspectSecurityHeaders(url),
    inspectRobotsSitemap(origin),
    auditJapanMarketReadiness(origin),
  ])

  const issues: IssueCode[] = []
  if (mobile.performance !== null && mobile.performance < 50) issues.push("speed_critical")
  if (!mobile.https) issues.push("ssl_expired")
  if (!html.hasOgp) issues.push("no_ogp")
  if (html.isWordPress) issues.push("wp_outdated")
  if (!html.copyrightYear || html.copyrightYear < new Date().getFullYear() - 2) {
    issues.push("copyright_old")
  }

  return { mobile, desktop, html, securityHeaders, robotsSitemap, japanMarketAudit, issues }
}

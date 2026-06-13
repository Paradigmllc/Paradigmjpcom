/**
 * browser-search.ts — FlareSolverr + Steel based Google/Brave search.
 * Uses real browser (Chrome) to bypass CAPTCHA and bot detection.
 * No proxy required — the browser itself acts as the proxy.
 *
 * Architecture:
 *   FlareSolverr (primary) — lightweight, fast, already running
 *   Steel Browser (fallback) — heavier but more stealthy
 */

export interface BrowserSearchResult {
  ok: boolean
  domains: string[]
  engine: string
  total: number
  error?: string
}

// Realistic Chrome headers
const BROWSER_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

async function fsRequest(url: string): Promise<string | null> {
  const fsUrl = process.env.FLARESOLVERR_URL ?? "http://flaresolverr:8191/v1"
  try {
    const res = await fetch(fsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: 25000,
        headers: BROWSER_HEADERS,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const body = await res.json() as {
      status: string
      message?: string
      solution?: { response: string; status: number }
    }
    if (body.status === "ok" && body.solution?.response) {
      return body.solution.response
    }
    if (body.status === "error") {
      console.warn("[browser-search] FlareSolverr error:", body.message)
    }
    return null
  } catch (e) {
    console.warn("[browser-search] FlareSolverr unreachable:", e instanceof Error ? e.message : String(e))
    return null
  }
}

async function steelScrape(url: string): Promise<string | null> {
  const steelUrl = (process.env.STEEL_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "")
  const apiKey = process.env.STEEL_API_KEY
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  try {
    const res = await fetch(`${steelUrl}/v1/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, format: "json", waitFor: 3000 }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const data = await res.json() as { text?: string; title?: string }
    return data.text ?? null
  } catch (e) {
    console.warn("[browser-search] Steel unreachable:", e instanceof Error ? e.message : String(e))
    return null
  }
}

const DOMAIN_RE = /https?:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}/gi
const BLOCKED_DOMAINS = new Set([
  "google.com", "youtube.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
  "linkedin.com", "reddit.com", "wikipedia.org", "tiktok.com", "pinterest.com",
  "amazon.com", "ebay.com", "etsy.com", "shopify.com", "alibaba.com",
  "apple.com", "microsoft.com", "github.com", "stackoverflow.com",
  "gstatic.com", "googleusercontent.com", "ggpht.com", "googleapis.com",
  "googletagmanager.com", "googleadservices.com", "fonts.gstatic.com",
  "encrypted-tbn0.gstatic.com", "lh3.googleusercontent.com",
])

function extractDomains(html: string): string[] {
  const domains = new Set<string>()
  let match
  DOMAIN_RE.lastIndex = 0
  while ((match = DOMAIN_RE.exec(html)) !== null) {
    const domain = match[1] ? `${match[1]}.${match[2]}` : match[0].replace(/^https?:\/\//, "").split("/")[0].toLowerCase()
    if (domain && !BLOCKED_DOMAINS.has(domain) && !domain.includes("google") && domain.includes(".")) {
      domains.add(domain)
    }
  }
  return [...domains]
}

// Search engines with their URL templates
const SEARCH_ENGINES: Record<string, (query: string) => string> = {
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en&num=30`,
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web`,
  duckduckgo: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
}

// Random delay between 2-5 seconds
const delay = () => new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))

/**
 * Search via FlareSolverr (primary) or Steel (fallback).
 * Returns unique domains from search results.
 */
export async function searchWithBrowser(
  query: string,
  engine: keyof typeof SEARCH_ENGINES = "google",
): Promise<BrowserSearchResult> {
  const url = SEARCH_ENGINES[engine](query)

  // Try FlareSolverr first
  const fsHtml = await fsRequest(url)
  if (fsHtml) {
    const domains = extractDomains(fsHtml)
    return { ok: true, domains, engine, total: domains.length }
  }

  // Fallback to Steel
  const steelHtml = await steelScrape(url)
  if (steelHtml) {
    const domains = extractDomains(steelHtml)
    return { ok: true, domains, engine, total: domains.length }
  }

  return { ok: false, domains: [], engine, total: 0, error: "All browser backends failed" }
}

/**
 * Batch search: runs multiple queries across rotating engines with rate limiting.
 * Returns deduplicated domains.
 */
export async function batchSearchWithBrowser(
  queries: string[],
  onProgress?: (done: number, total: number, domains: number) => void,
): Promise<{ ok: boolean; domains: string[]; total: number; errors: string[] }> {
  const allDomains = new Set<string>()
  const errors: string[] = []
  const engines = Object.keys(SEARCH_ENGINES) as (keyof typeof SEARCH_ENGINES)[]
  let engineIdx = 0

  for (let i = 0; i < queries.length; i++) {
    const engine = engines[engineIdx % engines.length]
    engineIdx++

    const result = await searchWithBrowser(queries[i], engine)

    if (result.ok) {
      for (const d of result.domains) allDomains.add(d)
    } else if (result.error) {
      errors.push(`${queries[i].slice(0, 30)} [${engine}]: ${result.error}`)
    }

    if (onProgress) onProgress(i + 1, queries.length, allDomains.size)

    // Rate limiting delay between queries
    if (i < queries.length - 1) await delay()
  }

  return {
    ok: allDomains.size > 0,
    domains: [...allDomains].sort(),
    total: allDomains.size,
    errors,
  }
}

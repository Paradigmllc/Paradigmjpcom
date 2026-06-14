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
  providersTried?: string[]
}

// Realistic Chrome headers
const BROWSER_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function flareSolverrEndpoint(): string | null {
  const raw = optionalEnv("FLARESOLVERR_URL") ?? optionalEnv("FLARESOLVERR_API_URL")
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (!/\/v1\/?$/.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/v1`
    }
    return url.toString()
  } catch (error) {
    console.error("[browser-search] invalid FlareSolverr URL:", error)
    return null
  }
}

export function getBrowserSearchBackendStatus(): {
  configured: boolean
  flaresolverrUrl: string | null
  steelBaseUrl: string | null
  providers: string[]
  error?: string
} {
  const flaresolverrUrl = flareSolverrEndpoint()
  const steelBaseUrl = optionalEnv("STEEL_BASE_URL")
  const providers = [
    ...(flaresolverrUrl ? ["flaresolverr"] : []),
    ...(steelBaseUrl ? ["steel"] : []),
  ]
  return {
    configured: providers.length > 0,
    flaresolverrUrl,
    steelBaseUrl,
    providers,
    error: providers.length > 0 ? undefined : "FLARESOLVERR_URL or STEEL_BASE_URL is required for browser search",
  }
}

async function fsRequest(url: string): Promise<string | null> {
  const fsUrl = flareSolverrEndpoint()
  if (!fsUrl) return null
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
  const configuredSteelUrl = optionalEnv("STEEL_BASE_URL")
  if (!configuredSteelUrl) return null
  const steelUrl = configuredSteelUrl.replace(/\/+$/, "")
  const apiKey = optionalEnv("STEEL_API_KEY")
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
  const re = /https?:\/\/([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}/gi
  let match
  while ((match = re.exec(html)) !== null) {
    const raw = match[0].replace(/^https?:\/\//, "").split("/")[0].toLowerCase()
    // Validate: no double dots, no Google properties
    if (!raw || raw.includes("..") || /^(www\.)?google\./.test(raw) || raw.length < 5) continue
    if (BLOCKED_DOMAINS.has(raw.replace(/^www\./, ""))) continue
    if (raw.includes("google") || raw.includes("gstatic") || raw.includes("youtube")) continue
    domains.add(raw.replace(/^www\./, ""))
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
  const backend = getBrowserSearchBackendStatus()
  const providersTried = backend.providers

  if (!backend.configured) {
    console.error("[browser-search] backend not configured:", backend.error)
    return {
      ok: false,
      domains: [],
      engine,
      total: 0,
      error: backend.error,
      providersTried,
    }
  }

  // Try FlareSolverr first when configured.
  const fsHtml = await fsRequest(url)
  if (fsHtml) {
    const domains = extractDomains(fsHtml)
    return { ok: true, domains, engine, total: domains.length, providersTried }
  }

  // Fallback to Steel when configured.
  const steelHtml = await steelScrape(url)
  if (steelHtml) {
    const domains = extractDomains(steelHtml)
    return { ok: true, domains, engine, total: domains.length, providersTried }
  }

  return { ok: false, domains: [], engine, total: 0, error: "All configured browser backends failed", providersTried }
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

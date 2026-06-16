/**
 * browser-search.ts — FlareSolverr + Steel based Google/Brave search.
 * Uses real browser (Chrome) to bypass CAPTCHA and bot detection.
 * No proxy required — the browser itself acts as the proxy.
 *
 * Architecture:
 *   FlareSolverr (primary) — lightweight, fast, already running
 *   Steel Browser (fallback) — heavier but more stealthy
 *   Retry: exponential backoff across engines (3 max retries)
 */

export interface BrowserSearchResult {
  ok: boolean
  domains: string[]
  engine: string
  total: number
  error?: string
  providersTried?: string[]
  retryCount?: number
}

import { isGarbageSearchResult, validateCompanyName } from "../data-quality-guard"

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
    error: providers.length > 0 ? undefined : "FLARESOLVERR_API_URL or STEEL_BASE_URL is required for browser search",
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

const BLOCKED_DOMAIN_SUFFIXES = [
  "google.com", "youtube.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
  "linkedin.com", "reddit.com", "wikipedia.org", "tiktok.com", "pinterest.com",
  "amazon.com", "ebay.com", "etsy.com", "shopify.com", "alibaba.com",
  "apple.com", "microsoft.com", "github.com", "stackoverflow.com",
  "brave.com", "brave.app", "duckduckgo.com", "duck.com", "bing.com", "yahoo.com", "mozilla.org",
  "storeleads.app", "techbehemoths.com", "clutch.co", "similarweb.com", "builtwith.com",
  "yamato-hd.co.jp", "kuronekoyamato.co.jp", "mitsui.com", "komoju.com",
  "gstatic.com", "googleusercontent.com", "ggpht.com", "googleapis.com",
  "googletagmanager.com", "googleadservices.com", "fonts.gstatic.com",
  "encrypted-tbn0.gstatic.com", "lh3.googleusercontent.com",
]

function normalizeSearchDomain(raw: string): string | null {
  const domain = raw
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/:\d+$/, "")
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "")
  if (!domain || domain.includes("..") || domain.length < 5 || !domain.includes(".")) return null
  if (!/^[a-z0-9.-]+$/.test(domain)) return null
  return domain
}

export function isBlockedBrowserSearchDomain(domain: string): boolean {
  const normalized = domain.replace(/^www\./, "").toLowerCase()
  return BLOCKED_DOMAIN_SUFFIXES.some((blocked) => (
    normalized === blocked || normalized.endsWith(`.${blocked}`)
  ))
}

function domainFromCandidateUrl(raw: string): string | null {
  if (!URL.canParse(raw, "https://search.local")) return null
  const url = new URL(raw, "https://search.local")
  if (url.hostname === "search.local" && !url.searchParams.has("q") && !url.searchParams.has("url") && !url.searchParams.has("uddg")) return null
  const redirected = url.searchParams.get("q") || url.searchParams.get("url") || url.searchParams.get("uddg")
  if (redirected && /^https?:\/\//i.test(redirected)) return domainFromCandidateUrl(redirected)
  if (!/^https?:$/.test(url.protocol)) return null
  const domain = normalizeSearchDomain(url.hostname)
  if (!domain || isBlockedBrowserSearchDomain(domain)) return null
  return domain
}

export function extractDomains(html: string): string[] {
  const domains = new Set<string>()
  const hrefRe = /\bhref=(["'])(.*?)\1/gi
  let hrefMatch
  while ((hrefMatch = hrefRe.exec(html)) !== null) {
    const href = hrefMatch[2].replace(/&amp;/g, "&")
    const domain = domainFromCandidateUrl(href)
    if (domain) domains.add(domain)
  }
  return [...domains]
}

// Search engines with their URL templates
const SEARCH_ENGINES: Record<string, (query: string) => string> = {
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en&num=30`,
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web`,
  duckduckgo: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
}

const ENGINE_KEYS = Object.keys(SEARCH_ENGINES) as (keyof typeof SEARCH_ENGINES)[]

// Adaptive delay: longer for Google (strictest rate limiting), shorter for others
function engineDelay(engine: keyof typeof SEARCH_ENGINES): number {
  switch (engine) {
    case "google": return 4000 + Math.random() * 6000
    case "brave": return 2000 + Math.random() * 3000
    case "duckduckgo": return 1500 + Math.random() * 2000
    default: return 2000 + Math.random() * 3000
  }
}

// Generic delay between queries
const delay = () => new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))

// Exponential backoff: 2s → 4s → 8s
async function retryBackoff(attempt: number): Promise<void> {
  return new Promise(r => setTimeout(r, 2 ** attempt * 1000))
}

/**
 * Search via FlareSolverr (primary) or Steel (fallback).
 * Retries up to 3 times with exponential backoff and engine rotation.
 */
export async function searchWithBrowser(
  query: string,
  engine: keyof typeof SEARCH_ENGINES = "google",
  skipEngines: Set<string> = new Set(),
): Promise<BrowserSearchResult> {
  const url = SEARCH_ENGINES[engine](query)
  const backend = getBrowserSearchBackendStatus()
  const providersTried = backend.providers

  if (!backend.configured) {
    // Fall back to SearXNG when no browser backend is available
    console.warn("[browser-search] no browser backend, falling back to SearXNG")
    try {
      const { buildSearxngSearchUrl } = await import("../searxng-normalize")
      const { fetchSearxngPage } = await import("../sources/searxng-source-helpers")
      const searxngBaseUrl = process.env.SEARXNG_BASE_URL || "https://searx.be"
      const searchUrl = buildSearxngSearchUrl(searxngBaseUrl, { query, page: 1, language: "en", engines: [], categories: ["general"], safesearch: 1, timeRange: null })
      const page = await fetchSearxngPage(searchUrl, searxngBaseUrl)
      const html = typeof page?.content === "string" ? page.content : JSON.stringify(page)
      if (html && !isGarbageSearchResult(html)) {
        const domains = extractDomains(html)
        if (domains.length > 0) {
          return { ok: true, domains, engine, total: domains.length, providersTried: ["searxng"] }
        }
      }
    } catch (searxngError) {
      console.warn("[browser-search] SearXNG fallback also failed:", searxngError)
    }
    console.error("[browser-search] all backends (browser + SearXNG) unavailable:", backend.error)
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
  if (fsHtml && !isGarbageSearchResult(fsHtml)) {
    const domains = extractDomains(fsHtml)
    return { ok: true, domains, engine, total: domains.length, providersTried }
  }

  // Fallback to Steel when configured.
  const steelHtml = await steelScrape(url)
  if (steelHtml && !isGarbageSearchResult(steelHtml)) {
    const domains = extractDomains(steelHtml)
    return { ok: true, domains, engine, total: domains.length, providersTried }
  }

  return { ok: false, domains: [], engine, total: 0, error: "All configured browser backends failed", providersTried }
}

/**
 * Retry-enabled search: attempts up to maxRetries with engine rotation and exponential backoff.
 * When an engine fails, rotates to next engine for retry.
 */
async function searchWithRetry(
  query: string,
  engine: keyof typeof SEARCH_ENGINES,
  skipEngines: Set<string>,
  maxRetries = 3,
): Promise<BrowserSearchResult> {
  let lastResult: BrowserSearchResult | null = null
  let currentEngine = engine

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Rotate engine on retry
      const available = ENGINE_KEYS.filter(e => e !== currentEngine && !skipEngines.has(e))
      currentEngine = available.length > 0 ? available[attempt % available.length] : currentEngine
      await retryBackoff(attempt)
      console.info(`[browser-search] retry ${attempt}/${maxRetries} for "${query.slice(0, 40)}" via ${currentEngine}`)
    }

    const result = await searchWithBrowser(query, currentEngine, skipEngines)
    lastResult = result

    if (result.ok) return { ...result, retryCount: attempt }
  }

  return { ...lastResult!, retryCount: maxRetries }
}

/**
 * Batch search: runs multiple queries across rotating engines with rate limiting.
 * Tracks engine failures and temporarily skips engines with 3+ consecutive failures.
 */
export async function batchSearchWithBrowser(
  queries: string[],
  onProgress?: (done: number, total: number, domains: number) => void,
): Promise<{ ok: boolean; domains: string[]; total: number; errors: string[] }> {
  const allDomains = new Set<string>()
  const errors: string[] = []
  let engineIdx = 0
  const engineFailStreak: Record<string, number> = { google: 0, brave: 0, duckduckgo: 0 }
  const skipEngines = new Set<string>()

  for (let i = 0; i < queries.length; i++) {
    // Pick engine, skipping temporarily-dead ones
    let engine: keyof typeof SEARCH_ENGINES = ENGINE_KEYS[engineIdx % ENGINE_KEYS.length]
    while (skipEngines.has(engine)) {
      engineIdx++
      engine = ENGINE_KEYS[engineIdx % ENGINE_KEYS.length]
    }

    const result = await searchWithRetry(queries[i], engine, skipEngines)
    engineIdx++

    if (result.ok) {
      for (const d of result.domains) allDomains.add(d)
      engineFailStreak[engine] = 0
    } else if (result.error) {
      errors.push(`${queries[i].slice(0, 40)} [${result.engine} retry=${result.retryCount ?? 0}]: ${result.error}`)
      engineFailStreak[engine] = (engineFailStreak[engine] ?? 0) + 1

      // Temporarily skip engine after 3 consecutive failures (re-enables after 10 queries)
      if (engineFailStreak[engine] >= 3) {
        console.warn(`[browser-search] engine ${engine} marked as failing (${engineFailStreak[engine]} consecutive), skipping temporarily`)
        skipEngines.add(engine)
        setTimeout(() => {
          skipEngines.delete(engine)
          engineFailStreak[engine] = 0
          console.warn(`[browser-search] engine ${engine} re-enabled`)
        }, 300_000) // 5 minute cooldown
      }
    }

    if (onProgress) onProgress(i + 1, queries.length, allDomains.size)

    // Adaptive rate limiting based on engine
    if (i < queries.length - 1) await delay()
  }

  return {
    ok: allDomains.size > 0,
    domains: [...allDomains].sort(),
    total: allDomains.size,
    errors,
  }
}

import { getProxyFetchOptions } from "../proxy-agent"
import type { Region } from "../types"

export type ExternalDiscoverySource = "crawl4ai" | "crawlee" | "stagehand"

export interface ExternalFormDiscoveryHit {
  formUrl: string | null
  candidates: string[]
  confidence: number
  source: ExternalDiscoverySource
  detail: string
}

const CONTACT_RE =
  /contact|inquiry|enquiry|toiawase|otoiawase|get-in-touch|contact-us|form|request-a-demo|book-a-demo|お問い合わせ|お問合せ|問い合わせ|資料請求|相談|無料相談|見積|ご相談/i

const FORM_SIGNATURE_RE =
  /<form\b|contact\s*form\s*7|wpforms|gravityforms|mw_wp_form|formrun|hubspot|hs-form|pardot|marketo|typeform|google\.com\/forms/i

const TRUSTED_EXTERNAL_FORM_HOST_RE =
  /(^|\.)((docs\.)?google\.com|forms\.office\.com|formrun\.com|form\.run|typeform\.com|hsforms\.com|hubspot\.com|marketo\.com|pardot\.com|kintoneapp\.com|jotform\.com)$/i

import { optionalEnv } from "../japan-readiness-utils"

function normalizeHttpBase(raw: string): URL | null {
  try {
    const url = new URL(raw)
    if (url.protocol === "ws:") url.protocol = "http:"
    if (url.protocol === "wss:") url.protocol = "https:"
    url.pathname = url.pathname.replace(/\/+$/, "")
    url.search = ""
    url.hash = ""
    return url
  } catch (error) {
    console.warn("[external-form-discovery] invalid service URL:", error)
    return null
  }
}

function withPath(base: URL, path: string): URL {
  const url = new URL(base)
  const basePath = url.pathname.replace(/\/+$/, "")
  url.pathname = `${basePath}/${path.replace(/^\/+/, "")}`.replace(/\/+/g, "/")
  return url
}

function uniqueUrls(urls: Iterable<string>): string[] {
  return [...new Set([...urls].filter((url) => /^https?:\/\//i.test(url)))].slice(0, 80)
}

export function isAllowedFormUrlForOrigin(origin: string, candidate: string): boolean {
  try {
    const stripWww = (host: string): string => host.toLowerCase().replace(/^www\./, "")
    const originHost = stripWww(new URL(origin).hostname)
    const candidateHost = stripWww(new URL(candidate, origin).hostname)
    if (candidateHost === originHost || candidateHost.endsWith(`.${originHost}`)) {
      return true
    }
    return TRUSTED_EXTERNAL_FORM_HOST_RE.test(candidateHost)
  } catch (error) {
    console.warn("[external-form-discovery] invalid URL safety check:", { origin, candidate, error })
    return false
  }
}

function resolveUrl(origin: string, href: string): string | null {
  try {
    const resolved = new URL(href, origin).toString()
    return isAllowedFormUrlForOrigin(origin, resolved) ? resolved : null
  } catch (error) {
    console.warn("[external-form-discovery] invalid discovered href:", { href, error })
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function collectTextUrls(value: unknown, origin: string, out: Set<string>): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/https?:\/\/[^\s"'<>)]*/gi)) {
      const url = match[0].replace(/[),.;]+$/, "")
      if (CONTACT_RE.test(url) && isAllowedFormUrlForOrigin(origin, url)) out.add(url)
    }
    const hrefRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
    let hrefMatch: RegExpExecArray | null
    while ((hrefMatch = hrefRe.exec(value)) !== null) {
      const href = hrefMatch[1]
      const label = hrefMatch[2].replace(/<[^>]+>/g, " ")
      if (!CONTACT_RE.test(href) && !CONTACT_RE.test(label)) continue
      const resolved = resolveUrl(origin, href)
      if (resolved) out.add(resolved)
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) collectTextUrls(item, origin, out)
    return
  }

  const record = asRecord(value)
  for (const child of Object.values(record)) collectTextUrls(child, origin, out)
}

function pickKnownUrl(payload: unknown, origin: string): string | null {
  const queue: unknown[] = [payload]
  const keys = ["formUrl", "form_url", "contactFormUrl", "contact_form_url", "url", "href"]
  while (queue.length > 0) {
    const item = queue.shift()
    if (Array.isArray(item)) {
      queue.push(...item)
      continue
    }
    const record = asRecord(item)
    for (const key of keys) {
      const value = record[key]
      if (typeof value === "string" && CONTACT_RE.test(value)) {
        const resolved = resolveUrl(origin, value)
        if (resolved) return resolved
      }
    }
    queue.push(...Object.values(record).filter((value) => typeof value === "object" && value !== null))
  }
  return null
}

function hitFromPayload(
  source: ExternalDiscoverySource,
  origin: string,
  payload: unknown,
  fallbackDetail: string,
): ExternalFormDiscoveryHit | null {
  const candidates = new Set<string>()
  collectTextUrls(payload, origin, candidates)
  const known = pickKnownUrl(payload, origin)
  if (known) candidates.add(known)
  const all = uniqueUrls(candidates)
  const best = known ?? all[0] ?? null
  if (!best) return null
  return {
    formUrl: best,
    candidates: all,
    confidence: source === "crawl4ai" ? 84 : source === "stagehand" ? 78 : 70,
    source,
    detail: fallbackDetail,
  }
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (e) {
    console.warn("[external-form-discovery] JSON parse failed, falling back to text:", e)
    return text
  }
}

export async function discoverWithCrawl4Ai(input: {
  origin: string
  region?: Region
  timeoutMs: number
}): Promise<ExternalFormDiscoveryHit | null> {
  const rawBase = optionalEnv("CRAWL4AI_BASE_URL")
  if (!rawBase) return null
  const base = normalizeHttpBase(rawBase)
  if (!base) return null

  const path = optionalEnv("CRAWL4AI_FORM_DISCOVERY_PATH") ?? "/discover-form"
  const url = withPath(base, path)
  const apiKey = optionalEnv("CRAWL4AI_API_KEY")
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  try {
    const res = await fetch(
      url.toString(),
      getProxyFetchOptions({
        method: "POST",
        headers,
        body: JSON.stringify({
          url: input.origin,
          region: input.region ?? "jp",
          task: "contact_form_discovery",
          keywords: ["contact", "inquiry", "お問い合わせ", "問い合わせ", "資料請求", "相談"],
        }),
        signal: AbortSignal.timeout(input.timeoutMs),
      }),
    )
    if (!res.ok) {
      console.warn("[external-form-discovery] Crawl4AI discovery failed:", { status: res.status })
      return null
    }
    const payload = await readJsonOrText(res)
    return hitFromPayload("crawl4ai", input.origin, payload, "Crawl4AI form discovery")
  } catch (error) {
    console.warn("[external-form-discovery] Crawl4AI unreachable:", error)
    return null
  }
}

export async function discoverWithCrawleeWorker(input: {
  origin: string
  timeoutMs: number
}): Promise<ExternalFormDiscoveryHit | null> {
  const rawBase = optionalEnv("CRAWLEE_WORKER_URL") ?? optionalEnv("OUTREACH_WORKER_URL")
  const secret = optionalEnv("CRAWLEE_WORKER_SECRET") ?? optionalEnv("OUTREACH_WORKER_SECRET")
  if (!rawBase || !secret) return null
  const base = normalizeHttpBase(rawBase)
  if (!base) return null
  const url = withPath(base, "/discover-spa")

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret },
      body: JSON.stringify({ homeUrl: input.origin }),
      signal: AbortSignal.timeout(input.timeoutMs),
    })
    if (!res.ok) {
      console.error("[external-form-discovery] Crawlee worker returned:", { status: res.status })
      return null
    }
    const payload = await readJsonOrText(res)
    return hitFromPayload("crawlee", input.origin, payload, "Crawlee worker SPA discovery")
  } catch (error) {
    console.warn("[external-form-discovery] Crawlee worker discovery failed:", error)
    return null
  }
}


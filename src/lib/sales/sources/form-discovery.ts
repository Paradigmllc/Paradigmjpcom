/**
 * Lightweight contact-form discovery for the sales outreach pipeline.
 *
 * The function intentionally starts with cheap, non-browser checks:
 * homepage anchors, sitemap URLs, and common contact paths. Browser-based SPA
 * discovery is delegated to BrowserProvider so the Next.js app does not need a
 * local Chromium dependency.
 */

import { callDeepSeek } from "@/lib/deepseek"
import type { Region } from "../types"
import { getProxyFetchOptions } from "../proxy-agent"
import {
  discoverWithCrawl4Ai,
} from "./external-form-discovery"

export type DiscoveryMethod =
  | "regex"
  | "sitemap"
  | "heuristic"
  | "llm"
  | "crawl4ai"
  | "spa"
  | "fallback"
  | "none"

export interface FormDiscoveryResult {
  formUrl: string | null
  method: DiscoveryMethod
  confidence: number
  candidates: string[]
  traceMs: number
}

export interface FormDiscoveryOptions {
  homeUrl: string
  region?: Region
  homepageHtml?: string
  enableLlm?: boolean
  spaDiscover?: (url: string) => Promise<string | null>
  timeoutMs?: number
}

const HEURISTIC_PATHS_JP = [
  "/contact",
  "/contact/",
  "/contact.html",
  "/contact.php",
  "/inquiry",
  "/inquiry/",
  "/toiawase",
  "/otoiawase",
  "/otoiawase/",
  "/contact-us",
  "/form",
  "/form/",
  "/お問い合わせ",
  "/お問い合わせ/",
  "/お問合せ",
  "/お問合せ/",
  "/問い合わせ",
  "/問い合わせ/",
  "/資料請求",
  "/資料請求/",
  "/相談",
  "/相談/",
  "/無料相談",
  "/無料相談/",
] as const

const HEURISTIC_PATHS_GLOBAL = [
  "/contact",
  "/contact/",
  "/contact-us",
  "/contact-us/",
  "/contact.html",
  "/get-in-touch",
  "/inquiry",
  "/enquiry",
  "/support",
  "/form",
  "/request-a-demo",
  "/book-a-demo",
] as const

const CONTACT_KEYWORDS =
  /contact|inquiry|enquiry|toiawase|otoiawase|get-in-touch|contact-us|form|request-a-demo|book-a-demo|お問い合わせ|お問合せ|問い合わせ|資料請求|相談|無料相談|見積|ご相談/i

const FORM_SIGNATURE_RE =
  /<form\b|contact\s*form\s*7|wpforms|gravityforms|mw_wp_form|formrun|hubspot|hs-form|pardot|marketo|typeform|google\.com\/forms/i

export function normalizeOrigin(input: string): string | null {
  try {
    const withProto = input.startsWith("http") ? input : `https://${input}`
    const url = new URL(withProto)
    return `${url.protocol}//${url.host}`
  } catch (error) {
    console.warn("[form-discovery] invalid origin:", error)
    return null
  }
}

export function resolveHref(origin: string, href: string): string | null {
  try {
    return new URL(href, origin).toString()
  } catch (error) {
    console.warn("[form-discovery] invalid href:", { href, error })
    return null
  }
}

function uniqueUrls(urls: Iterable<string>): string[] {
  return [...new Set(urls)].slice(0, 80)
}

function scoreContactUrl(url: string): number {
  const normalized = url.toLowerCase()
  if (/contact|inquiry|enquiry|otoiawase|toiawase|お問い合わせ|お問合せ|問い合わせ/.test(normalized)) {
    return 90
  }
  if (/form|相談|無料相談|資料請求|見積|get-in-touch/.test(normalized)) return 78
  return 40
}

function pickBestCandidate(urls: string[]): string | null {
  return [...urls].sort((a, b) => scoreContactUrl(b) - scoreContactUrl(a))[0] ?? null
}

function extractContactAnchors(origin: string, html: string): string[] {
  const hits = new Set<string>()
  const anchorRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]
    const label = match[2].replace(/<[^>]+>/g, " ")
    if (!CONTACT_KEYWORDS.test(href) && !CONTACT_KEYWORDS.test(label)) continue

    const absoluteUrl = resolveHref(origin, href)
    if (absoluteUrl?.startsWith("http")) hits.add(absoluteUrl)
  }

  return uniqueUrls(hits)
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "ParadigmFormDiscovery/1.1 (+https://paradigmjp.com)" },
      })
    )
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType && !contentType.includes("text/") && !contentType.includes("xml")) return null
    return await res.text()
  } catch (error) {
    console.warn("[form-discovery] fetch failed:", { url, error })
    return null
  }
}

async function inspectContactPage(url: string, timeoutMs: number): Promise<"form" | "page" | "missing"> {
  const html = await fetchText(url, timeoutMs)
  if (!html) return "missing"
  if (FORM_SIGNATURE_RE.test(html)) return "form"
  return CONTACT_KEYWORDS.test(html) ? "page" : "missing"
}

function extractSitemapUrls(xml: string): string[] {
  const out: string[] = []
  const locRe = /<loc>([^<]+)<\/loc>/gi
  let match: RegExpExecArray | null
  while ((match = locRe.exec(xml)) !== null) out.push(match[1].trim())
  return uniqueUrls(out)
}

const LLM_SYSTEM =
  'You identify the best contact-form URL for B2B outbound outreach. Return JSON only: {"url":"https://...","confidence":0.0-1.0}. If no contact form or inquiry page is likely, return {"url":null,"confidence":0}.'

async function llmPickFormUrl(
  origin: string,
  candidates: string[],
  timeoutMs: number,
): Promise<{ url: string | null; confidence: number }> {
  if (candidates.length === 0) return { url: null, confidence: 0 }

  const res = await callDeepSeek(
    [
      { role: "system", content: LLM_SYSTEM },
      { role: "user", content: `Site: ${origin}\nCandidate URLs:\n${candidates.slice(0, 60).join("\n")}` },
    ],
    { temperature: 0.1, maxTokens: 120, responseFormat: "json_object", timeoutMs },
  )
  if (!res.ok || !res.text) return { url: null, confidence: 0 }

  try {
    const parsed = JSON.parse(res.text) as { url?: string | null; confidence?: number }
    return { url: parsed.url ?? null, confidence: parsed.confidence ?? 0 }
  } catch (error) {
    console.warn("[form-discovery] LLM JSON parse failed:", error)
    return { url: null, confidence: 0 }
  }
}

export async function discoverFormUrl(opts: FormDiscoveryOptions): Promise<FormDiscoveryResult> {
  const started = Date.now()
  const timeoutMs = opts.timeoutMs ?? 8_000
  const origin = normalizeOrigin(opts.homeUrl)
  const candidates = new Set<string>()

  const done = (formUrl: string | null, method: DiscoveryMethod, confidence: number): FormDiscoveryResult => ({
    formUrl,
    method,
    confidence,
    candidates: uniqueUrls(candidates),
    traceMs: Date.now() - started,
  })

  if (!origin) return done(null, "none", 0)

  const homepageHtml = opts.homepageHtml ?? (await fetchText(origin, timeoutMs))
  if (homepageHtml) {
    for (const url of extractContactAnchors(origin, homepageHtml)) candidates.add(url)
    const best = pickBestCandidate([...candidates])
    if (best) {
      const pageType = await inspectContactPage(best, timeoutMs)
      if (pageType === "form") return done(best, "regex", 88)
      if (pageType === "page") return done(best, "regex", 72)
    }
  }

  const sitemapXml = await fetchText(`${origin}/sitemap.xml`, timeoutMs)
  if (sitemapXml) {
    const contactSitemapUrls = extractSitemapUrls(sitemapXml).filter((url) => CONTACT_KEYWORDS.test(url))
    for (const url of contactSitemapUrls) candidates.add(url)
    const best = pickBestCandidate(contactSitemapUrls)
    if (best) {
      const pageType = await inspectContactPage(best, timeoutMs)
      if (pageType === "form") return done(best, "sitemap", 90)
      if (pageType === "page") return done(best, "sitemap", 74)
    }
  }

  const crawl4Ai = await discoverWithCrawl4Ai({ origin, region: opts.region, timeoutMs })
  if (crawl4Ai?.formUrl) {
    for (const url of crawl4Ai.candidates) candidates.add(url)
    return done(crawl4Ai.formUrl, "crawl4ai", crawl4Ai.confidence)
  }

  const paths = opts.region === "global" ? HEURISTIC_PATHS_GLOBAL : HEURISTIC_PATHS_JP
  for (const path of paths) {
    const candidate = `${origin}${encodeURI(path)}`
    const pageType = await inspectContactPage(candidate, Math.min(timeoutMs, 4_000))
    if (pageType === "missing") continue

    candidates.add(candidate)
    if (pageType === "form") return done(candidate, "heuristic", 82)
    return done(candidate, "heuristic", 65)
  }

  if (opts.enableLlm !== false && candidates.size > 0) {
    const picked = await llmPickFormUrl(origin, [...candidates], timeoutMs)
    if (picked.url) return done(picked.url, "llm", Math.round(picked.confidence * 100))
  }

  if (opts.spaDiscover) {
    try {
      const spaUrl = await opts.spaDiscover(origin)
      if (spaUrl) {
        candidates.add(spaUrl)
        return done(spaUrl, "spa", 65)
      }
    } catch (error) {
      console.warn("[form-discovery] SPA discovery failed:", error)
    }
  }

  return done(origin, "fallback", 20)
}

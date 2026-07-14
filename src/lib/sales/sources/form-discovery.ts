/**
 * Lightweight contact-form discovery for the sales outreach pipeline.
 *
 * The function intentionally starts with cheap, non-browser checks:
 * homepage anchors, sitemap URLs, and common contact paths. Browser-based SPA
 * discovery is delegated to BrowserProvider so the Next.js app does not need a
 * local Chromium dependency.
 */

import { callDeepSeek } from "@/lib/deepseek"
import { load } from "cheerio"
import type { Region } from "../types"
import { getProxyFetchOptions } from "../proxy-agent"
import {
  discoverWithCrawl4Ai,
  isAllowedFormUrlForOrigin,
} from "./external-form-discovery"
import { inspectContactFormHtml, type ContactFormInspection } from "./contact-form-inspection"

export type DiscoveryMethod =
  | "dom"
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
  verification: "form" | "page" | "fallback" | "none"
  confidence: number
  inspection: ContactFormInspection | null
  candidates: string[]
  traceMs: number
}

export interface FormDiscoveryOptions {
  homeUrl: string
  region?: Region
  homepageHtml?: string
  enableLlm?: boolean
  enableCrawl4Ai?: boolean
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

async function mapLimit<T, R>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return output
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
  const $ = load(html)
  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href") ?? ""
    const label = $(element).text()
    if (!CONTACT_KEYWORDS.test(href) && !CONTACT_KEYWORDS.test(label)) return

    const absoluteUrl = resolveHref(origin, href)
    if (absoluteUrl?.startsWith("http") && isAllowedFormUrlForOrigin(origin, absoluteUrl)) hits.add(absoluteUrl)
  })

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

async function inspectContactPage(url: string, origin: string, timeoutMs: number): Promise<ContactFormInspection> {
  const html = await fetchText(url, timeoutMs)
  if (!html) return { status: "missing", reason: "no_contact_intent", fields: [], formCount: 0, action: null, sameOrigin: false, trustedProvider: false }
  return inspectContactFormHtml(html, url, origin)
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
  let bestPage: string | null = null
  let bestPageMethod: DiscoveryMethod = "none"
  let bestPageConfidence = 0
  let bestPageInspection: ContactFormInspection | null = null

  const rememberPage = (url: string, method: DiscoveryMethod, confidence: number, inspection: ContactFormInspection) => {
    if (confidence <= bestPageConfidence) return
    bestPage = url
    bestPageMethod = method
    bestPageConfidence = confidence
    bestPageInspection = inspection
  }

  const done = (
    formUrl: string | null,
    method: DiscoveryMethod,
    verification: FormDiscoveryResult["verification"],
    confidence: number,
    inspection: ContactFormInspection | null = null,
  ): FormDiscoveryResult => ({
    formUrl,
    method,
    verification,
    confidence,
    inspection,
    candidates: uniqueUrls(candidates),
    traceMs: Date.now() - started,
  })

  if (!origin) return done(null, "none", "none", 0)

  const homepageHtml = opts.homepageHtml ?? (await fetchText(origin, timeoutMs))
  if (homepageHtml) {
    for (const url of extractContactAnchors(origin, homepageHtml)) candidates.add(url)
    const best = pickBestCandidate([...candidates])
    if (best) {
      const pageType = await inspectContactPage(best, origin, timeoutMs)
      if (pageType.status === "form") return done(best, "dom", "form", 94, pageType)
      if (pageType.status === "page") rememberPage(best, "dom", 72, pageType)
    }
  }

  const sitemapXml = await fetchText(`${origin}/sitemap.xml`, timeoutMs)
  if (sitemapXml) {
    const contactSitemapUrls = extractSitemapUrls(sitemapXml).filter((url) => CONTACT_KEYWORDS.test(url))
    for (const url of contactSitemapUrls) candidates.add(url)
    const best = pickBestCandidate(contactSitemapUrls)
    if (best) {
      const pageType = await inspectContactPage(best, origin, timeoutMs)
      if (pageType.status === "form") return done(best, "sitemap", "form", 95, pageType)
      if (pageType.status === "page") rememberPage(best, "sitemap", 74, pageType)
    }
  }

  const crawl4Ai = opts.enableCrawl4Ai === false
    ? null
    : await discoverWithCrawl4Ai({ origin, region: opts.region, timeoutMs })
  if (crawl4Ai?.formUrl) {
    for (const url of crawl4Ai.candidates) candidates.add(url)
    const pageType = await inspectContactPage(crawl4Ai.formUrl, origin, timeoutMs)
    if (pageType.status === "form") return done(crawl4Ai.formUrl, "crawl4ai", "form", Math.max(crawl4Ai.confidence, 90), pageType)
    if (pageType.status === "page") rememberPage(crawl4Ai.formUrl, "crawl4ai", Math.min(crawl4Ai.confidence, 74), pageType)
  }

  const paths = opts.region === "global" ? HEURISTIC_PATHS_GLOBAL : HEURISTIC_PATHS_JP
  const perPathTimeout = Math.min(timeoutMs, 4_000)
  const probed = await mapLimit(paths, 3, async (path) => {
    try {
      const candidate = `${origin}${encodeURI(path)}`
      const pageType = await inspectContactPage(candidate, origin, perPathTimeout)
      return { path, candidate, pageType }
    } catch (error) {
      console.warn("[form-discovery] heuristic path failed:", { path, error })
      return null
    }
  })
  for (const result of probed) {
    if (!result) continue
    const { candidate, pageType } = result
    if (pageType.status === "missing") continue
    candidates.add(candidate)
    if (pageType.status === "form") return done(candidate, "heuristic", "form", 92, pageType)
    if (pageType.status === "page") rememberPage(candidate, "heuristic", 65, pageType)
  }

  if (opts.enableLlm !== false && candidates.size > 0) {
    const picked = await llmPickFormUrl(origin, [...candidates], timeoutMs)
    if (picked.url) {
      const pageType = await inspectContactPage(picked.url, origin, timeoutMs)
      if (pageType.status === "form") return done(picked.url, "llm", "form", Math.max(Math.round(picked.confidence * 100), 90), pageType)
      if (pageType.status === "page") rememberPage(picked.url, "llm", Math.min(Math.round(picked.confidence * 100), 70), pageType)
    }
  }

  if (opts.spaDiscover) {
    try {
      const spaUrl = await opts.spaDiscover(origin)
      if (spaUrl) {
        candidates.add(spaUrl)
        const pageType = await inspectContactPage(spaUrl, origin, timeoutMs)
        if (pageType.status === "form") return done(spaUrl, "spa", "form", 90, pageType)
        if (pageType.status === "page") rememberPage(spaUrl, "spa", 65, pageType)
      }
    } catch (error) {
      console.warn("[form-discovery] SPA discovery failed:", error)
    }
  }

  if (bestPage) return done(bestPage, bestPageMethod, "page", bestPageConfidence, bestPageInspection)
  return done(origin, "fallback", "fallback", 20)
}

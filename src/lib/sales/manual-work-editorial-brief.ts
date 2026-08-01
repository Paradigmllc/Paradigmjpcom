import "server-only"

import { load } from "cheerio"
import type { BusinessModel } from "./japan-entry-projection"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import { normalizeDomain } from "./dedup"
import { getProxyFetchOptions } from "./proxy-agent"
import {
  auditJapanMarketReadinessFromHtml,
  type JapanMarketAudit,
  type JapanMarketPresence,
} from "./sources/japan-market-audit"

const MAX_PAGE_BYTES = 600_000
const MAX_EXTRA_PAGES = 4
const PAGE_TIMEOUT_MS = 5_000
const MAX_POINTS = 28

export type ManualEditorialPageKind = "home" | "product" | "about" | "pricing" | "news" | "contact" | "other"

export interface ManualEditorialEvidencePoint {
  id: string
  pageKind: ManualEditorialPageKind
  statement: string
  sourceUrl: string
}

export interface ManualEditorialPage {
  url: string
  kind: ManualEditorialPageKind
  title: string | null
  description: string | null
  headings: string[]
  snippets: string[]
  hasContactForm: boolean
}

export interface ManualEditorialBrief {
  domain: string
  companyName: string
  countryCode: string | null
  countryConfidence: number
  countrySignals: string[]
  businessModel: BusinessModel
  productNames: string[]
  productContext: string
  pages: ManualEditorialPage[]
  evidence: ManualEditorialEvidencePoint[]
  contactUrl: string | null
  publicEmail: string | null
  contactFormDetected: boolean
  contactSignals: string[]
  japanPresence: JapanMarketPresence
  audit: JapanMarketAudit
  collectedAt: string
}

interface FetchedPage {
  url: string
  kind: ManualEditorialPageKind
  html: string
}

const COUNTRY_CODES: Record<string, string> = {
  australia: "AU", austria: "AT", belgium: "BE", brazil: "BR", canada: "CA", chile: "CL",
  china: "CN", colombia: "CO", denmark: "DK", estonia: "EE", finland: "FI", france: "FR",
  germany: "DE", hongkong: "HK", "hong kong": "HK", iceland: "IS", india: "IN",
  indonesia: "ID", ireland: "IE", italy: "IT", japan: "JP", malaysia: "MY", mexico: "MX",
  netherlands: "NL", "new zealand": "NZ", norway: "NO", philippines: "PH", poland: "PL",
  portugal: "PT", singapore: "SG", "south korea": "KR", korea: "KR", spain: "ES",
  sweden: "SE", switzerland: "CH", taiwan: "TW", thailand: "TH", turkey: "TR",
  "united kingdom": "GB", uk: "GB", "united states": "US", usa: "US", vietnam: "VN",
}

const COUNTRY_BY_TLD: Record<string, string> = {
  au: "AU", at: "AT", be: "BE", br: "BR", ca: "CA", ch: "CH", cl: "CL", cn: "CN",
  co: "CO", de: "DE", dk: "DK", ee: "EE", es: "ES", fi: "FI", fr: "FR", hk: "HK",
  id: "ID", ie: "IE", in: "IN", is: "IS", it: "IT", jp: "JP", kr: "KR", mx: "MX",
  my: "MY", nl: "NL", no: "NO", nz: "NZ", ph: "PH", pl: "PL", pt: "PT", se: "SE",
  sg: "SG", th: "TH", tr: "TR", tw: "TW", uk: "GB", us: "US", vn: "VN",
}

function publicOrigin(domain: string): string {
  const normalized = normalizeDomain(domain)
  if (!normalized || !isCustomerFacingBusinessDomain(normalized)) {
    throw new Error("A public customer-facing company domain is required")
  }
  return `https://${normalized}`
}

function clean(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function sameHostname(left: string, right: string): boolean {
  try {
    return new URL(left).hostname.replace(/^www\./, "") === new URL(right).hostname.replace(/^www\./, "")
  } catch {
    return false
  }
}

function pageKind(url: URL, anchor: string): ManualEditorialPageKind {
  const text = `${url.pathname} ${anchor}`.toLowerCase()
  if (/(?:contact|business-contact|sales|partner|partnership|wholesale|distributor|dealer|inquir|support|help|service|repair|warranty)/.test(text)) return "contact"
  if (/(?:pricing|plans?|subscriptions?|buy|shop|store|collections?|where-to-buy|retail|stockist)/.test(text)) return "pricing"
  if (/(?:products?|solutions?|platform|features?|services?|use-cases?)/.test(text)) return "product"
  if (/(?:about|company|story|mission|team)/.test(text)) return "about"
  if (/(?:news|press|media|blog|updates?|insights?)/.test(text)) return "news"
  return "other"
}

function linkPriority(kind: ManualEditorialPageKind): number {
  if (kind === "contact") return 100
  if (kind === "product") return 90
  if (kind === "pricing") return 80
  if (kind === "about") return 70
  if (kind === "news") return 60
  return 10
}

function isJapanSpecificLink(url: URL, anchor: string, hreflang: string): boolean {
  const path = `${url.pathname}${url.search}`.toLowerCase()
  return /^ja(?:-|$)/.test(hreflang.toLowerCase())
    || /(?:^|\/)(?:ja|ja-jp|jp)(?:\/|$)/.test(path)
    || /(?:japan|where-to-buy-jp|support[_/-]?jp|[_/-]jp(?:[_/-]|$))/.test(path)
    || /(?:日本語|日本|\bJapan\b)/i.test(anchor)
}

function selectEditorialLinks(homeUrl: string, html: string): Array<{ url: string; kind: ManualEditorialPageKind }> {
  const $ = load(html)
  const candidates: Array<{ url: string; kind: ManualEditorialPageKind; score: number; japanSpecific: boolean }> = []
  const seen = new Set<string>()
  $("a[href],link[hreflang][href]").each((_, element) => {
    const href = $(element).attr("href")?.trim()
    if (!href || href.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(href)) return
    let url: URL
    try {
      url = new URL(href, homeUrl)
    } catch {
      return
    }
    if (!sameHostname(homeUrl, url.toString())) return
    url.hash = ""
    const canonical = url.toString().replace(/\/$/, "")
    if (seen.has(canonical) || canonical === homeUrl.replace(/\/$/, "")) return
    const anchor = clean($(element).text() || $(element).attr("title") || $(element).attr("aria-label") || "")
    const hreflang = $(element).attr("hreflang") ?? ""
    const kind = pageKind(url, anchor)
    const japanSpecific = isJapanSpecificLink(url, anchor, hreflang)
    if (kind === "other" && !japanSpecific) return
    seen.add(canonical)
    candidates.push({
      url: canonical,
      kind,
      japanSpecific,
      score: linkPriority(kind) + (japanSpecific ? 300 : 0) + Math.min(anchor.length, 30) / 30,
    })
  })

  const selected: Array<{ url: string; kind: ManualEditorialPageKind }> = []
  const usedKinds = new Set<ManualEditorialPageKind>()
  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    if (selected.length >= MAX_EXTRA_PAGES) break
    if (!candidate.japanSpecific && usedKinds.has(candidate.kind) && candidate.kind !== "product") continue
    selected.push({ url: candidate.url, kind: candidate.kind })
    usedKinds.add(candidate.kind)
  }
  return selected
}

async function fetchHtml(url: string, kind: ManualEditorialPageKind): Promise<FetchedPage | null> {
  try {
    const response = await fetch(url, getProxyFetchOptions({
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: { "User-Agent": "ParadigmEditorialResearch/1.1 (+https://paradigmjp.com)" },
    }))
    if (!response.ok) return null
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html")) return null
    const declared = Number(response.headers.get("content-length") ?? 0)
    if (declared > MAX_PAGE_BYTES) return null
    return { url: response.url, kind, html: (await response.text()).slice(0, MAX_PAGE_BYTES) }
  } catch (error) {
    console.warn("[manual-work-editorial-brief] page fetch failed:", { url, error })
    return null
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(clean).filter((value) => value.length >= 12))]
}

function hasBusinessContactForm(html: string): boolean {
  const $ = load(html)
  for (const form of $("form").toArray()) {
    const node = $(form)
    const text = clean(node.text())
    const fields = node.find("input,textarea,select").toArray().map((field) => {
      const input = $(field)
      return `${input.attr("name") ?? ""} ${input.attr("type") ?? ""} ${input.attr("placeholder") ?? ""}`
    }).join(" ")
    const combined = `${text} ${fields}`
    const hasMessage = node.find("textarea").length > 0 || /(?:message|inquiry|enquiry|お問い合わせ|メッセージ)/i.test(combined)
    const hasIdentity = /(?:name|company|email|phone|氏名|会社|メール|電話)/i.test(combined)
    const excluded = /(?:newsletter|subscribe|search|login|sign\s?in)/i.test(combined) && !hasMessage
    if (hasMessage && hasIdentity && !excluded) return true
  }
  return false
}

function parsePage(page: FetchedPage): ManualEditorialPage {
  const $ = load(page.html)
  $("script,style,noscript,svg").remove()
  const title = clean($("title").first().text()) || null
  const description = clean(
    $('meta[name="description"]').attr("content")
      ?? $('meta[property="og:description"]').attr("content")
      ?? "",
  ) || null
  const headings = unique($("h1,h2,h3").toArray().map((element) => $(element).text()))
    .filter((value) => value.length <= 180)
    .slice(0, 12)
  const paragraphs = unique($("p,li").toArray().map((element) => $(element).text()))
    .filter((value) => value.length >= 25 && value.length <= 360)
    .slice(0, 14)
  const snippets = unique([description ?? "", ...headings, ...paragraphs]).slice(0, 16)
  return { url: page.url, kind: page.kind, title, description, headings, snippets, hasContactForm: hasBusinessContactForm(page.html) }
}

function publicEmailFromPages(pages: FetchedPage[]): string | null {
  for (const page of pages) {
    const $ = load(page.html)
    for (const element of $('a[href^="mailto:"]').toArray()) {
      const value = ($(element).attr("href") ?? "").replace(/^mailto:/i, "").split("?")[0]?.trim().toLowerCase()
      if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/(?:privacy|legal|abuse|security)@/.test(value)) return value
    }
    const visible = clean($("body").text())
    const match = visible.match(/\b(?:hello|contact|sales|partnerships?|business|info|support)@[a-z0-9.-]+\.[a-z]{2,}\b/i)
    if (match?.[0]) return match[0].toLowerCase()
  }
  return null
}

function organizationNameFromPages(pages: FetchedPage[], fallback: string): string {
  const names: Array<{ value: string; score: number }> = []
  const legalSuffix = /\b(?:Inc\.?|Ltd\.?|Limited|LLC|GmbH|AG|SAS|Pte\.?\s*Ltd\.?|Corporation|Corp\.?)\b/i
  for (const page of pages) {
    const $ = load(page.html)
    for (const element of $('script[type="application/ld+json"]').toArray()) {
      try {
        const parsed = JSON.parse($(element).text()) as unknown
        const queue: unknown[] = [parsed]
        while (queue.length > 0) {
          const value = queue.shift()
          if (Array.isArray(value)) {
            queue.push(...value)
            continue
          }
          if (!value || typeof value !== "object") continue
          const record = value as Record<string, unknown>
          const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] ?? "")
          if (/(?:Organization|Corporation|Brand)/i.test(type) && typeof record.name === "string") {
            const candidate = clean(record.name)
            if (candidate.length >= 2 && candidate.length <= 140) names.push({ value: candidate, score: legalSuffix.test(candidate) ? 100 : 80 })
          }
          queue.push(...Object.values(record))
        }
      } catch {
        // Invalid third-party JSON-LD is ignored.
      }
    }
    const copyright = clean($("body").text()).match(/©\s*(?:20\d{2}\s*)?([^©\n]{2,100}?(?:Inc\.?|Ltd\.?|Limited|LLC|GmbH|AG|Corporation|Corp\.?))/i)?.[1]
    if (copyright) names.push({ value: clean(copyright), score: 95 })
    const siteName = clean($('meta[property="og:site_name"]').attr("content") ?? "")
    if (siteName) names.push({ value: siteName, score: 60 })
  }
  const selected = names.sort((left, right) => right.score - left.score)[0]?.value
  return selected || fallback
}

function countryFromPages(domain: string, pages: ManualEditorialPage[], inputCountry: string | null): {
  code: string | null
  confidence: number
  signals: string[]
} {
  if (inputCountry) return { code: inputCountry, confidence: 100, signals: ["Country retained from an existing verified company record."] }

  const scores = new Map<string, { score: number; signals: string[] }>()
  const add = (code: string | undefined, score: number, signal: string) => {
    if (!code) return
    const current = scores.get(code) ?? { score: 0, signals: [] }
    current.score += score
    current.signals.push(clean(signal).slice(0, 220))
    scores.set(code, current)
  }

  const suffix = domain.toLowerCase().split(".").at(-1) ?? ""
  add(COUNTRY_BY_TLD[suffix], 75, `Country-code top-level domain .${suffix}`)

  const text = pages.flatMap((page) => [page.title ?? "", page.description ?? "", ...page.snippets]).join(" ")
  for (const [name, code] of Object.entries(COUNTRY_CODES)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const strong = new RegExp(`(?:headquartered|based|founded|registered|located)\\s+(?:in|at)\\s+${escaped}\\b`, "i")
    const nationality = new RegExp(`\\b${escaped}(?:ese|ian|ish)?\\s+(?:company|team|brand|manufacturer|business)\\b`, "i")
    const design = new RegExp(`(?:designed|design|made|developed)\\s+(?:in|from|by).{0,30}\\b${escaped}\\b`, "i")
    const strongMatch = text.match(strong)?.[0]
    const nationalityMatch = text.match(nationality)?.[0]
    const designMatch = text.match(design)?.[0]
    if (strongMatch) add(code, 95, strongMatch)
    if (nationalityMatch) add(code, 85, nationalityMatch)
    if (designMatch) add(code, 30, designMatch)
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1].score - left[1].score)
  const top = ranked[0]
  const second = ranked[1]
  if (!top || top[1].score < 60 || (second && second[1].score === top[1].score)) {
    return { code: null, confidence: top?.[1].score ?? 0, signals: ranked.flatMap(([, value]) => value.signals).slice(0, 4) }
  }
  return { code: top[0], confidence: Math.min(100, top[1].score), signals: top[1].signals.slice(0, 4) }
}

function extractProductNames(pages: FetchedPage[], existing: string[]): string[] {
  const names = new Set(existing.map(clean).filter((value) => value.length >= 2 && value.length <= 120))
  for (const page of pages) {
    const $ = load(page.html)
    for (const element of $('script[type="application/ld+json"]').toArray()) {
      try {
        const text = $(element).text()
        const matches = text.matchAll(/"@type"\s*:\s*"Product"[\s\S]{0,800}?"name"\s*:\s*"([^"]{2,120})"/gi)
        for (const match of matches) names.add(clean(match[1] ?? ""))
      } catch {
        // Ignore malformed structured data.
      }
    }
    if (page.kind === "product") {
      for (const heading of $("h1,h2").toArray().map((element) => clean($(element).text()))) {
        if (heading.length >= 2 && heading.length <= 120) names.add(heading)
      }
    }
  }
  return [...names].filter(Boolean).slice(0, 8)
}

function inferBusinessModel(pages: ManualEditorialPage[], fallback: BusinessModel): BusinessModel {
  const text = pages.flatMap((page) => [page.title ?? "", page.description ?? "", ...page.headings, ...page.snippets]).join(" ").toLowerCase()
  if (/add to cart|shopping cart|where to buy|authorized retailers?|online store|shop|retail|collection|buy now/.test(text)) return "ecommerce"
  if (/\bsaas\b|software|platform|subscription|cloud|\bapi\b|developer tool|artificial intelligence|\bai\b/.test(text)) return "saas"
  return fallback
}

function productContextFromPages(pages: ManualEditorialPage[], fallback: string): string {
  const preferred = pages
    .filter((page) => page.kind === "product" || page.kind === "home" || page.kind === "about")
    .flatMap((page) => [page.description ?? "", ...page.headings.slice(0, 3), ...page.snippets.slice(0, 5)])
  const value = unique(preferred).join(" | ").slice(0, 2_500)
  return value.length >= 40 ? value : clean(fallback).slice(0, 2_500)
}

function evidencePoints(pages: ManualEditorialPage[]): ManualEditorialEvidencePoint[] {
  const points: ManualEditorialEvidencePoint[] = []
  for (const page of pages) {
    for (const snippet of page.snippets) {
      if (points.length >= MAX_POINTS) break
      points.push({
        id: `e${String(points.length + 1).padStart(2, "0")}`,
        pageKind: page.kind,
        statement: snippet,
        sourceUrl: page.url,
      })
    }
  }
  return points
}

export async function collectManualEditorialBrief(input: {
  domain: string
  companyName: string
  countryCode: string | null
  businessModel: BusinessModel
  productNames?: string[]
  productContext: string
}): Promise<ManualEditorialBrief> {
  const origin = publicOrigin(input.domain)
  const home = await fetchHtml(origin, "home")
  if (!home) throw new Error("The company homepage could not be collected for editorial research")
  const links = selectEditorialLinks(home.url, home.html)
  const extras = (await Promise.all(links.map((link) => fetchHtml(link.url, link.kind))))
    .filter((page): page is FetchedPage => Boolean(page))
  const fetched = [home, ...extras]
  const pages = fetched.map(parsePage)
  const evidence = evidencePoints(pages)
  if (evidence.length < 3) throw new Error("The public pages did not provide enough company-specific evidence for high-quality outreach")

  const contactPage = pages.find((page) => page.hasContactForm) ?? pages.find((page) => page.kind === "contact")
  const contactUrl = contactPage?.url ?? null
  const publicEmail = publicEmailFromPages(fetched)
  const contactFormDetected = pages.some((page) => page.hasContactForm)
  const contactSignals = [
    ...(contactFormDetected && contactUrl ? [`Business inquiry form detected on ${contactUrl}`] : []),
    ...(publicEmail ? [`Public business email detected: ${publicEmail}`] : []),
  ]

  const combinedHtml = fetched.map((page) => page.html).join("\n")
  const audit = auditJapanMarketReadinessFromHtml(home.url, combinedHtml)
  const country = countryFromPages(input.domain, pages, input.countryCode)
  const companyName = organizationNameFromPages(fetched, input.companyName)
  const productNames = extractProductNames(fetched, input.productNames ?? [])
  const businessModel = inferBusinessModel(pages, input.businessModel)
  const productContext = productContextFromPages(pages, input.productContext)

  return {
    domain: input.domain,
    companyName,
    countryCode: country.code,
    countryConfidence: country.confidence,
    countrySignals: country.signals,
    businessModel,
    productNames,
    productContext,
    pages,
    evidence,
    contactUrl,
    publicEmail,
    contactFormDetected,
    contactSignals,
    japanPresence: audit.presence,
    audit,
    collectedAt: new Date().toISOString(),
  }
}

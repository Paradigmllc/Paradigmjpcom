import "server-only"

import { load } from "cheerio"
import type { BusinessModel } from "./japan-entry-projection"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import { normalizeDomain } from "./dedup"
import { getProxyFetchOptions } from "./proxy-agent"
import {
  auditJapanMarketReadinessFromHtml,
  type JapanMarketAudit,
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
}

export interface ManualEditorialBrief {
  domain: string
  companyName: string
  countryCode: string | null
  businessModel: BusinessModel
  productNames: string[]
  productContext: string
  pages: ManualEditorialPage[]
  evidence: ManualEditorialEvidencePoint[]
  contactUrl: string | null
  publicEmail: string | null
  audit: JapanMarketAudit
  collectedAt: string
}

interface FetchedPage {
  url: string
  kind: ManualEditorialPageKind
  html: string
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
  if (/(?:contact|sales|partner|partnership|wholesale|distributor|dealer|inquir)/.test(text)) return "contact"
  if (/(?:pricing|plans?|subscriptions?|buy|shop|store|collections?)/.test(text)) return "pricing"
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

function selectEditorialLinks(homeUrl: string, html: string): Array<{ url: string; kind: ManualEditorialPageKind }> {
  const $ = load(html)
  const candidates: Array<{ url: string; kind: ManualEditorialPageKind; score: number }> = []
  const seen = new Set<string>()
  $("a[href]").each((_, element) => {
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
    const anchor = clean($(element).text())
    const kind = pageKind(url, anchor)
    if (kind === "other") return
    seen.add(canonical)
    candidates.push({ url: canonical, kind, score: linkPriority(kind) + Math.min(anchor.length, 30) / 30 })
  })

  const selected: Array<{ url: string; kind: ManualEditorialPageKind }> = []
  const usedKinds = new Set<ManualEditorialPageKind>()
  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    if (selected.length >= MAX_EXTRA_PAGES) break
    if (usedKinds.has(candidate.kind) && candidate.kind !== "product") continue
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
      headers: { "User-Agent": "ParadigmEditorialResearch/1.0 (+https://paradigmjp.com)" },
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
    .slice(0, 10)
  const paragraphs = unique($("p,li").toArray().map((element) => $(element).text()))
    .filter((value) => value.length >= 25 && value.length <= 320)
    .slice(0, 12)
  const snippets = unique([description ?? "", ...headings, ...paragraphs]).slice(0, 14)
  return { url: page.url, kind: page.kind, title, description, headings, snippets }
}

function publicEmailFromPages(pages: FetchedPage[]): string | null {
  for (const page of pages) {
    const $ = load(page.html)
    for (const element of $('a[href^="mailto:"]').toArray()) {
      const value = ($(element).attr("href") ?? "").replace(/^mailto:/i, "").split("?")[0]?.trim().toLowerCase()
      if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/(?:privacy|legal|abuse|security)@/.test(value)) return value
    }
    const visible = clean($("body").text())
    const match = visible.match(/\b(?:hello|contact|sales|partnerships?|business|info)@[a-z0-9.-]+\.[a-z]{2,}\b/i)
    if (match?.[0]) return match[0].toLowerCase()
  }
  return null
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
  const contactUrl = pages.find((page) => page.kind === "contact")?.url ?? null
  const publicEmail = publicEmailFromPages(fetched)
  const combinedHtml = fetched.map((page) => page.html).join("\n")
  const audit = auditJapanMarketReadinessFromHtml(home.url, combinedHtml)

  return {
    domain: input.domain,
    companyName: input.companyName,
    countryCode: input.countryCode,
    businessModel: input.businessModel,
    productNames: (input.productNames ?? []).slice(0, 8),
    productContext: clean(input.productContext).slice(0, 2_500),
    pages,
    evidence,
    contactUrl,
    publicEmail,
    audit,
    collectedAt: new Date().toISOString(),
  }
}

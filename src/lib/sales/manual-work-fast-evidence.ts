import { normalizeDomain } from "./dedup"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import { getProxyFetchOptions } from "./proxy-agent"
import { auditJapanMarketReadinessFromHtml } from "./sources/japan-market-audit"
import type { BusinessModel } from "./japan-entry-projection"

const MAX_FAST_HOMEPAGE_BYTES = 750_000

function publicOrigin(domain: string): string {
  const normalized = normalizeDomain(domain)
  if (!normalized) throw new Error("A valid public company domain is required")
  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
    || /^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(normalized)
  ) throw new Error("Private or local domains are prohibited")
  if (!isCustomerFacingBusinessDomain(normalized)) {
    throw new Error("A customer-facing canonical domain is required; hosted platform domains are review-only")
  }
  return `https://${normalized}`
}

function decodeHtml(value: string): string {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]{1,7});/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&(?:amp|quot|apos|nbsp|lt|gt|rsquo|lsquo|ldquo|rdquo);/gi, (entity) => ({
      "&amp;": "&", "&quot;": "\"", "&apos;": "'", "&nbsp;": " ", "&lt;": "<", "&gt;": ">",
      "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”",
    })[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim()
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))
  return match?.[1] ? decodeHtml(match[1]) : null
}

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attribute(tag, "name") ?? attribute(tag, "property")
    if (name?.toLowerCase() !== key.toLowerCase()) continue
    const content = attribute(tag, "content")
    if (content) return content
  }
  return null
}

function textMatches(html: string, pattern: RegExp, limit: number): string[] {
  const values: string[] = []
  for (const match of html.matchAll(pattern)) {
    const value = decodeHtml(match[1] ?? "")
    if (value.length >= 3 && !values.includes(value)) values.push(value)
    if (values.length >= limit) break
  }
  return values
}

function credibleSiteName(value: string | null): string | null {
  if (!value) return null
  const cleaned = (value.split(/\s*[|–—]\s*/)[0] ?? value)
    .replace(/\s+-\s+(?:Official Site|Online Store|Shopify).*$/i, "")
    .trim()
  if (cleaned.length < 2 || cleaned.length > 100 || /^(?:home|shop|store|official site|shopify)$/i.test(cleaned)) return null
  return cleaned
}

function joinEvidence(values: Array<string | null | undefined>, maxChars = 700): string {
  const selected: string[] = []
  for (const value of [...new Set(values.filter((item): item is string => Boolean(item)).map((item) => item.replace(/\s+/g, " ").trim()))]) {
    if (value.length < 3) continue
    const candidate = [...selected, value].join(" | ")
    if (candidate.length > maxChars) continue
    selected.push(value)
  }
  return selected.join(" | ")
}

function inferBusinessModel(text: string): BusinessModel {
  const normalized = text.toLowerCase()
  if (/shopify|e-?commerce|online store|shop|retail|collection|add to cart|buy now/.test(normalized)) return "ecommerce"
  if (/saas|software|platform|subscription|cloud|api|developer tool|artificial intelligence|\bai\b/.test(normalized)) return "saas"
  return "service"
}

function productNames(html: string): string[] {
  const names = new Set<string>()
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const property = attribute(tag, "property") ?? attribute(tag, "name")
    if (!property || !/^(?:og:title|twitter:title|application-name)$/i.test(property)) continue
    const value = attribute(tag, "content")
    if (value && value.length >= 2 && value.length <= 100) names.add(value.split(/\s*[|–—]\s*/)[0]!.trim())
  }
  return [...names].filter((value) => value.length >= 2).slice(0, 5)
}

export async function collectFastManualWorkEvidence(domain: string) {
  const origin = publicOrigin(domain)
  const response = await fetch(origin, getProxyFetchOptions({
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
    headers: { "User-Agent": "ParadigmFastQualification/1.0 (+https://paradigmjp.com)" },
  }))
  if (!response.ok) throw new Error(`Homepage returned HTTP ${response.status}`)
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/html")) throw new Error("Homepage did not return HTML")
  const declaredSize = Number(response.headers.get("content-length") ?? 0)
  if (declaredSize > MAX_FAST_HOMEPAGE_BYTES) throw new Error("Homepage HTML exceeded the fast evidence size limit")

  const html = (await response.text()).slice(0, MAX_FAST_HOMEPAGE_BYTES)
  const title = textMatches(html, /<title\b[^>]*>([\s\S]*?)<\/title>/gi, 1)[0] ?? null
  const description = metaContent(html, "description") ?? metaContent(html, "og:description")
  const headings = textMatches(html, /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi, 5)
  const paragraphs = textMatches(html, /<p\b[^>]*>([\s\S]*?)<\/p>/gi, 3)
    .filter((value) => value.length >= 20 && value.length <= 220)
  const names = productNames(html)
  const productContext = joinEvidence([...names, description, ...headings, ...paragraphs, title])
  if (productContext.length < 12) throw new Error("Homepage did not provide enough grounded product context for fast qualification")

  return {
    companyName: credibleSiteName(metaContent(html, "og:site_name")) ?? credibleSiteName(title),
    productContext,
    businessModel: inferBusinessModel(productContext),
    sourceUrl: response.url,
    title,
    description,
    headings,
    productNames: names,
    evidenceMode: "fast_direct_html" as const,
    audit: auditJapanMarketReadinessFromHtml(response.url, html),
  }
}

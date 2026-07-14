import { createHash } from "node:crypto"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { DB_TABLES } from "./db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { getProxyFetchOptions } from "./proxy-agent"
import { queryTrancoRank } from "./sources/tranco"
import { queryCloudflareRadar } from "./sources/cloudflare-radar"
import { queryCommonCrawl } from "./sources/commoncrawl"
import { extractSchemaOrg } from "./sources/schema-org"
import { analyzeSitemap } from "./sources/sitemap"
import { queryMultiCountryNic } from "./sources/country-nic"
import { auditJapanMarketReadiness } from "./sources/japan-market-audit"
import { buildMarketVisibilityIndex } from "./market-visibility"
import {
  buildJapanEntryScore,
  normalizePublicDomain,
  type JapanEntryHomepageSignals,
  type JapanEntryScoreResult,
  type JapanEntrySelfReported,
  type JapanEntryTargetCountry,
} from "./japan-entry-score"

const HOMEPAGE_TIMEOUT_MS = 8_000
const SOURCE_TIMEOUT_MS = 18_000

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number)
    return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 0 && (octets[2] === 0 || octets[2] === 2)) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) ||
      (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
      (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) ||
      octets[0] >= 224
  }
  const normalized = address.toLowerCase()
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  if (mappedIpv4) return isPrivateAddress(mappedIpv4)
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") || normalized.startsWith("2001:db8")
}

export async function passesPublicDnsCheck(domain: string): Promise<boolean> {
  try {
    const addresses = await lookup(domain, { all: true, verbatim: true })
    return addresses.length > 0 && addresses.every((entry) => !isPrivateAddress(entry.address))
  } catch (error) {
    console.warn("[japan-entry-score] DNS resolution failed:", error)
    return false
  }
}

interface HomepageResponse {
  html: string
  title: string | null
}

async function fetchHomepage(domain: string): Promise<HomepageResponse | null> {
  const origin = `https://${domain}`
  try {
    const response = await fetch(origin, getProxyFetchOptions({
      redirect: "follow",
      signal: AbortSignal.timeout(HOMEPAGE_TIMEOUT_MS),
      headers: { "User-Agent": "ParadigmJapanEntryScore/1.0 (+https://paradigmjp.com)" },
    }))
    if (!response.ok) return null
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType && !contentType.includes("text/html") && !contentType.includes("text/plain")) return null
    const html = (await response.text()).slice(0, 1_000_000)
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 160) ?? null
    return { html, title }
  } catch (error) {
    console.warn("[japan-entry-score] homepage fetch failed:", error)
    return null
  }
}

function buildHomepageSignals(homepage: HomepageResponse | null): JapanEntryHomepageSignals {
  const html = homepage?.html ?? ""
  const japaneseLanguage = /(?:lang|hreflang)=["']ja(?:-[A-Z]{2})?["']/i.test(html) || /[\u3040-\u30ff\u3400-\u9fff]{8,}/.test(html)
  return {
    ok: homepage !== null,
    hasJapaneseLanguage: japaneseLanguage,
    hasJapaneseCurrency: /(?:JPY|¥|円|japanese yen)/i.test(html),
    hasJapanPayment: /(?:JCB|PayPay|Paidy|Komoju|コンビニ|konbini)/i.test(html),
    hasJapanShipping: /(?:ship(?:ping)?\s+to\s+japan|japan\s+delivery|日本(?:へ|向け).{0,12}(?:配送|発送)|国内配送)/i.test(html),
    hasCheckoutOrInquiry: /<form\b|checkout|cart|add[- ]to[- ]cart|contact|inquiry|enquiry|お問い合わせ|問い合わせ/i.test(html),
    title: homepage?.title ?? null,
    observedAt: new Date().toISOString(),
  }
}

async function withSourceTimeout<T>(name: string, task: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[japan-entry-score] ${name} timed out after ${SOURCE_TIMEOUT_MS}ms`)
          resolve(fallback)
        }, SOURCE_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    console.error(`[japan-entry-score] ${name} failed:`, error)
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function emptyResult(domain: string, targetCountry: JapanEntryTargetCountry, selfReported: JapanEntrySelfReported): JapanEntryScoreResult {
  return buildJapanEntryScore({
    domain,
    targetCountry,
    visibility: buildMarketVisibilityIndex({ domain }),
    audit: null,
    homepage: buildHomepageSignals(null),
    sitemap: { totalUrls: null, hasBlog: null, hasProducts: null },
    schema: { hasOrganization: false, hasProduct: false, hasPrice: false },
    selfReported,
  })
}

export interface JapanEntryScoreRunResult {
  ok: boolean
  result: JapanEntryScoreResult
  persisted: boolean
  error?: string
}

export async function runJapanEntryScore(input: {
  domain: string
  targetCountry: JapanEntryTargetCountry
  selfReported: JapanEntrySelfReported
}): Promise<JapanEntryScoreRunResult> {
  const domain = normalizePublicDomain(input.domain)
  if (!domain) {
    return {
      ok: false,
      result: emptyResult(input.domain.trim().slice(0, 253), input.targetCountry, input.selfReported),
      persisted: false,
      error: "Enter a public domain such as example.com",
    }
  }

  if (!(await passesPublicDnsCheck(domain))) {
    return {
      ok: false,
      result: emptyResult(domain, input.targetCountry, input.selfReported),
      persisted: false,
      error: "The domain could not be resolved to a public website",
    }
  }

  const origin = `https://${domain}`
  const [homepage, tranco, radar, commonCrawl, schemaOrg, sitemap, countryNic, audit] = await Promise.all([
    withSourceTimeout("homepage", fetchHomepage(domain), null),
    withSourceTimeout("tranco", queryTrancoRank(domain), null),
    withSourceTimeout("cloudflare-radar", queryCloudflareRadar(domain), null),
    withSourceTimeout("common-crawl", queryCommonCrawl(domain), null),
    withSourceTimeout("schema-org", extractSchemaOrg(origin), null),
    withSourceTimeout("sitemap", analyzeSitemap(domain), null),
    withSourceTimeout("country-nic", queryMultiCountryNic(domain), []),
    withSourceTimeout("japan-market-audit", auditJapanMarketReadiness(domain), null),
  ])

  const visibility = buildMarketVisibilityIndex({
    domain,
    targetCountry: input.targetCountry,
    tranco,
    cloudflareRadar: radar,
    commonCrawl,
    schemaOrg,
    sitemap,
    countryNic,
  })
  const schemaData = schemaOrg && typeof schemaOrg === "object" && "data" in schemaOrg
    ? schemaOrg.data
    : undefined
  const sitemapData = sitemap && typeof sitemap === "object" && "data" in sitemap
    ? sitemap.data
    : undefined
  const foundTypes = Array.isArray(schemaData?.foundTypes) ? schemaData.foundTypes : []
  const result = buildJapanEntryScore({
    domain,
    targetCountry: input.targetCountry,
    visibility,
    audit,
    homepage: buildHomepageSignals(homepage),
    sitemap: {
      totalUrls: typeof sitemapData?.totalUrls === "number" ? sitemapData.totalUrls : null,
      hasBlog: typeof sitemapData?.hasBlog === "boolean" ? sitemapData.hasBlog : null,
      hasProducts: typeof sitemapData?.hasProducts === "boolean" ? sitemapData.hasProducts : null,
    },
    schema: {
      hasOrganization: foundTypes.some((type) => /organization|localbusiness|corporation|store/i.test(type)),
      hasProduct: foundTypes.some((type) => /product/i.test(type)),
      hasPrice: typeof schemaData?.priceRange === "string" && schemaData.priceRange.trim().length > 0,
    },
    selfReported: input.selfReported,
  })
  const persisted = await persistJapanEntryScoreRun({
    domain,
    targetCountry: input.targetCountry,
    selfReported: input.selfReported,
    result,
  })
  return { ok: true, result, persisted }
}

async function persistJapanEntryScoreRun(input: {
  domain: string
  targetCountry: JapanEntryTargetCountry
  selfReported: JapanEntrySelfReported
  result: JapanEntryScoreResult
}): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.warn("[japan-entry-score] Supabase is not configured; result was not persisted")
    return false
  }
  const { error: cleanupError } = await sb
    .from(DB_TABLES.PUBLIC_JAPAN_ENTRY_CHECKS)
    .delete()
    .lt("expires_at", new Date().toISOString())
    .limit(100)
  if (cleanupError) console.warn("[japan-entry-score] expired run cleanup failed:", cleanupError.message)
  const domainHash = createHash("sha256").update(input.domain).digest("hex")
  const { error } = await sb.from(DB_TABLES.PUBLIC_JAPAN_ENTRY_CHECKS).insert({
    domain_hash: domainHash,
    target_country: input.targetCountry,
    self_reported: input.selfReported,
    result: input.result,
    score: input.result.score,
    coverage: input.result.coverage,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })
  if (error) {
    console.error("[japan-entry-score] persistence failed:", error.message)
    return false
  }
  return true
}

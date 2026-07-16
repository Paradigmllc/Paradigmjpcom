import { load } from "cheerio"
import { getProxyFetchOptions } from "./proxy-agent"
import { normalizePublicDomain } from "./japan-entry-score"
import { passesPublicDnsCheck } from "./japan-entry-score-service"
import { fetchPageWithCrawl4Ai } from "./crawl4ai-page"
import { extractFirstPartyProductEvidence, type FirstPartyProductEvidence } from "./lead-product-evidence"
import type { CandidateCountrySignal } from "./lead-candidate-scoring"
import type { LeadSourceConfig, LeadSourceRecord } from "./lead-source-records"
import type { TechItem } from "./sources/wappalyzer"

export interface HomepageQualityProfile {
  url: string
  html: string
  title: string
  description: string
  organizationNames: string[]
  organizationTypes: string[]
  visibleText: string
  productEvidence?: FirstPartyProductEvidence
  japanPresenceSignals?: string[]
}

export interface LeadQualityGate {
  status: "passed" | "review_required" | "rejected"
  reasons: string[]
  identity: { passed: boolean; score: number; sourceName: string; siteNames: string[]; canonicalName?: string }
  country: { passed: boolean; target: string; signals: CandidateCountrySignal[] }
  business: { passed: boolean; isForProfit: boolean | null; excludedType: string | null }
  smb: { passed: boolean; score: number; evidence: string[] }
  offerFit: { passed: boolean; score: number; evidence: string[] }
  source: { passed: boolean; sourceId: string; sourcePageUrl: string; trustTier: number }
  aiReview?: unknown
}

type SourceWithConfig = LeadSourceRecord & { source: LeadSourceConfig }

const LEGAL_TOKENS = new Set(["inc", "incorporated", "llc", "ltd", "limited", "plc", "corp", "corporation", "company", "co", "pty", "gmbh", "group", "holdings", "the"])
const EXCLUDED_BUSINESS_RE = /non[ -]?profit|charity|foundation|government|municipal|university|college|school|museum|news(?:paper)?|magazine|publisher|publication|media company|real estate agency|recruit(?:ment|ing)|job board/i
const ENTERPRISE_RE = /publicly traded|stock exchange|investor relations|annual report|fortune 500|global offices|over \d{3,} employees|shipped (?:over )?(?:one |two |three |four |five |six |seven |eight |nine |ten |\d+ )?billions? of units|(?:nasdaq|nyse)\s*[:：]/i
const SMB_MARKER_RE = /founder-led|founded by|family-owned|family owned|independent business|independently owned|small team|boutique|owner-operated|私たちの小さなチーム/i
const SAAS_STRONG_RE = /software as a service|saas|cloud platform|api documentation/i
const SAAS_PRODUCT_RE = /software|platform|dashboard|workspace|automation|developer tool|business application/i
const SAAS_CONVERSION_RE = /pricing|free trial|request a demo|book a demo|subscription plan/i
const COMMERCE_RE = /add to cart|buy now|shop now|shipping (?:&|and) returns|gift certificates?|checkout|product catalog|online store/i
const PRODUCT_SCHEMA_RE = /^(?:product|individualproduct|productgroup)$/i
const PRODUCT_CATALOG_RE = /our products?|product portfolio|product range|product catalogue|product catalog|unsere produkte|produktportfolio|gamme de produits|nos produits|vara produkter|produktutbud/iu
const PRODUCT_MAKER_RE = /we (?:design|develop|engineer|manufacture|produce|build)\b|(?:designs|develops|engineers|manufactures|produces) (?:advanced |innovative |next-generation |next generation )?(?:products?|devices?|equipment|systems?|instruments?|materials?|hardware|technology)|manufacturer of|entwickelt und (?:produziert|fertigt)|hersteller (?:von|für)|développe et (?:fabrique|produit)|fabricant (?:de|d')|utvecklar och tillverkar|tillverkare av/iu
const MAX_HOMEPAGE_BYTES = 1_500_000

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, 20)
}

export function detectFirstPartyJapanPresence(html: string, pageUrl: string): string[] {
  const $ = load(html)
  const page = new URL(pageUrl)
  const signals: string[] = []
  $("link[hreflang],a[hreflang]").each((_index, element) => {
    const hreflang = ($(element).attr("hreflang") ?? "").trim().toLowerCase()
    if (hreflang === "ja" || hreflang.startsWith("ja-")) signals.push(`hreflang:${hreflang}`)
  })
  $("a[href]").each((_index, element) => {
    const label = $(element).text().replace(/\s+/g, " ").trim()
    if (!/^(?:日本語|Japanese|Japan)$/iu.test(label)) return
    try {
      const target = new URL($(element).attr("href") ?? "", page)
      if (target.hostname.toLowerCase().replace(/^www\./, "") !== page.hostname.toLowerCase().replace(/^www\./, "")) return
      signals.push(`localized_navigation:${label}:${target.pathname}`)
    } catch (error) {
      console.warn("[lead-quality-gate] invalid Japan localization link skipped:", error)
    }
  })
  const visible = $("body").text().replace(/\s+/g, " ").trim().slice(0, 40_000)
  const office = /(?:Japan|Tokyo|Osaka)\s+(?:office|headquarters|subsidiary)|(?:日本法人|日本支社|東京オフィス|大阪オフィス)/iu.exec(visible)?.[0]
  if (office) signals.push(`japan_office:${office}`)
  return unique(signals).slice(0, 10)
}

export async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const remaining = maxBytes - total
    if (remaining <= 0) {
      await reader.cancel()
      break
    }
    const accepted = value.byteLength > remaining ? value.subarray(0, remaining) : value
    total += accepted.byteLength
    text += decoder.decode(accepted, { stream: true })
    if (accepted.byteLength < value.byteLength || total >= maxBytes) {
      await reader.cancel()
      break
    }
  }
  return text + decoder.decode()
}

function jsonLdOrganizations(html: string): { names: string[]; types: string[] } {
  const $ = load(html)
  const names: string[] = []
  const types: string[] = []
  $("script[type='application/ld+json']").each((_index, element) => {
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
        const rawType = record["@type"]
        const recordTypes = Array.isArray(rawType) ? rawType.filter((item): item is string => typeof item === "string") : typeof rawType === "string" ? [rawType] : []
        if (recordTypes.some((type) => /organization|corporation|business|store|softwareapplication|product/i.test(type))) {
          if (typeof record.name === "string") names.push(record.name)
          types.push(...recordTypes)
        }
        queue.push(...Object.values(record).filter((item) => item && typeof item === "object"))
      }
    } catch (error) {
      console.warn("[lead-quality-gate] invalid JSON-LD skipped:", error)
    }
  })
  return { names: unique(names), types: unique(types) }
}

async function fetchHomepageHtmlDirect(url: string, timeoutMs: number): Promise<{ url: string; html: string }> {
  const signal = AbortSignal.timeout(timeoutMs)
  let current = new URL(url)
  let response: Response | null = null
  for (let redirect = 0; redirect <= 5; redirect++) {
    if (!["http:", "https:"].includes(current.protocol) || !normalizePublicDomain(current.hostname)) throw new Error("Homepage URL must use a public HTTP(S) domain")
    if (!(await passesPublicDnsCheck(current.hostname))) throw new Error("Homepage URL did not pass the public DNS safety check")
    response = await fetch(current, getProxyFetchOptions({
      redirect: "manual",
      signal,
      headers: { "User-Agent": "ParadigmLeadQuality/1.0 (+https://paradigmjp.com)" },
    }))
    if (response.status < 300 || response.status >= 400) break
    const location = response.headers.get("location")
    if (!location) throw new Error(`Homepage redirect ${response.status} omitted Location`)
    current = new URL(location, current)
    response = null
  }
  if (!response) throw new Error("Homepage exceeded five redirects")
  if (!response.ok) throw new Error(`Homepage returned HTTP ${response.status}`)
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType && !contentType.toLowerCase().includes("text/html")) throw new Error(`Homepage is not HTML: ${contentType}`)
  const html = await readLimitedText(response, MAX_HOMEPAGE_BYTES)
  return { url: current.toString(), html }
}

function mayUseBrowserFallback(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true
  const message = error instanceof Error ? error.message : String(error)
  return /Homepage returned HTTP (?:403|429|5\d\d)|fetch failed|aborted due to timeout/i.test(message)
}

export async function fetchHomepageQualityProfile(url: string, timeoutMs = 8_000): Promise<HomepageQualityProfile> {
  let fetched: { url: string; html: string }
  try {
    fetched = await fetchHomepageHtmlDirect(url, timeoutMs)
  } catch (error) {
    if (!mayUseBrowserFallback(error)) throw error
    const fallback = await fetchPageWithCrawl4Ai(url, Math.max(timeoutMs, 15_000))
    if (!fallback) throw error
    const redirected = new URL(fallback.url)
    if (!["http:", "https:"].includes(redirected.protocol) || !normalizePublicDomain(redirected.hostname)) {
      throw new Error("Crawl4AI returned a non-public homepage URL")
    }
    if (!(await passesPublicDnsCheck(redirected.hostname))) {
      throw new Error("Crawl4AI returned a homepage URL that failed the public DNS safety check")
    }
    fetched = {
      url: redirected.toString(),
      html: fallback.html.slice(0, MAX_HOMEPAGE_BYTES),
    }
  }
  const { html } = fetched
  const $ = load(html)
  const structured = jsonLdOrganizations(html)
  const productEvidence = extractFirstPartyProductEvidence(html, fetched.url)
  const japanPresenceSignals = detectFirstPartyJapanPresence(html, fetched.url)
  const title = $("title").first().text().replace(/\s+/g, " ").trim()
  const description = ($("meta[name='description']").attr("content") ?? $("meta[property='og:description']").attr("content") ?? "").replace(/\s+/g, " ").trim()
  const siteNames = [
    $("meta[property='og:site_name']").attr("content") ?? "",
    $("meta[name='application-name']").attr("content") ?? "",
  ]
  $("script,style,noscript,template,svg").remove()
  const visibleText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 60_000)
  return {
    url: fetched.url,
    html,
    title,
    description,
    organizationNames: unique([...structured.names, ...siteNames, title.split(/[|–—-]/)[0] ?? ""]),
    organizationTypes: structured.types,
    visibleText,
    productEvidence,
    japanPresenceSignals,
  }
}

function tokens(value: string): string[] {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length >= 2 && !LEGAL_TOKENS.has(token))
}

function identitySimilarity(sourceName: string, siteName: string, domain: string): number {
  const source = new Set(tokens(sourceName))
  const site = new Set(tokens(siteName))
  const domainToken = domain.split(".")[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase() ?? ""
  if (source.size === 0 || site.size === 0) return 0
  const overlap = [...source].filter((token) => site.has(token)).length
  const union = new Set([...source, ...site]).size
  const jaccard = union > 0 ? overlap / union : 0
  const compactSource = [...source].join("")
  const compactSite = [...site].join("")
  const contains = compactSource.length >= 4 && (compactSite.includes(compactSource) || compactSource.includes(compactSite)) ? 0.9 : 0
  const sourceMatchesDomain = domainToken.length >= 4 && (compactSource.includes(domainToken) || domainToken.includes(compactSource))
  const siteMatchesDomain = domainToken.length >= 4 && (compactSite.includes(domainToken) || domainToken.includes(compactSite))
  const domainMatch = sourceMatchesDomain && siteMatchesDomain ? 0.85 : 0
  return Math.max(jaccard, contains, domainMatch)
}

export function evaluateLeadQualityGate(input: {
  sourceRecord: SourceWithConfig
  homepage: HomepageQualityProfile
  countrySignals: CandidateCountrySignal[]
  detections: TechItem[]
  enterpriseLike: boolean
}): LeadQualityGate {
  const { sourceRecord, homepage } = input
  const rankedSiteNames = homepage.organizationNames
    .map((name) => ({ name, score: identitySimilarity(sourceRecord.company_name, name, sourceRecord.domain) }))
    .sort((left, right) => right.score - left.score || left.name.length - right.name.length)
  const identityScore = rankedSiteNames[0]?.score ?? 0
  const canonicalName = rankedSiteNames.find((item) => item.score >= 0.45 && item.name.length >= 2 && item.name.length <= 120)?.name
  const identityPassed = identityScore >= 0.45
  const strongCountrySignals = input.countrySignals.filter((signal) => signal.signalType !== "request_scope" && signal.confidence >= 70)
  const officialCountryEvidence = sourceRecord.source.trust_tier >= 3
  const countryPassed = sourceRecord.country_code === sourceRecord.source.country_code && (strongCountrySignals.length > 0 || officialCountryEvidence)
  const businessText = `${sourceRecord.business_type ?? ""} ${homepage.title} ${homepage.description} ${homepage.organizationTypes.join(" ")}`
  const excludedType = EXCLUDED_BUSINESS_RE.exec(businessText)?.[0] ?? null
  const isForProfit = sourceRecord.is_for_profit
  const businessPassed = isForProfit !== false && excludedType === null
  const enterpriseText = `${homepage.title} ${homepage.description} ${homepage.visibleText.slice(0, 12_000)}`
  const enterprise = input.enterpriseLike || ENTERPRISE_RE.test(enterpriseText)

  const smbEvidence: string[] = []
  let smbScore = 0
  if (sourceRecord.employee_count !== null && sourceRecord.employee_count >= 2 && sourceRecord.employee_count <= 249) {
    smbScore = 100
    smbEvidence.push(`employee_count:${sourceRecord.employee_count}`)
  }
  if (sourceRecord.annual_revenue_usd !== null && sourceRecord.annual_revenue_usd > 0 && sourceRecord.annual_revenue_usd <= 50_000_000) {
    smbScore = Math.max(smbScore, 95)
    smbEvidence.push(`annual_revenue_usd:${sourceRecord.annual_revenue_usd}`)
  }
  if (sourceRecord.is_sme === true && sourceRecord.source.trust_tier >= 3) {
    smbScore = Math.max(smbScore, 98)
    smbEvidence.push(`official_sme_flag:${sourceRecord.source.name}`)
  }
  const smbMarker = SMB_MARKER_RE.exec(homepage.visibleText.slice(0, 20_000))?.[0]
  if (smbMarker && sourceRecord.source.trust_tier >= 2) {
    smbScore = Math.max(smbScore, 82)
    smbEvidence.push(`site_marker:${smbMarker}`)
  }
  if (enterprise) {
    smbScore = 0
    smbEvidence.push("enterprise_signal")
  }
  const smbPassed = smbScore >= 80

  const offerEvidence: string[] = []
  const commerceTech = input.detections.filter((item) => item.category === "EC" || item.category === "Payment")
  const saasText = `${homepage.title} ${homepage.description} ${homepage.visibleText.slice(0, 20_000)}`
  const strongSaasSignal = SAAS_STRONG_RE.exec(saasText)?.[0]
  const productSignal = SAAS_PRODUCT_RE.exec(saasText)?.[0]
  const conversionSignal = SAAS_CONVERSION_RE.exec(saasText)?.[0]
  const saasSignal = strongSaasSignal ?? (productSignal && conversionSignal ? `${productSignal}+${conversionSignal}` : null)
  const commerceSignal = COMMERCE_RE.exec(homepage.visibleText.slice(0, 20_000))?.[0]
  const productSchema = homepage.organizationTypes.find((type) => PRODUCT_SCHEMA_RE.test(type))
  const productCatalogSignal = PRODUCT_CATALOG_RE.exec(saasText)?.[0]
  const productMakerSignal = PRODUCT_MAKER_RE.exec(saasText)?.[0]
  const firstPartyProducts = homepage.productEvidence ?? { hubLinks: [], detailLinks: [], claims: [] }
  const hasProductHub = firstPartyProducts.hubLinks.length > 0
  const hasMultipleProductDetails = firstPartyProducts.detailLinks.length >= 2
  const hasGroundedProductClaim = firstPartyProducts.claims.length > 0
  const officialProductBrand = sourceRecord.source.trust_tier >= 3
    && sourceRecord.is_sme === true
    && Boolean(
      (productSchema && (productCatalogSignal || productMakerSignal))
      || (productCatalogSignal && productMakerSignal)
      || (productSchema && (hasProductHub || hasMultipleProductDetails || hasGroundedProductClaim))
      || hasMultipleProductDetails
      || (hasProductHub && hasGroundedProductClaim),
    )
  if (commerceTech.length > 0) offerEvidence.push(`commerce_tech:${commerceTech.map((item) => item.name).join(",")}`)
  if (saasSignal) offerEvidence.push(`saas_signal:${saasSignal}`)
  if (commerceSignal) offerEvidence.push(`commerce_signal:${commerceSignal}`)
  if (officialProductBrand) {
    if (productSchema) offerEvidence.push(`product_schema:${productSchema}`)
    if (productCatalogSignal) offerEvidence.push(`product_catalog_signal:${productCatalogSignal}`)
    if (productMakerSignal) offerEvidence.push(`product_maker_signal:${productMakerSignal}`)
    offerEvidence.push(...firstPartyProducts.hubLinks.map((path) => `product_hub_link:${path}`))
    offerEvidence.push(...firstPartyProducts.detailLinks.map((path) => `product_detail_link:${path}`))
    offerEvidence.push(...firstPartyProducts.claims.map((claim) => `product_claim:${claim}`))
  }
  const offerScore = Math.min(100,
    (commerceTech.length > 0 ? 70 : 0)
    + (saasSignal ? 70 : 0)
    + (commerceSignal ? 30 : 0)
    + (officialProductBrand ? 90 : 0))
  const offerPassed = offerScore >= 70
  const sourcePassed = Boolean(sourceRecord.id && sourceRecord.company_name && sourceRecord.source_page_url && sourceRecord.source.trust_tier >= 2)

  const rejectedReasons: string[] = []
  if (!sourcePassed) rejectedReasons.push("invalid_source_evidence")
  if (!identityPassed) rejectedReasons.push("identity_mismatch")
  if (sourceRecord.country_code !== sourceRecord.source.country_code) rejectedReasons.push("source_country_mismatch")
  if (!businessPassed) rejectedReasons.push(isForProfit === false ? "non_profit" : `excluded_business:${excludedType}`)
  if (enterprise) rejectedReasons.push("enterprise_signal")
  if ((homepage.japanPresenceSignals ?? []).length > 0) rejectedReasons.push("existing_japan_presence")
  const reviewReasons: string[] = []
  if (!countryPassed && sourceRecord.country_code === sourceRecord.source.country_code) reviewReasons.push("country_site_signal_missing")
  if (!smbPassed && !enterprise) reviewReasons.push("smb_evidence_missing")
  if (!offerPassed) reviewReasons.push("japan_entry_offer_fit_missing")
  const status = rejectedReasons.length > 0 ? "rejected" : reviewReasons.length > 0 ? "review_required" : "passed"

  return {
    status,
    reasons: status === "rejected" ? rejectedReasons : reviewReasons,
    identity: { passed: identityPassed, score: Math.round(identityScore * 100), sourceName: sourceRecord.company_name, siteNames: homepage.organizationNames, canonicalName },
    country: { passed: countryPassed, target: sourceRecord.country_code, signals: strongCountrySignals },
    business: { passed: businessPassed, isForProfit, excludedType },
    smb: { passed: smbPassed, score: smbScore, evidence: smbEvidence },
    offerFit: { passed: offerPassed, score: offerScore, evidence: offerEvidence },
    source: { passed: sourcePassed, sourceId: sourceRecord.source_config_id, sourcePageUrl: sourceRecord.source_page_url, trustTier: sourceRecord.source.trust_tier },
  }
}

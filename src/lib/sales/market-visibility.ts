/**
 * Free, public-signal market visibility index.
 *
 * This intentionally does not estimate visits or revenue. It combines
 * reproducible public observations (rank buckets, crawl footprint and
 * freshness) into a labelled index so operators never mistake a proxy for
 * first-party analytics.
 */

type JsonRecord = Record<string, unknown>

export type MarketVisibilityBand =
  | "top-100"
  | "top-1k"
  | "top-10k"
  | "top-100k"
  | "top-1m"
  | "top-10m"
  | "ranked"
  | "not-observed"

export interface MarketVisibilityEvidence {
  id: string
  label: string
  value: string
  source: string
  sourceUrl: string | null
  observedAt: string | null
  confidence: number
  limitation: string
}

export interface MarketCountrySignal {
  countryCode: string
  signal: string
  value: string
  confidence: number
}

export interface MarketVisibilityIndex {
  version: "public-signals-v1"
  index: number | null
  band: MarketVisibilityBand
  bestRank: number | null
  countrySignals: MarketCountrySignal[]
  evidence: MarketVisibilityEvidence[]
  unknowns: string[]
  actualMonthlyVisits: null
  actualRevenue: null
}

export interface MarketVisibilityInput {
  domain: string
  targetCountry?: string | null
  observedAt?: string | null
  tranco?: unknown
  cloudflareRadar?: unknown
  commonCrawl?: unknown
  schemaOrg?: unknown
  sitemap?: unknown
  countryNic?: unknown
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function numberAt(value: unknown, key: string): number | null {
  return finiteNumber(record(value)?.[key])
}

function stringAt(value: unknown, key: string): string | null {
  return stringValue(record(value)?.[key])
}

function normalizeCountryCode(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? ""
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}

function bandFromRank(rank: number | null, bucket: string | null): MarketVisibilityBand {
  if (rank !== null) {
    if (rank <= 100) return "top-100"
    if (rank <= 1_000) return "top-1k"
    if (rank <= 10_000) return "top-10k"
    if (rank <= 100_000) return "top-100k"
    if (rank <= 1_000_000) return "top-1m"
    if (rank <= 10_000_000) return "top-10m"
    return "ranked"
  }
  if (bucket && /^top-(100|1k|10k|100k|1m|10m)$/.test(bucket)) {
    return bucket as MarketVisibilityBand
  }
  return "not-observed"
}

function rankScore(rank: number | null, bucket: string | null): number {
  const effectiveRank = rank ?? (bucket === "top-100" ? 100 : bucket === "top-1k" ? 1_000 : bucket === "top-10k" ? 10_000 : bucket === "top-100k" ? 100_000 : bucket === "top-1m" ? 1_000_000 : bucket === "top-10m" ? 10_000_000 : null)
  if (effectiveRank === null) return 0
  return Math.max(0, Math.min(60, Math.round(60 * (1 - Math.log10(effectiveRank) / 7))))
}

function freshnessScore(value: string | null, now: number): number {
  if (!value) return 0
  const timestamp = /^\d{14}$/.test(value)
    ? Date.parse(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`)
    : Date.parse(value)
  if (!Number.isFinite(timestamp)) return 0
  const ageDays = Math.max(0, (now - timestamp) / 86_400_000)
  if (ageDays <= 30) return 20
  if (ageDays <= 90) return 14
  if (ageDays <= 365) return 8
  return 2
}

function footprintScore(pages: number | null): number {
  if (pages === null || pages <= 0) return 0
  if (pages >= 1_000) return 20
  if (pages >= 100) return 15
  if (pages >= 10) return 8
  return 4
}

function countrySignals(input: MarketVisibilityInput): MarketCountrySignal[] {
  const signals: MarketCountrySignal[] = []
  const domain = input.domain.toLowerCase().replace(/^www\./, "")
  const tldMap: Record<string, string> = {
    ".uk": "GB", ".au": "AU", ".ca": "CA", ".de": "DE", ".fr": "FR", ".jp": "JP", ".us": "US",
  }
  const suffix = Object.keys(tldMap).find((candidate) => domain.endsWith(candidate))
  if (suffix) {
    signals.push({ countryCode: tldMap[suffix], signal: "ccTLD", value: suffix, confidence: 0.72 })
  }

  const schemaAddress = stringAt(record(input.schemaOrg)?.data, "address")
  const addressCountry = schemaAddress?.match(/(?:,|\s)([A-Z]{2})$/)?.[1]
  const normalizedAddressCountry = normalizeCountryCode(addressCountry ?? null)
  if (normalizedAddressCountry) {
    signals.push({ countryCode: normalizedAddressCountry, signal: "schema.org addressCountry", value: normalizedAddressCountry, confidence: 0.86 })
  }

  const nicRows = Array.isArray(input.countryNic) ? input.countryNic : []
  for (const row of nicRows) {
    const candidate = normalizeCountryCode(stringAt(row, "countryCode"))
    if (candidate && record(row)?.ok === true) {
      signals.push({ countryCode: candidate, signal: "country registry/RDAP", value: candidate, confidence: 0.9 })
    }
  }

  const seen = new Set<string>()
  return signals.filter((signal) => {
    const key = `${signal.countryCode}:${signal.signal}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function evidence(input: {
  id: string
  label: string
  value: string
  source: string
  sourceUrl: string | null
  observedAt: string | null
  confidence: number
  limitation: string
}): MarketVisibilityEvidence {
  return input
}

export function buildMarketVisibilityIndex(input: MarketVisibilityInput, now = Date.now()): MarketVisibilityIndex {
  const tranco = record(input.tranco)
  const radar = record(input.cloudflareRadar)
  const commonCrawl = record(input.commonCrawl)
  const sitemap = record(input.sitemap)?.data
  const observedAt = input.observedAt ?? new Date(now).toISOString()
  const trancoRank = numberAt(tranco, "rank")
  const radarRank = numberAt(radar, "rank")
  const radarBucket = stringAt(radar, "rankBucket") ?? stringAt(radar, "rank_bucket")
  const ranks = [trancoRank, radarRank].filter((rank): rank is number => rank !== null && rank > 0)
  const bestRank = ranks.length > 0 ? Math.min(...ranks) : null
  const pagesInIndex = numberAt(commonCrawl, "pagesInIndex")
  const sitemapPages = numberAt(sitemap, "totalUrls")
  const footprint = Math.max(pagesInIndex ?? 0, sitemapPages ?? 0) || null
  const lastCrawled = stringAt(commonCrawl, "lastCrawled")
  const lastModified = stringAt(sitemap, "lastModified")
  const freshness = lastCrawled ?? lastModified
  const signals = countrySignals(input)
  const rankPart = rankScore(bestRank, radarBucket)
  const freshnessPart = freshnessScore(freshness, now)
  const footprintPart = footprintScore(footprint)
  const index = bestRank !== null || freshness || footprint !== null
    ? rankPart + freshnessPart + footprintPart
    : null
  const publicSourceLimitation = "Public proxy only; not first-party visits or revenue."
  const items: MarketVisibilityEvidence[] = []
  if (trancoRank !== null) {
    items.push(evidence({
      id: "tranco-rank",
      label: "Tranco domain rank",
      value: `#${trancoRank.toLocaleString("en-US")}`,
      source: "Tranco",
      sourceUrl: `https://tranco-list.eu/query?domain=${encodeURIComponent(input.domain)}`,
      observedAt,
      confidence: 0.7,
      limitation: publicSourceLimitation,
    }))
  }
  if (radarRank !== null || radarBucket) {
    items.push(evidence({
      id: "cloudflare-radar-rank",
      label: "Cloudflare Radar domain rank",
      value: radarRank !== null ? `#${radarRank.toLocaleString("en-US")}` : radarBucket ?? "ranked",
      source: "Cloudflare Radar",
      sourceUrl: "https://radar.cloudflare.com/domains",
      observedAt,
      confidence: 0.65,
      limitation: publicSourceLimitation,
    }))
  }
  if (pagesInIndex !== null) {
    items.push(evidence({
      id: "commoncrawl-pages",
      label: "Common Crawl indexed pages",
      value: pagesInIndex.toLocaleString("en-US"),
      source: "Common Crawl",
      sourceUrl: "https://index.commoncrawl.org/",
      observedAt: lastCrawled ?? observedAt,
      confidence: 0.55,
      limitation: "Crawl footprint, not visitor volume.",
    }))
  }
  if (sitemapPages !== null) {
    items.push(evidence({
      id: "sitemap-pages",
      label: "Public sitemap URLs",
      value: sitemapPages.toLocaleString("en-US"),
      source: "Public sitemap",
      sourceUrl: `https://${input.domain}/sitemap.xml`,
      observedAt: lastModified ?? observedAt,
      confidence: 0.6,
      limitation: "Published URL footprint, not visitor volume.",
    }))
  }
  for (const signal of signals) {
    items.push(evidence({
      id: `country-${signal.countryCode}-${signal.signal.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      label: `Market signal: ${signal.countryCode}`,
      value: `${signal.signal}=${signal.value}`,
      source: signal.signal === "ccTLD" ? "Domain registry convention" : signal.signal,
      sourceUrl: null,
      observedAt,
      confidence: signal.confidence,
      limitation: "Indicates market alignment, not country-level visits.",
    }))
  }

  return {
    version: "public-signals-v1",
    index,
    band: bandFromRank(bestRank, radarBucket),
    bestRank,
    countrySignals: signals,
    evidence: items,
    unknowns: [
      "Actual monthly visits are not publicly observable",
      "Actual country traffic share is not publicly observable",
      "Actual revenue is not publicly observable",
    ],
    actualMonthlyVisits: null,
    actualRevenue: null,
  }
}

import { normalizePublicDomain } from "./japan-entry-score"

type JsonRecord = Record<string, unknown>

const COMMON_CRAWL_HOST = "index.commoncrawl.org"
const MAX_QUERY_BYTES = 12 * 1024 * 1024
const MAX_PAGE_SIZE = 100
const REQUEST_GAP_MS = 1_200
const CACHE_TTL_MS = 10 * 60_000

interface CachedRows {
  expiresAt: number
  rows: CommonCrawlIndexRow[]
}

interface CommonCrawlIndexRow {
  url: string
  timestamp: string | null
  digest: string | null
}

export interface CommonCrawlIntersectionInput {
  contactQueryUrl: string
  offerQueryUrl: string
  signal: "commerce" | "saas"
  maxRecords: number
}

export interface CommonCrawlDomainSignalInput {
  queryUrl: string
  signal: "contact" | "commerce" | "saas"
  pages: number[]
  maxRecords: number
}

const queryCache = new Map<string, CachedRows>()
let requestTail = Promise.resolve()

function textValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).replace(/\s+/g, " ").trim()
  return normalized || null
}

function boundedMaxRecords(value: unknown): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 5_000) : 5_000
}

function assertCommonCrawlQuery(rawUrl: string): URL {
  const url = new URL(rawUrl)
  if (url.protocol !== "https:" || url.hostname !== COMMON_CRAWL_HOST) {
    throw new Error("Common Crawl source must use the official HTTPS index host")
  }
  if (!/^\/CC-MAIN-\d{4}-\d+-index$/.test(url.pathname)) {
    throw new Error("Common Crawl source must pin a versioned crawl index")
  }
  if (url.searchParams.get("output") !== "json") throw new Error("Common Crawl source must request JSONL output")
  const pageSize = Number(url.searchParams.get("pageSize") ?? 0)
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new Error(`Common Crawl pageSize must be between 1 and ${MAX_PAGE_SIZE}`)
  }
  const filters = url.searchParams.getAll("filter").join(" ")
  if (!/status:200/.test(filters) || !/mime:text\/html/.test(filters) || !/url:/.test(filters)) {
    throw new Error("Common Crawl query must require HTML 200 rows and a URL signal filter")
  }
  return url
}

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0)
  if (contentLength > MAX_QUERY_BYTES) throw new Error(`Common Crawl response exceeds ${MAX_QUERY_BYTES} bytes`)
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_QUERY_BYTES) {
      await reader.cancel()
      throw new Error(`Common Crawl response exceeds ${MAX_QUERY_BYTES} bytes`)
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

function parseIndexRows(text: string): CommonCrawlIndexRow[] {
  const rows: CommonCrawlIndexRow[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const parsed = JSON.parse(line) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue
    const record = parsed as JsonRecord
    const url = textValue(record.url)
    if (!url || !normalizePublicDomain(url)) continue
    rows.push({
      url,
      timestamp: textValue(record.timestamp),
      digest: textValue(record.digest),
    })
  }
  return rows
}

async function fetchIndexRows(rawUrl: string): Promise<CommonCrawlIndexRow[]> {
  const url = assertCommonCrawlQuery(rawUrl)
  const cacheKey = url.toString()
  const cached = queryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.rows
  const previous = requestTail
  let release: () => void = () => undefined
  requestTail = new Promise<void>((resolve) => { release = resolve })
  await previous
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/x-ndjson, application/json;q=0.9",
        "User-Agent": "ParadigmLeadSourceIngest/1.0 (+https://paradigmjp.com)",
      },
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) throw new Error(`Common Crawl index returned HTTP ${response.status}`)
    const rows = parseIndexRows(await readLimitedText(response))
    queryCache.set(cacheKey, { rows, expiresAt: Date.now() + CACHE_TTL_MS })
    return rows
  } finally {
    setTimeout(release, REQUEST_GAP_MS)
  }
}

function pageList(value: unknown): number[] {
  const pages = textValue(value)?.split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item >= 0 && item <= 100) ?? []
  return [...new Set(pages)].slice(0, 20)
}

function queryForPage(rawUrl: string, page: number): string {
  const url = assertCommonCrawlQuery(rawUrl)
  url.searchParams.set("page", String(page))
  return url.toString()
}

function humanizeDomain(domain: string): string {
  const label = domain.split(".")[0] ?? domain
  return label.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 200)
}

function rowsByDomain(rows: CommonCrawlIndexRow[]): Map<string, CommonCrawlIndexRow> {
  const output = new Map<string, CommonCrawlIndexRow>()
  for (const row of rows) {
    const domain = normalizePublicDomain(row.url)
    if (domain && !output.has(domain)) output.set(domain, row)
  }
  return output
}

export async function fetchCommonCrawlIntersection(input: CommonCrawlIntersectionInput): Promise<{ rows: JsonRecord[]; rawCount: number }> {
  const maxRecords = boundedMaxRecords(input.maxRecords)
  const [contactRows, offerRows] = await Promise.all([
    fetchIndexRows(input.contactQueryUrl),
    fetchIndexRows(input.offerQueryUrl),
  ])
  const contactByDomain = rowsByDomain(contactRows)
  const offerByDomain = rowsByDomain(offerRows)
  const rows: JsonRecord[] = []
  for (const [domain, contact] of contactByDomain) {
    const offer = offerByDomain.get(domain)
    if (!offer) continue
    rows.push({
      external_id: `${domain}:${input.signal}`,
      company_name: humanizeDomain(domain),
      website_url: `https://${domain}`,
      source_page_url: input.contactQueryUrl,
      business_type: input.signal === "commerce" ? "commerce_url_and_contact_url" : "saas_url_and_contact_url",
      contact_page_url: contact.url,
      offer_page_url: offer.url,
      contact_observed_at: contact.timestamp,
      offer_observed_at: offer.timestamp,
      contact_digest: contact.digest,
      offer_digest: offer.digest,
    })
    if (rows.length >= maxRecords) break
  }
  return { rows, rawCount: new Set([...contactByDomain.keys(), ...offerByDomain.keys()]).size }
}

export function commonCrawlInputFromFieldMapping(sourceUrl: string, mapping: JsonRecord): CommonCrawlIntersectionInput | null {
  if (textValue(mapping.common_crawl_intersection) !== "true") return null
  const offerQueryUrl = textValue(mapping.common_crawl_offer_query_url)
  const signal = textValue(mapping.common_crawl_offer_signal)
  if (!offerQueryUrl || (signal !== "commerce" && signal !== "saas")) {
    throw new Error("Common Crawl intersection source requires an offer query and signal")
  }
  return {
    contactQueryUrl: sourceUrl,
    offerQueryUrl,
    signal,
    maxRecords: boundedMaxRecords(mapping.common_crawl_max_records),
  }
}

export async function fetchCommonCrawlDomainSignal(input: CommonCrawlDomainSignalInput): Promise<{ rows: JsonRecord[]; rawCount: number }> {
  const maxRecords = boundedMaxRecords(input.maxRecords)
  const byDomain = new Map<string, CommonCrawlIndexRow>()
  for (const page of input.pages) {
    const rows = await fetchIndexRows(queryForPage(input.queryUrl, page))
    for (const row of rows) {
      const domain = normalizePublicDomain(row.url)
      if (domain && !byDomain.has(domain)) byDomain.set(domain, row)
      if (byDomain.size >= maxRecords) break
    }
    if (byDomain.size >= maxRecords) break
  }
  return {
    rawCount: byDomain.size,
    rows: [...byDomain.entries()].map(([domain, row]) => ({
      external_id: `${domain}:${input.signal}`,
      company_name: humanizeDomain(domain),
      website_url: `https://${domain}`,
      source_page_url: input.queryUrl,
      business_type: `common_crawl_${input.signal}_url_signal`,
      contact_page_url: input.signal === "contact" ? row.url : null,
      offer_page_url: input.signal === "contact" ? null : row.url,
      observed_at: row.timestamp,
      digest: row.digest,
    })),
  }
}

export function commonCrawlDomainSignalInputFromFieldMapping(sourceUrl: string, mapping: JsonRecord): CommonCrawlDomainSignalInput | null {
  if (textValue(mapping.common_crawl_domain_signal) !== "true") return null
  const signal = textValue(mapping.common_crawl_signal)
  const pages = pageList(mapping.common_crawl_pages)
  if ((signal !== "contact" && signal !== "commerce" && signal !== "saas") || pages.length === 0) {
    throw new Error("Common Crawl domain signal source requires a signal and bounded pages")
  }
  return {
    queryUrl: sourceUrl,
    signal,
    pages,
    maxRecords: boundedMaxRecords(mapping.common_crawl_max_records),
  }
}

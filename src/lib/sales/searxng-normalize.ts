import { normalizeDomain } from "./dedup"

export type JsonRecord = Record<string, unknown>
export type SearxngTimeRange = "day" | "month" | "year"
export type SearxngResultStatus = "ready" | "duplicate" | "rejected" | "imported"

export interface NormalizedSearxngCandidate {
  url: string
  domain: string
  title: string
  snippet: string
  engine: string | null
  category: string | null
  score: number
  status: SearxngResultStatus
  rejectionReason: string | null
  raw: JsonRecord
}

interface SearchUrlInput {
  query: string
  engines: string[]
  categories: string[]
  language: string
  safesearch: number
  page: number
  timeRange: SearxngTimeRange | null
}

const BLOCKED_HOST_PARTS = [
  // Search result pages (not the sites themselves)
  "www.google.",
  "www.bing.",
  "search.yahoo.",
  // Social media
  "facebook.",
  "instagram.",
  "linkedin.",
  "x.com",
  "twitter.",
  "tiktok.",
  "snapchat.",
  "pinterest.",
  "reddit.",
  "tumblr.",
  "threads.",
  // Video platforms
  "youtube.",
  "vimeo.",
  "dailymotion.",
  "twitch.",
  "nicovideo.",
  // Wikipedia / directories
  "wikipedia.",
  "wikimedia.",
  "yelp.",
  "tabelog.",
  "hotpepper.",
  "gurunavi.",
  // Japanese blog / note platforms
  "note.",
  "ameblo.",
  "ameba.",
  "hatenablog.",
  "hatena.ne.jp",
  "fc2.",
  "livedoor.",
  "goo.ne.jp",
  "blog.jp",
  "blog.fc2",
  // E-commerce marketplaces (not individual stores)
  "amazon.",
  "rakuten.co.jp",
  "mercari.",
  "paypaymall.",
  // Job boards
  "indeed.",
  "linkedin.com/jobs",
  "recruit.co.jp",
  "en-japan.",
  "baitoru.",
  // News aggregators
  "news.yahoo.",
  "news.google.",
  "prtimes.",
  "valuepress.",
  // Government / edu
  ".gov.",
  ".edu.",
  ".ac.jp",
  ".go.jp",
]

function normalizeBaseUrl(raw: string): URL {
  try {
    return new URL(raw)
  } catch (error) {
    console.error("[searxng-source] invalid SEARXNG_BASE_URL:", error)
    throw new Error("SEARXNG_BASE_URL is invalid")
  }
}

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    return /^https?:$/.test(url.protocol) ? url : null
  } catch (error) {
    console.warn("[searxng-source] skipped invalid result URL:", error)
    return null
  }
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : fallback
}

export function getSearxngOrigin(baseUrl: string): string {
  return normalizeBaseUrl(baseUrl).origin
}

export function buildSearxngSearchUrl(baseUrl: string, input: SearchUrlInput): string {
  const base = normalizeBaseUrl(baseUrl)
  const searchPath = `${base.pathname.replace(/\/+$/, "")}/search`
  const url = new URL(searchPath, base)
  url.searchParams.set("q", input.query)
  url.searchParams.set("format", "json")
  url.searchParams.set("pageno", String(input.page))
  url.searchParams.set("language", input.language)
  url.searchParams.set("safesearch", String(input.safesearch))
  if (input.categories.length > 0) url.searchParams.set("categories", input.categories.join(","))
  if (input.engines.length > 0) url.searchParams.set("engines", input.engines.join(","))
  if (input.timeRange) url.searchParams.set("time_range", input.timeRange)
  return url.toString()
}

export function scoreSearxngCandidate(
  candidate: Pick<NormalizedSearxngCandidate, "domain" | "title" | "snippet">,
  query: string,
): number {
  const haystack = `${candidate.domain} ${candidate.title} ${candidate.snippet}`.toLowerCase()
  let score = 42
  for (const token of query.toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length >= 4)) {
    if (haystack.includes(token)) score += 5
  }
  if (/contact|about|pricing|shop|store|demo|agency|service|powered by/i.test(candidate.snippet)) score += 12
  if (/shopify|klaviyo|stripe|webflow|hubspot|saas|ecommerce|marketing/i.test(haystack)) score += 12
  if (candidate.snippet.length >= 80) score += 8
  return Math.max(0, Math.min(100, score))
}

function resultFromRow(row: JsonRecord, query: string, seen: Set<string>): NormalizedSearxngCandidate | null {
  const parsed = parseUrl(String(row.url ?? ""))
  if (!parsed) return null
  const domain = normalizeDomain(parsed.hostname)
  if (!domain) return null
  const title = text(row.title, domain).slice(0, 180)
  const snippet = text(row.content ?? row.snippet ?? "").slice(0, 800)
  const blocked = BLOCKED_HOST_PARTS.some((part) => domain.includes(part))
  const duplicate = seen.has(domain)
  seen.add(domain)
  const status: SearxngResultStatus = blocked ? "rejected" : duplicate ? "duplicate" : "ready"
  return {
    url: parsed.toString(),
    domain,
    title,
    snippet,
    engine: text(row.engine) || null,
    category: text(row.category) || null,
    score: blocked ? 0 : scoreSearxngCandidate({ domain, title, snippet }, query),
    status,
    rejectionReason: blocked ? "blocked_directory_or_platform" : duplicate ? "duplicate_domain" : null,
    raw: row,
  }
}

export function normalizeSearxngResults(rows: JsonRecord[], query: string): NormalizedSearxngCandidate[] {
  const seen = new Set<string>()
  const results = rows
    .map((row) => resultFromRow(row, query, seen))
    .filter((item): item is NormalizedSearxngCandidate => item !== null)
  if (rows.length > 0 && results.length === 0) {
    console.error("[searxng-normalize] All results filtered out!", { total: rows.length, firstUrl: String(rows[0]?.url ?? "MISSING"), firstKeys: Object.keys(rows[0] || {}).join(",") })
  }
  return results
}

import { isCustomerFacingBusinessDomain } from "../data-quality-guard"
import { buildSearxngSearchUrl, normalizeSearxngResults, type JsonRecord } from "../searxng-normalize"
import { fetchSearxngPageWithRetry } from "./searxng-source-helpers"
import { buildFootprintQueries } from "./cms-footprint-search"

export interface SearxngFootprintDomainResult {
  ok: boolean
  domains: string[]
  total: number
  queries: string[]
  errors: string[]
  evidenceByDomain: Record<string, Record<string, unknown>>
}

const MAX_QUERIES = 6
const MAX_CONCURRENCY = 2

function searxngBaseUrl(): string | null {
  const value = process.env.SEARXNG_BASE_URL
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      output[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return output
}

export async function fetchSearxngFootprintDomains(input: {
  countryCode: string
  technology: string
  limit: number
}): Promise<SearxngFootprintDomainResult> {
  const baseUrl = searxngBaseUrl()
  if (!baseUrl) {
    return { ok: false, domains: [], total: 0, queries: [], errors: ["SEARXNG_BASE_URL is not configured"], evidenceByDomain: {} }
  }
  const queries = buildFootprintQueries(input.countryCode, [input.technology], MAX_QUERIES).slice(0, MAX_QUERIES)
  if (queries.length === 0) {
    return { ok: false, domains: [], total: 0, queries: [], errors: [`No footprint cities configured for ${input.countryCode}`], evidenceByDomain: {} }
  }

  const pages = await mapLimit(queries, MAX_CONCURRENCY, async (query) => {
    const url = buildSearxngSearchUrl(baseUrl, {
      query: query.query,
      engines: [],
      categories: ["general"],
      language: "en",
      safesearch: 1,
      page: 1,
      timeRange: null,
    })
    try {
      const payload = await fetchSearxngPageWithRetry(url, 1)
      return { query: query.query, rows: Array.isArray(payload.results) ? payload.results as JsonRecord[] : [], error: null }
    } catch (error) {
      return { query: query.query, rows: [] as JsonRecord[], error: error instanceof Error ? error.message : "SearXNG query failed" }
    }
  })

  const domains = new Set<string>()
  const evidenceByDomain: Record<string, Record<string, unknown>> = {}
  const errors: string[] = []
  for (const page of pages) {
    if (page.error) errors.push(`${page.query}: ${page.error}`)
    for (const candidate of normalizeSearxngResults(page.rows, page.query)) {
      if (domains.size >= input.limit) break
      if (candidate.status !== "ready" || !isCustomerFacingBusinessDomain(candidate.domain)) continue
      domains.add(candidate.domain)
      evidenceByDomain[candidate.domain] = {
        discovery_query: page.query,
        discovery_title: candidate.title,
        discovery_snippet: candidate.snippet,
        discovery_engine: candidate.engine,
        discovery_score: candidate.score,
        discovery_technology_hint: input.technology,
        skip_active_verification: false,
      }
    }
  }
  return {
    ok: domains.size > 0,
    domains: [...domains],
    total: domains.size,
    queries: queries.map((query) => query.query),
    errors,
    evidenceByDomain,
  }
}

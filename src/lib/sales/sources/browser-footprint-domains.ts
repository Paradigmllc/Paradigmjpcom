import { searchWithBrowser } from "./browser-search"
import { buildFootprintQueries } from "./cms-footprint-search"
import { isCustomerFacingBusinessDomain } from "../data-quality-guard"

export interface BrowserFootprintDomainResult {
  ok: boolean
  domains: string[]
  total: number
  queries: string[]
  errors: string[]
}

const ENGINES = ["duckduckgo", "brave", "google"] as const
const MAX_QUERIES = 6
const MAX_CONCURRENCY = 2

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index] as T, index)
    }
  })
  await Promise.all(workers)
  return results
}

export async function fetchBrowserFootprintDomains(input: {
  countryCode: string
  technology: string
  limit: number
}): Promise<BrowserFootprintDomainResult> {
  const queries = buildFootprintQueries(input.countryCode, [input.technology], MAX_QUERIES).slice(0, MAX_QUERIES)
  if (queries.length === 0) {
    return { ok: false, domains: [], total: 0, queries: [], errors: [`No footprint cities configured for ${input.countryCode}`] }
  }

  const results = await mapLimit(queries, MAX_CONCURRENCY, async (query, index) => {
    const engine = ENGINES[index % ENGINES.length] ?? "duckduckgo"
    return searchWithBrowser(query.query, engine)
  })
  const domains = new Set<string>()
  const errors: string[] = []

  results.forEach((result, index) => {
    if (!result.ok && result.error) errors.push(`${queries[index]?.city ?? input.countryCode}: ${result.error}`)
    for (const domain of result.domains) {
      if (domains.size >= input.limit) break
      if (isCustomerFacingBusinessDomain(domain)) domains.add(domain)
    }
  })

  return {
    ok: domains.size > 0,
    domains: [...domains],
    total: domains.size,
    queries: queries.map((query) => query.query),
    errors,
  }
}

import { fetchBulkDomainCorpus } from "./sources/bulk-domain-corpus"
import { fetchPassiveInventoryDomains, passivePatterns } from "./passive-inventory"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"

export interface CandidateDomainSourceSummary {
  source: string
  pattern: string
  fetched: number
  total: number
  ok: boolean
  error?: string
}

export interface CandidateDomainFetchResult {
  domains: string[]
  failures: Array<{ key: string; reason: string }>
  sourceStats: CandidateDomainSourceSummary[]
  sourceByDomain: Record<string, string[]>
  evidenceByDomain?: Record<string, Record<string, unknown>>
}

const MAX_FAILURES = 40

interface FetchLeadCandidateDomainsOptions {
  onProgress?: (result: CandidateDomainFetchResult) => Promise<void>
  skipPassiveInventory?: boolean
}

function addDomains(input: {
  sourceByDomain: Map<string, Set<string>>
  source: string
  domains: string[]
  limit: number
}) {
  for (const domain of input.domains) {
    if (!isCustomerFacingBusinessDomain(domain)) continue
    if (input.sourceByDomain.size >= input.limit && !input.sourceByDomain.has(domain)) break
    const sources = input.sourceByDomain.get(domain) ?? new Set<string>()
    sources.add(input.source)
    input.sourceByDomain.set(domain, sources)
  }
}

function addCorpusDomains(input: {
  destination: Map<string, Set<string>>
  domains: string[]
  corpusSources: Record<string, string[]>
  limit: number
}) {
  for (const domain of input.domains) {
    if (!isCustomerFacingBusinessDomain(domain)) continue
    if (input.destination.size >= input.limit && !input.destination.has(domain)) break
    const sources = input.destination.get(domain) ?? new Set<string>()
    for (const source of input.corpusSources[domain] ?? ["bulk_domain_corpus"]) sources.add(source)
    input.destination.set(domain, sources)
  }
}

function serializeSourceByDomain(sourceByDomain: Map<string, Set<string>>): Record<string, string[]> {
  return Object.fromEntries([...sourceByDomain.entries()].map(([domain, sources]) => [domain, [...sources].sort()]))
}

function buildResult(input: {
  sourceByDomain: Map<string, Set<string>>
  evidenceByDomain: Map<string, Record<string, unknown>>
  failures: Array<{ key: string; reason: string }>
  sourceStats: CandidateDomainSourceSummary[]
  limit: number
}): CandidateDomainFetchResult {
  return {
    // Preserve source priority: verified technology-footprint candidates must be
    // processed before generic TLD fallbacks.
    domains: [...input.sourceByDomain.keys()].slice(0, input.limit),
    failures: input.failures.slice(0, MAX_FAILURES),
    sourceStats: input.sourceStats,
    sourceByDomain: serializeSourceByDomain(input.sourceByDomain),
    evidenceByDomain: Object.fromEntries(input.evidenceByDomain.entries()),
  }
}

async function emitProgress(input: {
  options?: FetchLeadCandidateDomainsOptions
  sourceByDomain: Map<string, Set<string>>
  evidenceByDomain: Map<string, Record<string, unknown>>
  failures: Array<{ key: string; reason: string }>
  sourceStats: CandidateDomainSourceSummary[]
  limit: number
}) {
  if (!input.options?.onProgress) return
  await input.options.onProgress(buildResult(input))
}

export async function fetchLeadCandidateDomains(countryCode: string, limit: number, options?: FetchLeadCandidateDomainsOptions & { technology?: string | null }): Promise<CandidateDomainFetchResult> {
  const patterns = passivePatterns(countryCode, options?.technology ?? null)
  const sourceByDomain = new Map<string, Set<string>>()
  const evidenceByDomain = new Map<string, Record<string, unknown>>()
  const failures: Array<{ key: string; reason: string }> = []
  const sourceStats: CandidateDomainSourceSummary[] = []
  const perPatternLimit = Math.max(20, Math.ceil(limit / Math.max(patterns.length, 1)))

  const withRetry = async <T>(key: string, fn: () => Promise<T>, retries = 2): Promise<T> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try { return await fn() }
      catch (e) {
        if (attempt === retries) {
          console.error(`[candidate-domains] ${key} failed after ${retries + 1} attempts:`, e instanceof Error ? e.message : String(e))
          throw e
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    throw new Error("unreachable")
  }

  if (!options?.skipPassiveInventory) {
    try {
      const passive = await withRetry("passive_inventory", () => fetchPassiveInventoryDomains(countryCode, options?.technology ?? null, Math.min(limit, perPatternLimit)))
      sourceStats.push(...passive.sourceStats.map((stat) => ({ ...stat, source: stat.source === "czds_local_zone" || stat.source === "czds_api_zone" ? "passive_inventory" : stat.source })))
      failures.push(...passive.failures)
      addDomains({ sourceByDomain, source: "passive_inventory", domains: passive.domains, limit })
      for (const [domain, evidence] of Object.entries(passive.evidenceByDomain)) evidenceByDomain.set(domain, evidence)
    } catch (e) {
      console.error("[lead-candidate-domain-sources] passive_inventory failed:", e instanceof Error ? e.message : String(e))
      failures.push({ key: "passive_inventory", reason: e instanceof Error ? e.message : "passive inventory failed with retries" })
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) return buildResult({ sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
  }

  // Bulk acquisition must remain independent from search engines, proxies,
  // per-domain certificate queries, and Common Crawl's rate-limited CDX API.
  for (const pattern of patterns) {
    try {
      const corpus = await withRetry(`bulk_corpus_${pattern}`, () => fetchBulkDomainCorpus(pattern, perPatternLimit))
      sourceStats.push(...corpus.sourceStats)
      failures.push(...corpus.failures)
      addCorpusDomains({ destination: sourceByDomain, domains: corpus.domains, corpusSources: corpus.sourceByDomain, limit })
    } catch (e) {
      console.error("[lead-candidate-domain-sources] bulk_domain_corpus failed:", pattern, e instanceof Error ? e.message : String(e))
      failures.push({ key: `bulk_domain_corpus:${pattern}`, reason: e instanceof Error ? e.message : "Bulk domain corpus failed with retries" })
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) break
  }

  if (sourceByDomain.size === 0 && failures.length === 0) {
    failures.push({ key: countryCode, reason: "All bulk sources returned zero candidate domains" })
  }

  return buildResult({ sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
}

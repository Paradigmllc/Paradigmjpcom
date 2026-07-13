import { tldPatternsForCountry } from "./lead-candidate-scoring"
import { fetchCommonCrawlDomains } from "./sources/commoncrawl-domains"
import { fetchCrtshDomains } from "./sources/crtsh-bulk"
import { fetchTrancoTopDomains } from "./sources/tranco-top-domains"
import { fetchPassiveInventoryDomains } from "./passive-inventory"
import { fetchHttpArchiveCandidates, toTechItems } from "./sources/http-archive-bigquery"
import { fetchBrowserFootprintDomains } from "./sources/browser-footprint-domains"

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
  skipBigQuery?: boolean
}

function toCrtshPattern(pattern: string): string {
  return pattern.replace(/^\*\./, "%.").replace(/^\*/, "%")
}

function addDomains(input: {
  sourceByDomain: Map<string, Set<string>>
  source: string
  domains: string[]
  limit: number
}) {
  for (const domain of input.domains) {
    if (input.sourceByDomain.size >= input.limit && !input.sourceByDomain.has(domain)) break
    const sources = input.sourceByDomain.get(domain) ?? new Set<string>()
    sources.add(input.source)
    input.sourceByDomain.set(domain, sources)
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
  const patterns = tldPatternsForCountry(countryCode)
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

  // Existing self-hosted browser search finds technology-specific SMB candidates
  // without promoting raw search results into sales_companies.
  if (options?.technology) {
    try {
      const browser = await withRetry("browser_footprint", () => fetchBrowserFootprintDomains({
        countryCode,
        technology: options.technology as string,
        limit: Math.min(limit, 200),
      }), 1)
      sourceStats.push({
        source: "browser_footprint",
        pattern: `${countryCode}:${options.technology}`,
        fetched: browser.domains.length,
        total: browser.total,
        ok: browser.ok,
        error: browser.errors.length > 0 ? browser.errors.join("; ") : undefined,
      })
      addDomains({ sourceByDomain, source: "browser_footprint", domains: browser.domains, limit })
      for (const domain of browser.domains) {
        evidenceByDomain.set(domain, {
          discovery_technology_hint: options.technology,
          discovery_queries: browser.queries,
          skip_active_verification: false,
        })
      }
      if (!browser.ok) failures.push({ key: "browser_footprint", reason: browser.errors.join("; ") || "Browser footprint search returned no domains" })
    } catch (error) {
      console.error("[lead-candidate-domain-sources] browser_footprint failed:", error)
      failures.push({ key: "browser_footprint", reason: error instanceof Error ? error.message : "Browser footprint search failed" })
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) return buildResult({ sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
  }

  // HTTP Archive BigQuery — bulk tech-stack discovery (free 1TB/month)
  if (!options?.skipBigQuery) {
    try {
      const bq = await withRetry("http_archive", () => fetchHttpArchiveCandidates({
        countryCode,
        technologies: options?.technology ? [options.technology] : undefined,
        limit: Math.min(limit, 200),
      }))
      sourceStats.push({
        source: "http_archive",
        pattern: countryCode,
        fetched: bq.candidates.length,
        total: bq.candidates.length,
        ok: bq.ok,
        error: bq.error,
      })
      if (bq.ok && bq.candidates.length > 0) {
        const domains = bq.candidates.map((c) => c.domain)
        addDomains({ sourceByDomain, source: "http_archive", domains, limit })
        for (const cand of bq.candidates) {
          if (cand.technologies.length > 0) {
            evidenceByDomain.set(cand.domain, {
              http_archive_techs: toTechItems(cand.technologies),
              http_archive_rank: cand.rank,
              http_archive_snapshot: cand.snapshotMonth,
            })
          }
        }
      }
      if (!bq.ok && bq.error) failures.push({ key: "http_archive", reason: bq.error })
    } catch (e) {
      console.error("[lead-candidate-domain-sources] http_archive failed:", e instanceof Error ? e.message : String(e))
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) return buildResult({ sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
  }

  for (const pattern of patterns) {
    try {
      const cc = await withRetry(`cc_${pattern}`, () => fetchCommonCrawlDomains(pattern, perPatternLimit))
      sourceStats.push({ source: "common_crawl_domains", pattern, fetched: cc.domains.length, total: cc.total, ok: cc.ok, error: cc.error })
      if (!cc.ok) failures.push({ key: `common_crawl_domains:${pattern}`, reason: cc.error ?? "Common Crawl returned no domains" })
      addDomains({ sourceByDomain, source: "common_crawl_domains", domains: cc.domains, limit })
    } catch (e) {
      console.error("[lead-candidate-domain-sources] common_crawl_domains failed:", pattern, e instanceof Error ? e.message : String(e))
      failures.push({ key: `common_crawl_domains:${pattern}`, reason: e instanceof Error ? e.message : "Common Crawl failed with retries" })
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) break

    try {
      const tranco = await withRetry(`tranco_${pattern}`, () => fetchTrancoTopDomains(pattern, perPatternLimit))
      sourceStats.push({ source: "tranco_top_domains", pattern, fetched: tranco.domains.length, total: tranco.total, ok: tranco.ok, error: tranco.error })
      if (!tranco.ok) failures.push({ key: `tranco_top_domains:${pattern}`, reason: tranco.error ?? "Tranco top list returned no domains" })
      addDomains({ sourceByDomain, source: "tranco_top_domains", domains: tranco.domains, limit })
    } catch (e) {
      console.error("[lead-candidate-domain-sources] tranco_top_domains failed:", pattern, e instanceof Error ? e.message : String(e))
      failures.push({ key: `tranco_top_domains:${pattern}`, reason: e instanceof Error ? e.message : "Tranco failed with retries" })
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) break

    try {
      const crtPattern = toCrtshPattern(pattern)
      const crt = await withRetry(`crt_${pattern}`, () => fetchCrtshDomains(crtPattern, perPatternLimit))
      sourceStats.push({ source: "crtsh_bulk", pattern: crtPattern, fetched: crt.domains.length, total: crt.total, ok: crt.ok, error: crt.error })
      if (!crt.ok) failures.push({ key: `crtsh_bulk:${crtPattern}`, reason: crt.error ?? "crt.sh returned no domains" })
      addDomains({ sourceByDomain, source: "crtsh_bulk", domains: crt.domains, limit })
    } catch (e) {
      console.error("[lead-candidate-domain-sources] crtsh_bulk failed:", pattern, e instanceof Error ? e.message : String(e))
      failures.push({ key: `crtsh_bulk:${pattern}`, reason: e instanceof Error ? e.message : "crt.sh failed with retries" })
    }
    await emitProgress({ options, sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
    if (sourceByDomain.size >= limit) break
  }

  if (sourceByDomain.size === 0 && failures.length === 0) {
    failures.push({ key: countryCode, reason: "All bulk sources returned zero candidate domains" })
  }

  return buildResult({ sourceByDomain, evidenceByDomain, failures, sourceStats, limit })
}

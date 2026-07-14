import { fetchZoneDomains } from "./czds-zone-files"
import { fetchPassiveDomainFeeds } from "./passive-domain-feeds"
import { fetchTrancoTopDomains } from "./tranco-top-domains"

export interface BulkDomainCorpusResult {
  ok: boolean
  domains: string[]
  sourceByDomain: Record<string, string[]>
  sourceStats: Array<{ source: string; pattern: string; fetched: number; total: number; ok: boolean; error?: string }>
  failures: Array<{ key: string; reason: string }>
}

function appendDomains(
  destination: Map<string, Set<string>>,
  domains: string[],
  source: string,
  limit: number,
): void {
  for (const domain of domains) {
    if (destination.size >= limit && !destination.has(domain)) break
    const sources = destination.get(domain) ?? new Set<string>()
    sources.add(source)
    destination.set(domain, sources)
  }
}

/**
 * Builds a bounded corpus without search engines or per-domain archive queries.
 * Zone files and operator feeds take priority; Tranco is the zero-config,
 * reproducible fallback. Technology and country are verified after acquisition.
 */
export async function fetchBulkDomainCorpus(pattern: string, limit: number): Promise<BulkDomainCorpusResult> {
  const boundedLimit = Math.max(1, Math.min(limit, 100_000))
  const sourceByDomain = new Map<string, Set<string>>()
  const sourceStats: BulkDomainCorpusResult["sourceStats"] = []
  const failures: BulkDomainCorpusResult["failures"] = []

  const zone = await fetchZoneDomains([pattern], boundedLimit)
  appendDomains(sourceByDomain, zone.domains, "zone_file", boundedLimit)
  sourceStats.push(...zone.sourceStats)
  failures.push(...zone.failures)

  if (sourceByDomain.size < boundedLimit) {
    const feed = await fetchPassiveDomainFeeds(pattern, boundedLimit - sourceByDomain.size)
    appendDomains(sourceByDomain, feed.domains, "passive_domain_feed", boundedLimit)
    sourceStats.push(...feed.sourceStats)
    failures.push(...feed.failures)
  }

  if (sourceByDomain.size < boundedLimit) {
    const tranco = await fetchTrancoTopDomains(pattern, boundedLimit - sourceByDomain.size)
    appendDomains(sourceByDomain, tranco.domains, "tranco_top_domains", boundedLimit)
    sourceStats.push({
      source: "tranco_top_domains",
      pattern,
      fetched: tranco.domains.length,
      total: tranco.total,
      ok: tranco.ok,
      error: tranco.error,
    })
    if (!tranco.ok) failures.push({ key: `tranco_top_domains:${pattern}`, reason: tranco.error ?? "Tranco returned no domains" })
  }

  const domains = [...sourceByDomain.keys()].slice(0, boundedLimit)
  if (domains.length === 0 && failures.length === 0) {
    failures.push({ key: `bulk_domain_corpus:${pattern}`, reason: "Zone files, passive feeds, and Tranco returned zero domains" })
  }
  return {
    ok: domains.length > 0,
    domains,
    sourceByDomain: Object.fromEntries([...sourceByDomain.entries()].map(([domain, sources]) => [domain, [...sources].sort()])),
    sourceStats,
    failures,
  }
}

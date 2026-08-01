import { normalizeSalesCountryCode } from "./country-code"
import { tldPatternsForCountry } from "./lead-candidate-scoring"
import { ingestFreshDomainCandidates, type FreshDomainInputRow } from "./lead-candidates-fresh-domains"
import { fetchCrtshDomains } from "./sources/crtsh-bulk"
import { fetchZoneDomains } from "./sources/czds-zone-files"

export interface FreshDomainDiscoveryInput {
  countryCode: string
  limit?: number
  lookupLimit?: number
  promote?: boolean
  websiteState?: FreshDomainInputRow["websiteState"]
}

export interface FreshDomainDiscoveryResult {
  ok: boolean
  source: string
  countryCode: string
  discovered: number
  rdapChecked: number
  sourceStats: Array<{ source: string; pattern: string; fetched: number; total: number; ok: boolean; error?: string }>
  failures: Array<{ key: string; reason: string }>
  ingestion: Awaited<ReturnType<typeof ingestFreshDomainCandidates>>
}

interface RdapDates {
  registeredAt: string | null
  changedAt: string | null
  eventActions: string[]
  statuses: string[]
  lookupUrl: string | null
}

export interface FreshDomainSeed {
  domain: string
  sources: string[]
  rdap?: RdapDates | null
}

const DEFAULT_LIMIT = 120
const DEFAULT_LOOKUP_LIMIT = 60
const MAX_LIMIT = 500
const MAX_LOOKUP_LIMIT = 120

function clampInt(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.trunc(value ?? fallback), 1), max)
}

function normalizeDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "")
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : null
}

function rdapLookupUrl(domain: string): string {
  const template = process.env.RDAP_DOMAIN_LOOKUP_URL_TEMPLATE?.trim()
  if (template) return template.replace("{domain}", encodeURIComponent(domain))
  return `https://rdap.org/domain/${encodeURIComponent(domain)}`
}

function eventDate(body: { events?: unknown }, actions: string[]): string | null {
  if (!Array.isArray(body.events)) return null
  for (const action of actions) {
    const match = body.events.find((item) => {
      if (!item || typeof item !== "object") return false
      const row = item as { eventAction?: unknown; eventDate?: unknown }
      return typeof row.eventAction === "string" && row.eventAction.toLowerCase() === action
    }) as { eventDate?: unknown } | undefined
    if (typeof match?.eventDate === "string") return match.eventDate
  }
  return null
}

function eventActions(body: { events?: unknown }): string[] {
  if (!Array.isArray(body.events)) return []
  return body.events
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const action = (item as { eventAction?: unknown }).eventAction
      return typeof action === "string" ? action : null
    })
    .filter((action): action is string => Boolean(action))
    .slice(0, 12)
}

async function fetchRdapDates(domain: string): Promise<RdapDates> {
  const url = rdapLookupUrl(domain)
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rdap+json, application/json", "User-Agent": "RevenueOS-FreshDomains/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new Error(`RDAP HTTP ${res.status}`)
    const body = await res.json() as { events?: unknown; status?: unknown }
    return {
      registeredAt: eventDate(body, ["registration", "registered"]),
      changedAt: eventDate(body, ["last changed", "last update of rdap database", "expiration"]),
      eventActions: eventActions(body),
      statuses: Array.isArray(body.status) ? body.status.filter((item): item is string => typeof item === "string").slice(0, 12) : [],
      lookupUrl: url,
    }
  } catch (error) {
    return {
      registeredAt: null,
      changedAt: null,
      eventActions: [],
      statuses: [],
      lookupUrl: url,
    }
  }
}

export function freshDomainRowsFromSeeds(input: {
  countryCode: string
  seeds: FreshDomainSeed[]
  websiteState?: FreshDomainInputRow["websiteState"]
}): FreshDomainInputRow[] {
  const countryCode = normalizeSalesCountryCode(input.countryCode)
  return input.seeds.map((seed) => ({
    domain: seed.domain,
    countryCode,
    registeredAt: seed.rdap?.registeredAt ?? null,
    changedAt: seed.rdap?.changedAt ?? null,
    websiteState: input.websiteState ?? "unknown",
    sourceUrl: seed.rdap?.lookupUrl ?? null,
    raw: {
      acquisition_sources: [...new Set(seed.sources)].sort(),
      rdap_checked: Boolean(seed.rdap),
      rdap_event_actions: seed.rdap?.eventActions ?? [],
      rdap_statuses: seed.rdap?.statuses ?? [],
    },
  }))
}

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let index = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await fn(items[current] as T)
    }
  })
  await Promise.all(workers)
  return results
}

async function fetchFreshDomainSeeds(countryCode: string, limit: number) {
  const patterns = tldPatternsForCountry(countryCode)
  const sourceByDomain = new Map<string, Set<string>>()
  const sourceStats: FreshDomainDiscoveryResult["sourceStats"] = []
  const failures: FreshDomainDiscoveryResult["failures"] = []

  const add = (source: string, domains: string[]) => {
    for (const value of domains) {
      if (sourceByDomain.size >= limit && !sourceByDomain.has(value)) break
      const domain = normalizeDomain(value)
      if (!domain) continue
      const sources = sourceByDomain.get(domain) ?? new Set<string>()
      sources.add(source)
      sourceByDomain.set(domain, sources)
    }
  }

  try {
    const zone = await fetchZoneDomains(patterns, limit)
    sourceStats.push(...zone.sourceStats)
    failures.push(...zone.failures)
    add("zone_file", zone.domains)
  } catch (error) {
    failures.push({ key: "zone_file", reason: error instanceof Error ? error.message : "zone domain fetch failed" })
  }

  for (const pattern of patterns) {
    if (sourceByDomain.size >= limit) break
    const crtPattern = pattern.replace(/^\*\./, "%.").replace(/^\*/, "%")
    try {
      const crt = await fetchCrtshDomains(crtPattern, Math.max(20, Math.ceil(limit / patterns.length)))
      sourceStats.push({ source: "crtsh_bulk", pattern: crtPattern, fetched: crt.domains.length, total: crt.total, ok: crt.ok, error: crt.error })
      if (!crt.ok) failures.push({ key: `crtsh_bulk:${crtPattern}`, reason: crt.error ?? "crt.sh returned no domains" })
      add("crtsh_bulk", crt.domains)
    } catch (error) {
      failures.push({ key: `crtsh_bulk:${crtPattern}`, reason: error instanceof Error ? error.message : "crt.sh fetch failed" })
    }
  }

  return { domains: [...sourceByDomain.keys()].slice(0, limit), sourceByDomain, sourceStats, failures }
}

export async function discoverAndIngestFreshDomains(input: FreshDomainDiscoveryInput): Promise<FreshDomainDiscoveryResult> {
  const countryCode = normalizeSalesCountryCode(input.countryCode)
  const limit = clampInt(input.limit, DEFAULT_LIMIT, MAX_LIMIT)
  const lookupLimit = Math.min(clampInt(input.lookupLimit, DEFAULT_LOOKUP_LIMIT, MAX_LOOKUP_LIMIT), limit)
  const discovered = await fetchFreshDomainSeeds(countryCode, limit)
  const rdapRows = await mapLimit(discovered.domains.slice(0, lookupLimit), 5, async (domain) => ({
    domain,
    rdap: await fetchRdapDates(domain),
  }))
  const rdapByDomain = new Map(rdapRows.map((row) => [row.domain, row.rdap]))

  const rows = freshDomainRowsFromSeeds({
    countryCode,
    websiteState: input.websiteState,
    seeds: discovered.domains.map((domain) => ({
      domain,
      sources: [...(discovered.sourceByDomain.get(domain) ?? new Set<string>())],
      rdap: rdapByDomain.get(domain) ?? null,
    })),
  })

  const ingestion = await ingestFreshDomainCandidates(rows, input.promote === true)
  return {
    ok: ingestion.ok && rows.length > 0,
    source: "dns_freshness_discovery",
    countryCode,
    discovered: rows.length,
    rdapChecked: rdapRows.length,
    sourceStats: discovered.sourceStats,
    failures: [...discovered.failures, ...ingestion.failures],
    ingestion,
  }
}

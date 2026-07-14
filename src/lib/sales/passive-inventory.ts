import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { inferCountrySignals, technologySlug, tldPatternsForCountry } from "./lead-candidate-scoring"
import { optionalEnv } from "./japan-readiness-utils"
import { fetchBulkDomainCorpus } from "./sources/bulk-domain-corpus"
import { scanCnameRecords } from "./sources/passive-cname-scan"
import { passiveEvidence, techFromCname, type PassiveEvidence } from "./passive-inventory-utils"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export interface PassiveInventoryResult {
  ok: boolean
  domains: string[]
  sourceByDomain: Record<string, string[]>
  evidenceByDomain: Record<string, Record<string, unknown>>
  sourceStats: Array<{ source: string; pattern: string; fetched: number; total: number; ok: boolean; error?: string }>
  failures: Array<{ key: string; reason: string }>
  configuration: PassiveInventoryConfiguration
}

export interface PassiveInventoryConfiguration {
  zoneInputsConfigured: boolean
  zoneInputModes: string[]
  domainFeedConfigured: boolean
  passiveGlobalTldsConfigured: boolean
}

interface PassiveDomainRow {
  domain: string
  root_url: string
  source_slug: string
  zone_tld: string | null
  country_code: string
  technology: string | null
  cname_target: string | null
  stack_matched: boolean
  geo_matched: boolean
  geo_confidence: number
  geo_signals: unknown[]
  passive_evidence: Record<string, unknown>
  status: "candidate" | "scored" | "promoted" | "rejected" | "failed"
}

const HOSTED_STACKS = new Set(["shopify", "webflow", "wix", "squarespace", "hubspot", "zendesk", "intercom", "klaviyo", "twilio"])

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function nowIso(): string {
  return new Date().toISOString()
}

function hasHostedCnameSignal(technology: string | null): boolean {
  return technology ? HOSTED_STACKS.has(technologySlug(technology)) : true
}

export function passivePatterns(countryCode: string, technology: string | null): string[] {
  const patterns = [...tldPatternsForCountry(countryCode)]
  const extra = optionalEnv("PASSIVE_GLOBAL_TLDS") ?? (hasHostedCnameSignal(technology) ? "com,net,org,shop,store" : "")
  for (const tld of extra.split(",")) {
    const clean = tld.trim().replace(/^\*\./, "").replace(/^\./, "")
    if (clean) patterns.push(`*.${clean}`)
  }
  return [...new Set(patterns)]
}

export function getPassiveInventoryConfiguration(): PassiveInventoryConfiguration {
  const zoneInputModes: string[] = []
  if (optionalEnv("CZDS_ZONE_FILE_DIR") || optionalEnv("PASSIVE_ZONE_FILE_DIR")) zoneInputModes.push("local_zone_dir")
  if (optionalEnv("CZDS_ZONE_FILE_URLS")) zoneInputModes.push("zone_file_urls")
  if (optionalEnv("CZDS_ACCESS_TOKEN") || optionalEnv("CZDS_USERNAME") || optionalEnv("ICANN_CZDS_USERNAME")) zoneInputModes.push("czds_api")
  return {
    zoneInputsConfigured: zoneInputModes.length > 0,
    zoneInputModes,
    domainFeedConfigured: Boolean(optionalEnv("PASSIVE_DOMAIN_FEED_DIR") || optionalEnv("PASSIVE_DOMAIN_FEED_URLS")),
    passiveGlobalTldsConfigured: Boolean(optionalEnv("PASSIVE_GLOBAL_TLDS")),
  }
}

function domainTld(domain: string): string | null {
  const parts = domain.split(".")
  return parts.length > 1 ? parts[parts.length - 1] ?? null : null
}

function isCountryTld(domain: string, countryCode: string): boolean {
  const cc = countryCode.toLowerCase()
  return domain.toLowerCase().endsWith(`.${cc}`) || (cc === "za" && domain.endsWith(".co.za"))
}

function maxConfidence(signals: Array<{ confidence: number }>): number {
  return signals.reduce((max, signal) => Math.max(max, signal.confidence), 0)
}

function techMatches(technology: string | null, evidence: PassiveEvidence): boolean {
  if (!technology) return evidence.technologies.length > 0
  const requested = technologySlug(technology)
  return evidence.technologies.some((tech) => technologySlug(tech.name) === requested)
}

async function createRun(countryCode: string, technology: string | null, limit: number, patterns: string[]): Promise<string | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) return null
  const { data, error } = await sb.from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS).insert({
    source_slug: "passive_inventory",
    status: "running",
    country_code: countryCode,
    technology,
    requested_limit: limit,
    zone_patterns: patterns,
    started_at: nowIso(),
    heartbeat_at: nowIso(),
  }).select("id").single()
  if (error) {
    console.error("[passive-inventory] run create failed:", error.message)
    return null
  }
  return String(data.id)
}

async function updateRun(runId: string | null, patch: Record<string, unknown>): Promise<void> {
  if (!runId) return
  const { error } = await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS).update({ ...patch, heartbeat_at: nowIso() }).eq("id", runId)
  if (error) {
    console.error("[passive-inventory] run update failed:", error.message)
    throw new Error(`run update failed: ${error.message}`)
  }
}

function enrichGeo(domain: string, countryCode: string, tldMatched: boolean) {
  const baseSignals = inferCountrySignals({ domain, targetCountry: countryCode })
  if (tldMatched && maxConfidence(baseSignals) >= 60) return { signals: baseSignals, sample: null, checked: 0 }
  return { signals: baseSignals, sample: null, checked: 0 }
}

async function persistRows(runId: string | null, rows: PassiveDomainRow[]): Promise<void> {
  if (!runId || rows.length === 0) return
  const sb = getSb()
  for (let index = 0; index < rows.length; index += 500) {
    const part = rows.slice(index, index + 500).map((row) => ({ ...row, run_id: runId, observed_at: nowIso() }))
    const { error } = await sb.from(DB_TABLES.SALES_PASSIVE_INVENTORY_DOMAINS).upsert(part, { onConflict: "run_id,domain", ignoreDuplicates: false })
    if (error) throw new Error(error.message)
  }
}

export async function processPassiveInventoryDomainBatch(input: {
  runId: string | null
  countryCode: string
  technology: string | null
  domains: string[]
  sourceLabel: string
  limit: number
  cnameConcurrency?: number
  onProgress?: (progress: { processed: number; stackMatched: number; geoMatched: number; persisted: number }) => Promise<void>
}): Promise<{
  checked: number
  stackMatched: number
  geoMatched: number
  persisted: number
  domains: string[]
  sourceByDomain: Record<string, string[]>
  evidenceByDomain: Record<string, Record<string, unknown>>
  failures: Array<{ key: string; reason: string }>
}> {
  const countryCode = input.countryCode.trim().toUpperCase()
  const technology = input.technology?.trim() || null
  const uniqueDomains = [...new Set(input.domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))].slice(0, input.limit)
  const failures: Array<{ key: string; reason: string }> = []
  const sourceByDomain = new Map<string, Set<string>>()
  const evidenceByDomain: Record<string, Record<string, unknown>> = {}
  const selectedRows: PassiveDomainRow[] = []
  const observedRows: PassiveDomainRow[] = []
  let stackMatchedCount = 0
  let geoMatchedCount = 0

  const cname = await scanCnameRecords(uniqueDomains, { concurrency: input.cnameConcurrency ?? 64 })
  if (cname.error) failures.push({ key: "passive_cname_scan", reason: cname.error })

  for (const [index, domain] of uniqueDomains.entries()) {
    if (selectedRows.length >= input.limit) break
    const progress = async () => {
      if (input.onProgress && (index + 1) % 250 === 0) {
        await input.onProgress({ processed: index + 1, stackMatched: stackMatchedCount, geoMatched: geoMatchedCount, persisted: selectedRows.length })
      }
    }
    const cnameTarget = cname.records[domain] ?? null
    const evidence = passiveEvidence({ sources: ["passive_inventory", input.sourceLabel, `passive_cname_${cname.engine}`], cnameTarget })
    const stackMatched = techMatches(technology, evidence)
    if (!stackMatched) {
      await progress()
      continue
    }
    stackMatchedCount += 1
    const tldMatched = isCountryTld(domain, countryCode)
    const geo = enrichGeo(domain, countryCode, tldMatched)
    const geoConfidence = maxConfidence(geo.signals)
    const geoMatched = geoConfidence >= 60
    if (geoMatched) geoMatchedCount += 1
    const raw = {
      ...evidence.raw,
      skip_active_verification: geoMatched,
    }
    const finalEvidence = passiveEvidence({ ...evidence, countrySignals: geo.signals, raw })
    const row: PassiveDomainRow = {
      domain,
      root_url: `https://${domain}`,
      source_slug: "passive_inventory",
      zone_tld: domainTld(domain),
      country_code: countryCode,
      technology,
      cname_target: cnameTarget,
      stack_matched: stackMatched,
      geo_matched: geoMatched,
      geo_confidence: geoConfidence,
      geo_signals: geo.signals,
      passive_evidence: finalEvidence as unknown as Record<string, unknown>,
      status: "candidate",
    }
    observedRows.push(row)
    selectedRows.push(row)
    sourceByDomain.set(domain, new Set(finalEvidence.sources))
    evidenceByDomain[domain] = finalEvidence as unknown as Record<string, unknown>
    await progress()
  }

  await persistRows(input.runId, observedRows)
  return {
    checked: cname.checked,
    stackMatched: stackMatchedCount,
    geoMatched: geoMatchedCount,
    persisted: selectedRows.length,
    domains: selectedRows.map((row) => row.domain),
    sourceByDomain: Object.fromEntries([...sourceByDomain.entries()].map(([domain, sources]) => [domain, [...sources].sort()])),
    evidenceByDomain,
    failures,
  }
}

export async function fetchPassiveInventoryDomains(countryCodeRaw: string, technologyRaw: string | null, limit: number): Promise<PassiveInventoryResult> {
  const countryCode = countryCodeRaw.trim().toUpperCase()
  const technology = technologyRaw?.trim() || null
  const patterns = passivePatterns(countryCode, technology)
  const runId = await createRun(countryCode, technology, limit, patterns)
  const failures: PassiveInventoryResult["failures"] = []
  const sourceByDomain = new Map<string, Set<string>>()
  const evidenceByDomain: Record<string, Record<string, unknown>> = {}
  const configuration = getPassiveInventoryConfiguration()

  try {
    const corpusLimit = Math.min(Math.max(limit * 5, 500), 20_000)
    const perPatternLimit = Math.max(100, Math.ceil(corpusLimit / Math.max(patterns.length, 1)))
    const corpusDomains = new Set<string>()
    const corpusStats: PassiveInventoryResult["sourceStats"] = []
    for (const pattern of patterns) {
      if (corpusDomains.size >= corpusLimit) break
      const corpus = await fetchBulkDomainCorpus(pattern, Math.min(perPatternLimit, corpusLimit - corpusDomains.size))
      corpus.domains.forEach((domain) => corpusDomains.add(domain))
      corpusStats.push(...corpus.sourceStats)
      failures.push(...corpus.failures)
    }
    const domains = [...corpusDomains]
    await updateRun(runId, { fetched_domains_count: domains.length, cursor: { corpus_source_stats: corpusStats } })
    if (domains.length === 0) {
      await updateRun(runId, { status: "partial", errors: failures, completed_at: nowIso() })
      return { ok: false, domains: [], sourceByDomain: {}, evidenceByDomain, sourceStats: corpusStats, failures, configuration }
    }

    const batch = await processPassiveInventoryDomainBatch({ runId, countryCode, technology, domains, sourceLabel: "bulk_domain_corpus", limit })
    failures.push(...batch.failures)
    await updateRun(runId, { cname_checked_count: batch.checked, cursor: { corpus_source_stats: corpusStats } })
    for (const [domain, sources] of Object.entries(batch.sourceByDomain)) sourceByDomain.set(domain, new Set(sources))
    Object.assign(evidenceByDomain, batch.evidenceByDomain)
    await updateRun(runId, {
      status: batch.domains.length > 0 ? "completed" : "partial",
      stack_matched_count: batch.stackMatched,
      geo_matched_count: batch.geoMatched,
      completed_at: nowIso(),
      errors: failures,
    })
    return {
      ok: batch.domains.length > 0,
      domains: batch.domains,
      sourceByDomain: Object.fromEntries([...sourceByDomain.entries()].map(([domain, sources]) => [domain, [...sources].sort()])),
      evidenceByDomain,
      sourceStats: corpusStats,
      failures,
      configuration,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Passive inventory failed"
    console.error("[passive-inventory] failed:", error)
    failures.push({ key: "passive_inventory", reason })
    await updateRun(runId, { status: "failed", errors: failures, completed_at: nowIso() })
    return { ok: false, domains: [], sourceByDomain: {}, evidenceByDomain, sourceStats: [], failures, configuration }
  }
}

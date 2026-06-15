import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { optionalEnv } from "../japan-readiness-utils"
import { decodeZonePayload, normalizeInventoryDomain, parseZoneDomains } from "../passive-inventory-utils"

export interface PassiveDomainFeedResult {
  ok: boolean
  domains: string[]
  total: number
  sourceStats: Array<{ source: string; pattern: string; fetched: number; total: number; ok: boolean; error?: string }>
  failures: Array<{ key: string; reason: string }>
}

function domainMatchesPattern(domain: string, pattern: string): boolean {
  const suffix = pattern.replace(/^\*\./, "").replace(/^\*/, "").toLowerCase()
  return domain === suffix || domain.endsWith(`.${suffix}`)
}

function feedUrls(): string[] {
  return (optionalEnv("PASSIVE_DOMAIN_FEED_URLS") ?? "")
    .split(/[,\n]/)
    .map((url) => url.trim())
    .filter(Boolean)
}

async function readRemoteFeed(url: string, pattern: string, limit: number): Promise<string[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RevenueOS-PassiveDomainFeeds/1.0" },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`domain feed HTTP ${res.status}`)
  const text = decodeZonePayload(Buffer.from(await res.arrayBuffer()), url)
  return filterFeedText(text, pattern, limit)
}

function filterFeedText(text: string, pattern: string, limit: number): string[] {
  const out = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    if (out.size >= limit) break
    const csvToken = line.split(",").find((part) => part.includes(".")) ?? line
    const domain = normalizeInventoryDomain(csvToken)
    if (domain && domainMatchesPattern(domain, pattern)) out.add(domain)
  }
  if (out.size > 0) return [...out].sort()
  return parseZoneDomains(text, undefined, limit).filter((domain) => domainMatchesPattern(domain, pattern))
}

async function readLocalFeeds(pattern: string, limit: number): Promise<Array<{ file: string; domains: string[] }>> {
  const dir = optionalEnv("PASSIVE_DOMAIN_FEED_DIR")
  if (!dir) return []
  const entries = await readdir(dir).catch(() => [])
  const out: Array<{ file: string; domains: string[] }> = []
  for (const entry of entries) {
    if (!/\.(csv|txt|zone|gz|jsonl)$/i.test(entry)) continue
    try {
      const file = path.join(dir, entry)
      const text = decodeZonePayload(await readFile(file), entry)
      const domains = filterFeedText(text, pattern, Math.max(limit - out.reduce((sum, item) => sum + item.domains.length, 0), 0))
      if (domains.length > 0) out.push({ file: entry, domains })
    } catch (error) {
      console.error("[passive-domain-feeds] local feed skipped:", entry, error)
    }
    if (out.reduce((sum, item) => sum + item.domains.length, 0) >= limit) break
  }
  return out
}

export async function fetchPassiveDomainFeeds(pattern: string, limit: number): Promise<PassiveDomainFeedResult> {
  const domains = new Set<string>()
  const sourceStats: PassiveDomainFeedResult["sourceStats"] = []
  const failures: PassiveDomainFeedResult["failures"] = []

  for (const local of await readLocalFeeds(pattern, limit)) {
    local.domains.forEach((domain) => domains.add(domain))
    sourceStats.push({ source: "passive_domain_feed_local", pattern: `${pattern}:${local.file}`, fetched: local.domains.length, total: local.domains.length, ok: true })
    if (domains.size >= limit) break
  }

  for (const url of feedUrls()) {
    if (domains.size >= limit) break
    try {
      const remote = await readRemoteFeed(url, pattern, limit - domains.size)
      remote.forEach((domain) => domains.add(domain))
      sourceStats.push({ source: "passive_domain_feed_url", pattern: `${pattern}:${url}`, fetched: remote.length, total: remote.length, ok: remote.length > 0 })
    } catch (error) {
      const reason = error instanceof Error ? error.message : "passive domain feed failed"
      failures.push({ key: `passive_domain_feed:${url}`, reason })
      sourceStats.push({ source: "passive_domain_feed_url", pattern: `${pattern}:${url}`, fetched: 0, total: 0, ok: false, error: reason })
    }
  }

  const list = [...domains].sort().slice(0, limit)
  return { ok: list.length > 0, domains: list, total: list.length, sourceStats, failures }
}

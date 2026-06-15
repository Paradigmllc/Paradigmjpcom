import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { optionalEnv } from "../japan-readiness-utils"
import { decodeZonePayload, parseZoneDomains } from "../passive-inventory-utils"

export interface ZoneDomainResult {
  ok: boolean
  domains: string[]
  sourceStats: Array<{ source: string; pattern: string; fetched: number; total: number; ok: boolean; error?: string }>
  failures: Array<{ key: string; reason: string }>
}

function tldFromPattern(pattern: string): string {
  return pattern.replace(/^\*\./, "").replace(/^\./, "").replace(/^\*/, "").split(".").pop()?.toLowerCase() ?? pattern
}

async function czdsToken(): Promise<string | null> {
  const token = optionalEnv("CZDS_ACCESS_TOKEN")
  if (token) return token
  const username = optionalEnv("CZDS_USERNAME") ?? optionalEnv("ICANN_ACCOUNT_USERNAME")
  const password = optionalEnv("CZDS_PASSWORD") ?? optionalEnv("ICANN_ACCOUNT_PASSWORD")
  if (!username || !password) return null
  const authBase = optionalEnv("CZDS_AUTH_BASE_URL") ?? "https://account-api.icann.org"
  const res = await fetch(`${authBase.replace(/\/+$/, "")}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`CZDS authentication HTTP ${res.status}`)
  const body = await res.json() as { accessToken?: unknown }
  return typeof body.accessToken === "string" ? body.accessToken : null
}

async function czdsLinks(tlds: string[]): Promise<string[]> {
  const direct = optionalEnv("CZDS_ZONE_FILE_URLS")
  if (direct) return direct.split(/[,\n]/).map((url) => url.trim()).filter(Boolean)
  const token = await czdsToken()
  if (!token) return []
  const base = optionalEnv("CZDS_BASE_URL") ?? "https://czds-api.icann.org"
  const res = await fetch(`${base.replace(/\/+$/, "")}/czds/downloads/links`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`CZDS links HTTP ${res.status}`)
  const links = await res.json() as unknown
  return Array.isArray(links)
    ? links.filter((url): url is string => typeof url === "string" && tlds.some((tld) => url.includes(`${tld}.zone`) || url.includes(`/${tld}`)))
    : []
}

async function fetchRemoteZone(url: string, tld: string, limit: number): Promise<string[]> {
  const token = await czdsToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`zone download HTTP ${res.status}`)
  const text = decodeZonePayload(Buffer.from(await res.arrayBuffer()), url)
  return parseZoneDomains(text, tld, limit)
}

async function readLocalZones(tlds: string[], limit: number): Promise<string[]> {
  const dir = optionalEnv("CZDS_ZONE_FILE_DIR") ?? optionalEnv("PASSIVE_ZONE_FILE_DIR")
  if (!dir) return []
  const entries = await readdir(dir).catch(() => [])
  const out = new Set<string>()
  for (const tld of tlds) {
    const match = entries.find((name) => name === `${tld}.zone` || name === `${tld}.zone.gz` || name.startsWith(`${tld}.`))
    if (!match) continue
    const file = path.join(dir, match)
    const text = decodeZonePayload(await readFile(file), match)
    for (const domain of parseZoneDomains(text, tld, limit - out.size)) out.add(domain)
    if (out.size >= limit) break
  }
  return [...out]
}

export async function fetchZoneDomains(patterns: string[], limit: number): Promise<ZoneDomainResult> {
  const tlds = [...new Set(patterns.map(tldFromPattern))]
  const failures: ZoneDomainResult["failures"] = []
  const sourceStats: ZoneDomainResult["sourceStats"] = []
  const domains = new Set<string>()

  const local = await readLocalZones(tlds, limit)
  local.forEach((domain) => domains.add(domain))
  sourceStats.push({ source: "czds_local_zone", pattern: tlds.join(","), fetched: local.length, total: local.length, ok: local.length > 0 })

  if (domains.size < limit) {
    try {
      const links = await czdsLinks(tlds)
      for (const link of links) {
        if (domains.size >= limit) break
        const tld = tlds.find((item) => link.includes(`${item}.zone`) || link.includes(`/${item}`)) ?? tlds[0] ?? ""
        const remote = await fetchRemoteZone(link, tld, limit - domains.size)
        remote.forEach((domain) => domains.add(domain))
        sourceStats.push({ source: "czds_api_zone", pattern: tld, fetched: remote.length, total: remote.length, ok: remote.length > 0 })
      }
    } catch (error) {
      failures.push({ key: "czds_api_zone", reason: error instanceof Error ? error.message : "CZDS zone fetch failed" })
    }
  }

  return { ok: domains.size > 0, domains: [...domains].sort().slice(0, limit), sourceStats, failures }
}

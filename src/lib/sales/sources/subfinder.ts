/**
 * Subfinder — passive subdomain discovery via public sources.
 * Uses crt.sh, AbuseIPDB, AlienVault OTX, etc. (no active scanning).
 * Wraps existing crt.sh data + adds AlienVault OTX passive DNS.
 * Zero risk — purely passive, no packets sent to target.
 */
import { getProxyFetchOptions } from "../proxy-agent"

export interface SubfinderResult {
  ok: boolean
  subdomains: string[]
  total: number
  sources: string[]
  error?: string
}

async function queryCrtSh(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ name_value: string }>
    return [...new Set(
      data.flatMap(entry =>
        (entry.name_value ?? "").split("\n").map(s => s.trim().toLowerCase()).filter(s => s.endsWith(`.${domain}`))
      )
    )]
  } catch (e) {
    console.warn("[subfinder] exec failed:", e)
    return []
  }
}

async function queryAlienVaultOtx(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/passive_dns`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { passive_dns?: Array<{ hostname: string }> }
    return [...new Set(
      (data.passive_dns ?? [])
        .map(d => d.hostname?.toLowerCase())
        .filter((s): s is string => !!s && s.endsWith(`.${domain}`))
    )]
  } catch (e) {
    console.warn("[subfinder] exec failed:", e)
    return []
  }
}

export async function discoverSubdomains(domain: string): Promise<SubfinderResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase()
    const [crt, otx] = await Promise.all([
      queryCrtSh(cleanDomain),
      queryAlienVaultOtx(cleanDomain),
    ])

    const all = [...new Set([...crt, ...otx])].sort()
    const sources: string[] = []
    if (crt.length > 0) sources.push("crt.sh")
    if (otx.length > 0) sources.push("alienvault_otx")

    return { ok: true, subdomains: all.slice(0, 50), total: all.length, sources }
  } catch (e) {
    console.error("[subfinder] failed:", e)
    return { ok: false, subdomains: [], total: 0, sources: [], error: e instanceof Error ? e.message : "Subfinder failed" }
  }
}

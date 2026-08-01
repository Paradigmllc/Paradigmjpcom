/**
 * SpiderFoot OSINT — via self-hosted HTTP API or public APIs as fallback.
 *
 * Primary: self-hosted SpiderFoot at SPIDERFOOT_API_URL
 * Fallback: SecurityTrails + crt.sh + DNS-over-HTTPS (public APIs)
 */
import { envValue } from "../oss-service-health"

interface RdapDomainResponse {
  entities?: Array<{
    vcardArray?: [
      string,
      Array<Array<unknown>>,
    ]
  }>
  events?: Array<{
    eventAction?: string
    eventDate?: string
  }>
}

interface SfResult { source: string; ok: boolean; data?: Record<string, unknown>; error?: string }

function spiderfootUrl(): string {
  return envValue("SPIDERFOOT_API_URL") ?? "http://spiderfoot-api:5001"
}

export async function checkSpiderFootHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${spiderfootUrl()}/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    console.warn("[spiderfoot] health check failed:", e instanceof Error ? e.message : String(e))
    return { ok: false, detail: "unreachable (will use public API fallbacks)" }
  }
}

async function collectPublicFallbacks(target: string): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {}
  const tasks: Promise<void>[] = []

  tasks.push((async () => {
    try {
      const crtRes = await fetch(
        `https://crt.sh/?q=${encodeURIComponent(target)}&output=json`,
        { signal: AbortSignal.timeout(12_000) },
      )
      if (crtRes.ok) {
        const crtData = await crtRes.json() as Array<Record<string, unknown>>
        results.crtsh = { total_certs: crtData.length, latest: crtData[0] }
      }
    } catch (e) {
      console.warn("[spiderfoot] crt.sh fallback failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  tasks.push((async () => {
    try {
      const dnsRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(target)}&type=A`,
        { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(10_000) },
      )
      if (dnsRes.ok) {
        const dnsData = await dnsRes.json() as { Answer?: Array<{ name: string; data: string }> }
        if (dnsData.Answer?.length) results.dns = dnsData.Answer.map(a => a.data)
      }
    } catch (e) {
      console.warn("[spiderfoot] DNS fallback failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  tasks.push((async () => {
    try {
      const rdapRes = await fetch(
        `https://rdap.org/domain/${encodeURIComponent(target)}`,
        { signal: AbortSignal.timeout(10_000) },
      )
      if (rdapRes.ok) {
        const rdapData = await rdapRes.json() as RdapDomainResponse
        results.rdap = {
          registrar: rdapData.entities?.[0]?.vcardArray?.[1]?.[0]?.[3],
          created: rdapData.events?.find?.((e) => e.eventAction === "registration")?.eventDate,
        }
      }
    } catch (e) {
      console.warn("[spiderfoot] RDAP fallback failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  await Promise.allSettled(tasks)
  return results
}

/** Try self-hosted SpiderFoot, fall back to public APIs. All paths fit within 20s total. */
async function runSpiderFootScan(target: string, modules: string[]): Promise<SfResult> {
  if (!target?.includes(".")) return { source: "spiderfoot", ok: false, error: "invalid target" }

  const sfUrl = envValue("SPIDERFOOT_API_URL")
  if (sfUrl) {
    try {
      const res = await fetch(`${sfUrl}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, modules }),
        signal: AbortSignal.timeout(8_000),
      })
      if (res.ok) {
        const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
        if (data.ok) return { source: "spiderfoot", ok: true, data: data.data }
      }
    } catch (e) {
      console.warn("[spiderfoot] self-hosted API unreachable, using public fallbacks:", e instanceof Error ? e.message : String(e))
    }
  }

  const results = await collectPublicFallbacks(target)
  return {
    source: "spiderfoot",
    ok: Object.keys(results).length > 0,
    data: { results: [results], count: Object.keys(results).length, fallback: true },
  }
}

export async function enrichDomainWithSpiderFoot(domain: string): Promise<SfResult[]> {
  const modules = ["sfp_dns", "sfp_whois", "sfp_sslcert", "sfp_email", "sfp_webserver", "sfp_spider"]
  return [await runSpiderFootScan(domain, modules)]
}

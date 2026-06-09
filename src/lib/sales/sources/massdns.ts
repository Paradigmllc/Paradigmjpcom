/**
 * MassDNS — bulk DNS resolver (free OSS)
 * Resolves A/AAAA records for a list of subdomains.
 * Useful for discovering subdomains and infrastructure mapping.
 * No API key required.
 */

export interface MassDnsResult {
  ok: boolean
  domain: string
  subdomains: Array<{ name: string; ips: string[]; cnames: string[] }>
  totalResolved: number
  error?: string
}

// Common subdomains to check
const COMMON_SUBDOMAINS = [
  "www", "mail", "ftp", "admin", "api", "cdn", "shop", "store",
  "blog", "dev", "staging", "app", "m", "mobile", "secure",
  "portal", "login", "dashboard", "help", "support", "docs",
  "status", "assets", "static", "media", "images", "img",
  "webmail", "smtp", "imap", "pop", "ns1", "ns2",
  "autodiscover", "cpanel", "whm", "webdisk",
]

export async function discoverSubdomains(domain: string): Promise<MassDnsResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    const subdomains: MassDnsResult["subdomains"] = []
    let totalResolved = 0

    // Check common subdomains via DNS-over-HTTPS
    for (const sub of COMMON_SUBDOMAINS) {
      try {
        const name = `${sub}.${cleanDomain}`
        const [aRes, aaaaRes, cnameRes] = await Promise.all([
          fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A`, {
            headers: { Accept: "application/dns-json" },
            signal: AbortSignal.timeout(5_000),
          }).then(r => r.json()).catch(() => null),
          fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=AAAA`, {
            headers: { Accept: "application/dns-json" },
            signal: AbortSignal.timeout(5_000),
          }).then(r => r.json()).catch(() => null),
          fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=CNAME`, {
            headers: { Accept: "application/dns-json" },
            signal: AbortSignal.timeout(5_000),
          }).then(r => r.json()).catch(() => null),
        ])

        const aAnswers = (aRes?.Answer ?? []).map((r: { data: string }) => r.data)
        const aaaaAnswers = (aaaaRes?.Answer ?? []).map((r: { data: string }) => r.data)
        const cnames = (cnameRes?.Answer ?? []).map((r: { data: string }) => r.data.replace(/\.$/, ""))

        const ips = [...new Set([...aAnswers, ...aaaaAnswers])]
        if (ips.length > 0 || cnames.length > 0) {
          subdomains.push({ name, ips, cnames })
          totalResolved++
        }
      } catch (e) {
        console.warn("[massdns] subdomain DNS query failed:", e)
      }
    }

    return {
      ok: true,
      domain: cleanDomain,
      subdomains,
      totalResolved,
    }
  } catch (e) {
    console.error("[massdns] discovery failed:", e)
    return { ok: false, domain, subdomains: [], totalResolved: 0, error: e instanceof Error ? e.message : "MassDNS discovery failed" }
  }
}

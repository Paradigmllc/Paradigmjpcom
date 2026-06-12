import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

/**
 * DNS-over-HTTPS — Cloudflare DoH (free, no API key)
 * Fetches MX, TXT (SPF/DKIM/DMARC), A, AAAA, CNAME records.
 * Provides email security posture and hosting infrastructure insights.
 */

interface DnsRecord {
  name: string
  type: number
  TTL: number
  data: string
}

export interface DnsResult {
  ok: boolean
  domain: string
  mxRecords: { exchange: string; priority: number }[]
  txtRecords: string[]
  spfRecord: string | null
  dkimSelectors: string[]
  dmarcRecord: string | null
  aRecords: string[]
  cnameRecords: { name: string; target: string }[]
  hasEmailSecurity: boolean
  emailProvider: string | null
  hasDnssec: boolean
  hasCaa: boolean
  caaRecords: string[]
  error?: string
}

function detectEmailProvider(mx: string[]): string | null {
  const joined = mx.join(" ").toLowerCase()
  if (joined.includes("google") || joined.includes("aspmx") || joined.includes("googlemail")) return "Google Workspace"
  if (joined.includes("outlook") || joined.includes("protection.outlook")) return "Microsoft 365"
  if (joined.includes("zoho")) return "Zoho"
  if (joined.includes("sendgrid")) return "SendGrid"
  if (joined.includes("mailgun")) return "Mailgun"
  if (joined.includes("amazonses")) return "Amazon SES"
  if (joined.includes("larksuite")) return "Lark"
  if (joined.includes("protonmail")) return "ProtonMail"
  return null
}

export async function queryDnsRecords(domain: string): Promise<DnsResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    const types = ["A", "AAAA", "MX", "TXT", "CNAME", "CAA", "DNSKEY"]
    const records: Record<string, DnsRecord[]> = {}

    for (const type of types) {
      try {
        const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=${type}`
        const res = await fetch(url, {
          headers: { Accept: "application/dns-json" },
          signal: AbortSignal.timeout(8_000),
        })
        if (res.ok) {
          const body = (await res.json()) as { Answer?: DnsRecord[] }
          records[type] = body.Answer ?? []
        }
      } catch (e) {
        console.warn(`[dns-doh] DNS query failed for type ${type}:`, e)
        records[type] = []
      }
    }

    const mxRaw = (records.MX ?? []).map((r) => r.data)
    const mxRecords = mxRaw.map((r) => {
      const parts = r.split(/\s+/)
      const priority = parseInt(parts[0], 10) || 0
      const exchange = parts.slice(1).join(" ").replace(/\.$/, "")
      return { exchange, priority }
    }).sort((a, b) => a.priority - b.priority)

    const txtRaw = (records.TXT ?? []).map((r) => r.data.replace(/^"|"$/g, ""))
    const spfRecord = txtRaw.find((t) => t.startsWith("v=spf1")) ?? null

    const dkimSelectors = ["google", "default", "dkim", "mail", "selector1", "selector2", "s1", "s2"]
      .filter((sel) => txtRaw.some((t) => t.startsWith(`v=DKIM1`) && t.includes(sel)))

    const dmarcRecord = txtRaw.find((t) => t.startsWith("v=DMARC1")) ?? null

    const aRecords = (records.A ?? []).map((r) => r.data)
    const cnameRecords = (records.CNAME ?? []).map((r) => ({
      name: r.name.replace(/\.$/, ""),
      target: r.data.replace(/\.$/, ""),
    }))

    const hasEmailSecurity = !!(spfRecord && dmarcRecord)
    const hasDnssec = (records.DNSKEY ?? []).length > 0
    const caaRecords = (records.CAA ?? []).map((r) => r.data)
    const hasCaa = caaRecords.length > 0

    return {
      ok: true,
      domain: cleanDomain,
      mxRecords,
      txtRecords: txtRaw.slice(0, 15),
      spfRecord,
      dkimSelectors,
      dmarcRecord,
      aRecords,
      cnameRecords,
      hasEmailSecurity,
      emailProvider: detectEmailProvider(mxRaw),
      hasDnssec,
      hasCaa,
      caaRecords,
    }
  } catch (e) {
    console.error("[dns-doh] query failed:", e)
    return {
      ok: false,
      domain,
      mxRecords: [],
      txtRecords: [],
      spfRecord: null,
      dkimSelectors: [],
      dmarcRecord: null,
      aRecords: [],
      cnameRecords: [],
      hasEmailSecurity: false,
      emailProvider: null,
      hasDnssec: false,
      hasCaa: false,
      caaRecords: [],
      error: e instanceof Error ? e.message : "DNS query failed",
    }
  }
}

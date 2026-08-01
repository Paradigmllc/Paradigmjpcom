/**
 * lib/sales/sources/whois.ts — ドメイン登録情報
 *
 * Primary: WhoisXMLAPI (free 500 req/月)
 * Fallback: RDAP (free, no API key required, IANA standard)
 */

const WHOIS_API = "https://www.whoisxmlapi.com/whoisserver/WhoisService"

export interface WhoisResult {
  registrar: string | null
  createdDate: string | null
  updatedDate: string | null
  expiresDate: string | null
  yearsOld: number | null
  source: "whoisxml" | "rdap" | "none"
}

interface RdapDomainResponse {
  entities?: Array<{ vcardArray?: [string, Array<Array<unknown>>] }>
  events?: Array<{ eventAction?: string; eventDate?: string }>
}

async function rdapWhois(domain: string): Promise<WhoisResult | null> {
  try {
    const res = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return null
    const data = await res.json() as RdapDomainResponse
    const createdDate = data.events?.find(e => e.eventAction === "registration")?.eventDate ?? null
    return {
      registrar: data.entities?.[0]?.vcardArray?.[1]?.[0]?.[3] as string ?? null,
      createdDate,
      updatedDate: null,
      expiresDate: null,
      yearsOld: createdDate ? Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
      source: "rdap",
    }
  } catch (e) {
    console.warn("[whois] RDAP fallback failed:", e instanceof Error ? e.message : String(e))
    return null
  }
}

export async function getWhois(domain: string): Promise<WhoisResult> {
  const key = process.env.WHOISXML_API_KEY?.trim()
  if (key) {
    try {
      const url = `${WHOIS_API}?apiKey=${key}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) {
        const data = (await res.json()) as {
          WhoisRecord?: {
            registrarName?: string; createdDate?: string; updatedDate?: string; expiresDate?: string
            registryData?: { createdDateNormalized?: string; expiresDateNormalized?: string }
          }
        }
        const rec = data.WhoisRecord
        const createdDate = rec?.createdDate || rec?.registryData?.createdDateNormalized || null
        const expiresDate = rec?.expiresDate || rec?.registryData?.expiresDateNormalized || null
        return {
          registrar: rec?.registrarName ?? null,
          createdDate,
          updatedDate: rec?.updatedDate ?? null,
          expiresDate,
          yearsOld: createdDate ? Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
          source: "whoisxml",
        }
      }
    } catch (e) {
      console.warn("[whois] WhoisXMLAPI failed:", e instanceof Error ? e.message : String(e))
    }
  }

  const rdap = await rdapWhois(domain)
  if (rdap) return rdap

  return { registrar: null, createdDate: null, updatedDate: null, expiresDate: null, yearsOld: null, source: "none" }
}

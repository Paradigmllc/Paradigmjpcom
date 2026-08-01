/**
 * Country NIC registry direct queries — UK (.uk), AU (.au), JP (.jp).
 *
 * These are official registries with public APIs/zone access.
 * No API keys required for basic queries. Bot restrictions are typically lenient.
 *
 * UK: Nominet WHOIS / zone file access
 * AU: auDA WHOIS / registry
 * JP: JPRS WHOIS / JP domain list (JPRS公開データ)
 */

const NIC_ENDPOINTS: Record<string, { label: string; rdap: string; whois?: string }> = {
  GB: { label: "Nominet (.uk)", rdap: "https://rdap.nominet.uk/domain", whois: "https://rdap.nominet.uk/domain" },
  AU: { label: "auDA (.au)", rdap: "https://rdap.auda.org.au/domain" },
  JP: { label: "JPRS (.jp)", rdap: "https://rdap.jprs.jp/domain" },
  DE: { label: "DENIC (.de)", rdap: "https://rdap.denic.de/domain" },
  CA: { label: "CIRA (.ca)", rdap: "https://rdap.cira.ca/domain" },
  US: { label: "NIC (.us)", rdap: "https://rdap.nic.us/domain" },
}

export interface CountryNicResult {
  ok: boolean
  domain: string
  countryCode: string
  source: string
  registrar?: string | null
  createdDate?: string | null
  yearsOld?: number | null
  organizationName?: string | null
  error?: string
}

const TIMEOUT = 10_000

interface RdapEntity {
  vcardArray?: [string, Array<Array<unknown>>]
  roles?: string[]
}

interface RdapDomain {
  entities?: RdapEntity[]
  events?: Array<{ eventAction?: string; eventDate?: string }>
  nameservers?: Array<{ ldhName?: string }>
}

async function rdapLookup(domain: string, countryCode: string): Promise<CountryNicResult | null> {
  const nic = NIC_ENDPOINTS[countryCode]
  if (!nic) return null

  try {
    const res = await fetch(`${nic.rdap}/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: "application/rdap+json" },
    })
    if (!res.ok) return null
    const data = await res.json() as RdapDomain

    const registrant = data.entities?.find(e => e.roles?.includes("registrant"))
    const orgName = registrant?.vcardArray?.[1]?.find((row: unknown) =>
      Array.isArray(row) && (row as string[])[0] === "org"
    ) as string[] | undefined

    const createdEvent = data.events?.find(e => e.eventAction === "registration")
    const createdDate = createdEvent?.eventDate ?? null

    return {
      ok: true,
      domain,
      countryCode,
      source: nic.label,
      registrar: null,
      createdDate,
      yearsOld: createdDate ? Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
      organizationName: orgName?.[3] as string ?? null,
    }
  } catch (e) {
    console.warn(`[country-nic] RDAP ${countryCode} failed:`, e instanceof Error ? e.message : String(e))
    return null
  }
}

export async function queryCountryNic(domain: string, countryCode = "US"): Promise<CountryNicResult> {
  if (!domain?.includes(".")) {
    return { ok: false, domain, countryCode, source: "nic", error: "invalid domain" }
  }

  const result = await rdapLookup(domain, countryCode)
  if (result) return result

  return { ok: false, domain, countryCode, source: "nic", error: "RDAP lookup returned no data" }
}

export async function queryMultiCountryNic(domain: string): Promise<CountryNicResult[]> {
  return Promise.all(
    Object.keys(NIC_ENDPOINTS).map(cc => queryCountryNic(domain, cc).catch(() =>
      ({ ok: false, domain, countryCode: cc, source: "nic", error: "exception" } as CountryNicResult)
    ))
  )
}

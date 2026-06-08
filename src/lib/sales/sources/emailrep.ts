/**
 * EmailRep.io — free email domain reputation API
 * https://emailrep.io
 * No API key required for basic queries. Rate limit: 50 req/day for free.
 */

export interface EmailRepResult {
  ok: boolean
  domain: string
  reputation: string | null
  suspicious: boolean
  details: {
    blacklisted: boolean
    maliciousActivity: boolean
    credentialsLeaked: boolean
    spam: boolean
    phishing: boolean
  }
  error?: string
}

export async function checkEmailReputation(domain: string): Promise<EmailRepResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    const res = await fetch(`https://emailrep.io/${encodeURIComponent(cleanDomain)}`, {
      headers: { Accept: "application/json", "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      return {
        ok: false, domain: cleanDomain, reputation: null, suspicious: false,
        details: { blacklisted: false, maliciousActivity: false, credentialsLeaked: false, spam: false, phishing: false },
        error: `HTTP ${res.status}`,
      }
    }

    const body = (await res.json()) as {
      reputation?: string
      suspicious?: boolean
      details?: {
        blacklisted?: boolean
        malicious_activity?: boolean
        credentials_leaked?: boolean
        spam?: boolean
        phishing?: boolean
      }
    }

    return {
      ok: true,
      domain: cleanDomain,
      reputation: body.reputation ?? null,
      suspicious: body.suspicious ?? false,
      details: {
        blacklisted: body.details?.blacklisted ?? false,
        maliciousActivity: body.details?.malicious_activity ?? false,
        credentialsLeaked: body.details?.credentials_leaked ?? false,
        spam: body.details?.spam ?? false,
        phishing: body.details?.phishing ?? false,
      },
    }
  } catch (e) {
    console.error("[emailrep] check failed:", e)
    return {
      ok: false, domain, reputation: null, suspicious: false,
      details: { blacklisted: false, maliciousActivity: false, credentialsLeaked: false, spam: false, phishing: false },
      error: e instanceof Error ? e.message : "EmailRep check failed",
    }
  }
}

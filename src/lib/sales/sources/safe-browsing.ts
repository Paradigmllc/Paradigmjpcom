/**
 * Google Safe Browsing API — malware/phishing/social engineering check.
 * Free tier: generous quota for non-commercial/light commercial use.
 * Requires GOOGLE_SAFE_BROWSING_API_KEY env var.
 * Falls back silently if not configured.
 */
export interface SafeBrowsingResult {
  ok: boolean
  configured: boolean
  threats: Array<{ type: string; platform: string }>
  safe: boolean
  error?: string
}

const SAFE_BROWSING_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

function env(name: string): string | null {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v.trim() : null
}

export async function checkSafeBrowsing(domain: string): Promise<SafeBrowsingResult> {
  const apiKey = env("GOOGLE_SAFE_BROWSING_API_KEY")
  if (!apiKey) return { ok: true, configured: false, threats: [], safe: true }

  const url = `https://${domain}`
  try {
    const res = await fetch(`${SAFE_BROWSING_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "revenue-os", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      return { ok: false, configured: true, threats: [], safe: true, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as { matches?: Array<{ threatType: string; platformType: string }> }
    const threats = (body.matches ?? []).map(m => ({ type: m.threatType, platform: m.platformType }))

    return {
      ok: true,
      configured: true,
      threats,
      safe: threats.length === 0,
    }
  } catch (e) {
    console.error("[safe-browsing] check failed:", e)
    return { ok: false, configured: true, threats: [], safe: true, error: e instanceof Error ? e.message : "Safe Browsing check failed" }
  }
}

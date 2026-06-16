/**
 * TruffleHog-lite — scan public GitHub for exposed API keys/credentials.
 * Uses GitHub's public search API. No auth required for public repos.
 * Detects: AWS keys, Stripe keys, Google API keys, generic secrets.
 */
export interface TruffleHogResult {
  ok: boolean
  findings: Array<{ type: string; repo: string; path: string; snippet: string }>
  total: number
  error?: string
}

const SECRET_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  { type: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { type: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { type: "Stripe Publishable Key", regex: /pk_live_[0-9a-zA-Z]{24,}/ },
  { type: "Google API Key", regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { type: "GitHub Token", regex: /ghp_[0-9a-zA-Z]{36}/ },
  { type: "Generic API Key", regex: /['"]?api[_-]?key['"]?\s*[:=]\s*['"]([^'"]{16,})['"]/i },
  { type: "JWT Secret", regex: /['"]?(jwt|secret)[_-]?(key|secret)['"]?\s*[:=]\s*['"]([^'"]{16,})['"]/i },
]

export async function scanPublicRepos(domain: string): Promise<TruffleHogResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase()
    const findings: TruffleHogResult["findings"] = []

    // Search GitHub for the domain name in public repos
    const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(cleanDomain)}+in:file&per_page=30&sort=indexed`
    const searchRes = await fetch(searchUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RevenueOS-TruffleHog/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!searchRes.ok) return { ok: true, findings: [], total: 0 }

    const searchData = (await searchRes.json()) as {
      items?: Array<{
        repository: { full_name: string; html_url: string }
        path: string
        html_url: string
        name: string
      }>
    }

    if (!searchData.items?.length) return { ok: true, findings: [], total: 0 }

    // Check each file for secret patterns
    for (const item of searchData.items.slice(0, 10)) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${item.repository.full_name}/HEAD/${item.path}`
        const rawRes = await fetch(rawUrl, {
          headers: { "User-Agent": "RevenueOS-TruffleHog/1.0" },
          signal: AbortSignal.timeout(8_000),
        })
        if (!rawRes.ok) continue
        const content = await rawRes.text()

        for (const pattern of SECRET_PATTERNS) {
          const match = content.match(pattern.regex)
          if (match) {
            const idx = match.index ?? 0
            const snippet = content.slice(Math.max(0, idx - 20), idx + match[0].length + 20)
              .replace(/\n/g, " ").slice(0, 150)
            findings.push({
              type: pattern.type,
              repo: item.repository.full_name,
              path: item.path,
              snippet,
            })
          }
        }
      } catch (err) {
        console.warn("[trufflehog] scan failed:", err)
      }
    }

    return { ok: true, findings: findings.slice(0, 10), total: findings.length }
  } catch (e) {
    console.error("[trufflehog] scan failed:", e)
    return { ok: false, findings: [], total: 0, error: e instanceof Error ? e.message : "TruffleHog scan failed" }
  }
}

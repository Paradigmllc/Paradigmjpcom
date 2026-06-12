import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

/**
 * GitHub REST API — free company/tech intelligence
 * https://api.github.com
 * No API key required for basic queries (rate limit: 60/hr unauthenticated).
 * With GITHUB_TOKEN: 5000/hr.
 */

export interface GitHubResult {
  ok: boolean
  domain: string
  orgName: string | null
  publicRepos: number
  topLanguages: string[]
  recentActivity: boolean
  stars: number
  description: string | null
  error?: string
}

export async function searchGitHubOrg(domain: string): Promise<GitHubResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    const orgName = cleanDomain.split(".")[0] || cleanDomain
    const token = process.env.GITHUB_TOKEN?.trim()
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RevenueOS/1.0",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    // Search for organization
    const searchRes = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(orgName)}+type:org&per_page=1`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    })

    if (!searchRes.ok) {
      return { ok: false, domain: cleanDomain, orgName: null, publicRepos: 0, topLanguages: [], recentActivity: false, stars: 0, description: null, error: `GitHub HTTP ${searchRes.status}` }
    }

    const searchBody = (await searchRes.json()) as { items?: Array<{ login: string }> }
    const foundOrg = searchBody.items?.[0]?.login

    if (!foundOrg) {
      return { ok: true, domain: cleanDomain, orgName: null, publicRepos: 0, topLanguages: [], recentActivity: false, stars: 0, description: null }
    }

    // Get org details
    const orgRes = await fetch(`https://api.github.com/orgs/${encodeURIComponent(foundOrg)}`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    })

    if (!orgRes.ok) {
      return { ok: true, domain: cleanDomain, orgName: foundOrg, publicRepos: 0, topLanguages: [], recentActivity: false, stars: 0, description: null }
    }

    const orgBody = (await orgRes.json()) as {
      login?: string
      public_repos?: number
      description?: string | null
    }

    // Get repos for language stats
    const reposRes = await fetch(`https://api.github.com/orgs/${encodeURIComponent(foundOrg)}/repos?sort=updated&per_page=10`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    })

    let topLanguages: string[] = []
    let stars = 0
    let recentActivity = false

    if (reposRes.ok) {
      const repos = (await reposRes.json()) as Array<{ language?: string | null; stargazers_count?: number; pushed_at?: string }>
      const langCounts: Record<string, number> = {}
      for (const repo of repos) {
        if (repo.language) langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1
        stars += repo.stargazers_count ?? 0
        if (repo.pushed_at && new Date(repo.pushed_at) > new Date(Date.now() - 90 * 86400000)) {
          recentActivity = true
        }
      }
      topLanguages = Object.entries(langCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lang]) => lang)
    }

    return {
      ok: true,
      domain: cleanDomain,
      orgName: orgBody.login ?? foundOrg,
      publicRepos: orgBody.public_repos ?? 0,
      topLanguages,
      recentActivity,
      stars,
      description: orgBody.description ?? null,
    }
  } catch (e) {
    console.error("[github-api] search failed:", e)
    return { ok: false, domain, orgName: null, publicRepos: 0, topLanguages: [], recentActivity: false, stars: 0, description: null, error: e instanceof Error ? e.message : "GitHub API search failed" }
  }
}

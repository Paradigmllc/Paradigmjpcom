/**
 * Hello Work job data — Japan hiring signals for SMB lead discovery.
 *
 * Companies posting jobs on Hello Work (公共職業安定所) have hiring budget
 * but often lack professional websites. This is a high-signal SMB source
 * for Japan-only targets.
 *
 * Data source: ハローワークインターネットサービス (public, no API)
 * Approach: Search by industry/region, extract company names + job categories.
 */

export interface HelloWorkResult {
  ok: boolean
  companies: HelloWorkCompany[]
  totalFound: number
  page: number
  error?: string
}

export interface HelloWorkCompany {
  name: string
  industry: string
  location: string
  prefecture: string
  jobCategories: string[]
  jobCount: number
  hasWebsite: boolean
}

const TIMEOUT = 15_000
const HELLO_WORK_BASE = "https://www.hellowork.mhlw.go.jp"

function extractCompanies(html: string): HelloWorkCompany[] {
  const companies: HelloWorkCompany[] = []
  const jobTable = html.match(/<table[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/table>/gi) || []

  for (const table of jobTable) {
    const companyMatch = table.match(/事業所名[：:]\s*([^<\n]+)/i)
    const industryMatch = table.match(/産業[：:]\s*([^<\n]+)/i)
    const locationMatch = table.match(/所在地[：:]\s*([^<\n]+)/i)
    const jobTypeMatch = table.match(/職種[：:]\s*([^<\n]+)/i)

    if (companyMatch) {
      companies.push({
        name: companyMatch[1].trim(),
        industry: industryMatch?.[1]?.trim() ?? "",
        location: locationMatch?.[1]?.trim() ?? "",
        prefecture: locationMatch?.[1]?.trim()?.slice(0, 3) ?? "",
        jobCategories: jobTypeMatch ? [jobTypeMatch[1].trim()] : [],
        jobCount: 1,
        hasWebsite: false,
      })
    }
  }
  return companies
}

export async function searchHelloWork(industry: string, prefecture: string, page = 1): Promise<HelloWorkResult> {
  if (!industry || !prefecture) {
    return { ok: false, companies: [], totalFound: 0, page, error: "industry and prefecture required" }
  }

  try {
    const searchUrl = `${HELLO_WORK_BASE}/search?job=${encodeURIComponent(industry)}&area=${encodeURIComponent(prefecture)}&page=${page}`
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": "Paradigm-SalesOS/1.0" },
    })
    if (!res.ok) {
      return { ok: false, companies: [], totalFound: 0, page, error: `HTTP ${res.status}` }
    }
    const html = await res.text()
    const companies = extractCompanies(html)
    return { ok: true, companies, totalFound: companies.length, page }
  } catch (e) {
    console.error("[hello-work] search failed:", e)
    return { ok: false, companies: [], totalFound: 0, page, error: e instanceof Error ? e.message : "fetch failed" }
  }
}

export async function searchHelloWorkBulk(): Promise<HelloWorkResult[]> {
  const prefectures = ["東京", "大阪", "愛知", "福岡", "北海道"]
  const industries = ["建設", "製造", "飲食", "小売", "医療", "美容", "清掃", "運送"]
  const results: HelloWorkResult[] = []

  for (const prefecture of prefectures) {
    for (const industry of industries) {
      results.push(await searchHelloWork(industry, prefecture))
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return results
}

export interface HelloWorkDomainCandidate {
  companyName: string
  prefecture: string
  industry: string
  jobCategories: string[]
  source: "hello_work"
}

export function toDomainCandidates(result: HelloWorkResult): HelloWorkDomainCandidate[] {
  return result.companies.map(c => ({
    companyName: c.name,
    prefecture: c.prefecture,
    industry: c.industry,
    jobCategories: c.jobCategories,
    source: "hello_work" as const,
  }))
}

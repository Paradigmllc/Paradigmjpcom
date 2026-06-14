import { getServiceSalesSupabase } from "@/lib/supabase"
import { callDeepSeek } from "@/lib/deepseek"
import type { SalesLocaleScope } from "../locale-scope"
import { getSearxngOrigin, type SearxngResultStatus, type SearxngTimeRange } from "../searxng-normalize"
import { getProxyDispatcher } from "../proxy-agent"
import { DB_TABLES } from "../db-tables"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type JsonRecord = Record<string, unknown>

export interface FetchOptions extends RequestInit {
  dispatcher?: unknown
}

export interface SearxngRunRow {
  id: string
  query: string
  region: SalesLocaleScope["region"]
  report_locale: string
  target_country: string
  status: SearxngRunStatus
  engines: string[] | null
  categories: string[] | null
  language: string
  safesearch: number
  time_range: SearxngTimeRange | null
  pages_requested: number
  total_results: number
  unique_domains: number
  imported_count: number
  batch_id: string | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface SearxngResultRow {
  id: string
  run_id: string
  result_index: number
  url: string
  domain: string
  title: string
  snippet: string
  engine: string | null
  category: string | null
  score: number
  status: SearxngResultStatus
  rejection_reason: string | null
  raw: JsonRecord
}

export type SearxngRunStatus = "running" | "completed" | "completed_partial" | "failed" | "imported"

export interface SearxngResultSummary {
  id: string
  url: string
  domain: string
  title: string
  snippet: string
  engine: string | null
  category: string | null
  score: number
  status: SearxngResultStatus
  rejectionReason: string | null
}

export interface SearxngRunSummary {
  id: string
  query: string
  region: SalesLocaleScope["region"]
  reportLocale: string
  targetCountry: string
  status: SearxngRunStatus
  engines: string[]
  categories: string[]
  language: string
  safesearch: number
  timeRange: SearxngTimeRange | null
  pagesRequested: number
  totalResults: number
  uniqueDomains: number
  importedCount: number
  batchId: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
  readyCount: number
  duplicateCount: number
  rejectedCount: number
  results: SearxngResultSummary[]
}

export const DEFAULT_CATEGORIES = ["general"]
export const SEARCH_TIMEOUT_MS = 18_000
export const SEARCH_RETRY_DELAY_MS = 2_000
export const SEARCH_MAX_RETRIES = 2
export const PAGE_DELAY_MS = 800
export const USER_AGENT = "Paradigm Sales OS SearxNG/1.0 (+https://paradigmjp.com)"

export const SEARXNG_FALLBACK_URLS = [
  "https://search.sapti.me",
  "https://searx.be",
  "https://search.bus-hit.me",
]

export const COUNTRY_TLD_MAP: Record<string, string> = {
  IN: "site:.in OR site:.co.in OR site:.org.in OR site:.net.in",
  VN: "site:.vn OR site:.com.vn",
  JP: "site:.jp OR site:.co.jp OR site:.or.jp",
  US: "site:.us",
  GB: "site:.uk OR site:.co.uk OR site:.org.uk",
  DE: "site:.de", FR: "site:.fr",
  KR: "site:.kr OR site:.co.kr", CN: "site:.cn OR site:.com.cn",
  TW: "site:.tw OR site:.com.tw", TH: "site:.th OR site:.co.th",
  ID: "site:.id OR site:.co.id", SG: "site:.sg OR site:.com.sg",
  AU: "site:.au OR site:.com.au",
  CH: "site:.ch",
  IL: "site:.il OR site:.co.il",
  ZA: "site:.za OR site:.co.za",
}

export function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
}

export function cleanTokenList(values: string[] | null | undefined, fallback: string[] = []): string[] {
  const out = values
    ?.map((value) => value.trim().toLowerCase())
    .filter((value) => /^[a-z0-9_ -]+$/i.test(value))
    .map((value) => value.replace(/\s+/g, "_"))
  return out && out.length > 0 ? [...new Set(out)].slice(0, 8) : fallback
}

export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  console.error(`[searxng-source] ${name} is not configured`)
  throw new Error(`${name} is not configured`)
}

export async function fetchSearxngPage(url: string, baseUrlOverride?: string): Promise<JsonRecord> {
  const dispatcher = getProxyDispatcher()
  const actualUrl = baseUrlOverride ? url.replace(getSearxngOrigin(requiredEnv("SEARXNG_BASE_URL")), baseUrlOverride) : url
  const res = await fetch(actualUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    ...(dispatcher ? { dispatcher } : {}),
  } as FetchOptions)
  const textBody = await res.text()
  if (!res.ok) throw new Error(`SearxNG HTTP ${res.status}: ${textBody.slice(0, 180)}`)
  try {
    const parsed = JSON.parse(textBody) as JsonRecord
    if (!Array.isArray(parsed.results)) {
      console.error("[searxng-source] SearXNG returned no results array. Keys:", Object.keys(parsed).join(", "))
      return { results: [] }
    }
    return parsed
  } catch (error) {
    console.error("[searxng-source] JSON parse failed:", error, "First 200 chars:", textBody.slice(0, 200))
    throw new Error("SearXNG did not return valid JSON. Check settings.yml search.formats includes json.")
  }
}

export async function fetchSearxngPageWithRetry(url: string, maxRetries: number = SEARCH_MAX_RETRIES): Promise<JsonRecord> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchSearxngPage(url)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        const delay = SEARCH_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(`[searxng-source] page fetch attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms:`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError!
}

export async function callLLMWithRetry(prompt: string, maxRetries: number = 3): Promise<{ ok: boolean; text?: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await callDeepSeek([{ role: "user", content: prompt }], { responseFormat: "json_object", maxTokens: 2000 })
      if (res.ok && res.text) return res
    } catch {
      // retry
    }
    if (attempt < maxRetries - 1) {
      const delay = 500 * Math.pow(2, attempt)
      console.warn(`[searxng-import] LLM attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  return { ok: false }
}

export function mapResult(row: SearxngResultRow): SearxngResultSummary {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    snippet: row.snippet,
    engine: row.engine,
    category: row.category,
    score: row.score,
    status: row.status,
    rejectionReason: row.rejection_reason,
  }
}

export function mapRun(row: SearxngRunRow, results: SearxngResultRow[]): SearxngRunSummary {
  const own = results.filter((result) => result.run_id === row.id)
  return {
    id: row.id,
    query: row.query,
    region: row.region,
    reportLocale: row.report_locale,
    targetCountry: row.target_country,
    status: row.status,
    engines: row.engines ?? [],
    categories: row.categories ?? [],
    language: row.language,
    safesearch: row.safesearch,
    timeRange: row.time_range,
    pagesRequested: row.pages_requested,
    totalResults: row.total_results,
    uniqueDomains: row.unique_domains,
    importedCount: row.imported_count,
    batchId: row.batch_id,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readyCount: own.filter((item) => item.status === "ready").length,
    duplicateCount: own.filter((item) => item.status === "duplicate").length,
    rejectedCount: own.filter((item) => item.status === "rejected").length,
    results: own.sort((a, b) => b.score - a.score).slice(0, 8).map(mapResult),
  }
}

export async function listSearxngRuns(scope: SalesLocaleScope, limit = 8): Promise<{
  ok: boolean
  runs: SearxngRunSummary[]
  error?: string
}> {
  const sb = getSb()
  if (!sb) return { ok: false, runs: [], error: "Supabase service_role not configured" }
  const runRes = await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
    .select("*")
    .eq("region", scope.region)
    .eq("report_locale", scope.reportLocale)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (runRes.error) return { ok: false, runs: [], error: runRes.error.message }

  const runs = (runRes.data ?? []) as SearxngRunRow[]
  const ids = runs.map((run) => run.id)
  const resultRes = ids.length > 0
    ? await sb
        .from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS)
        .select("id, run_id, result_index, url, domain, title, snippet, engine, category, score, status, rejection_reason, raw")
        .in("run_id", ids)
        .order("score", { ascending: false })
        .limit(500)
    : { data: [], error: null }
  if (resultRes.error) return { ok: false, runs: [], error: resultRes.error.message }
  return { ok: true, runs: runs.map((run) => mapRun(run, (resultRes.data ?? []) as SearxngResultRow[])) }
}

export function companyNameFromResult(result: SearxngResultRow): string {
  const domain = result.domain.replace(/\.[^.]+$/, "")
  const parts = domain.split(".")
  const base = parts[parts.length - 1]
  if (base.length >= 2) return base.charAt(0).toUpperCase() + base.slice(1).replace(/[-_]/g, " ")
  return result.domain
}

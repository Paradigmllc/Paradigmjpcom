import { getServiceSalesSupabase } from "@/lib/supabase"
import { createLeadBatch, type LeadBatchCsvRow, type SalesLeadBatchSummary } from "./monthly-batch"
import { callDeepSeek } from "@/lib/deepseek"
import { salesScopeFromCountry, type SalesLocaleScope } from "./locale-scope"
import {
  buildSearxngSearchUrl,
  getSearxngOrigin,
  normalizeSearxngResults,
  type JsonRecord,
  type SearxngResultStatus,
  type SearxngTimeRange,
} from "./searxng-normalize"
import { getProxyDispatcher } from "./proxy-agent"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type SearxngRunStatus = "running" | "completed" | "failed" | "imported"
export type { SearxngResultStatus, SearxngTimeRange } from "./searxng-normalize"

export interface SearxngSearchInput {
  query: string
  reportLocale?: string | null
  targetCountry?: string | null
  engines?: string[] | null
  categories?: string[] | null
  language?: string | null
  safesearch?: number | null
  timeRange?: SearxngTimeRange | null
  pages?: number | null
}

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

interface SearxngRunRow {
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

interface SearxngResultRow {
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

const DEFAULT_CATEGORIES = ["general"]
const SEARCH_TIMEOUT_MS = 18_000
const USER_AGENT = "Paradigm Sales OS SearxNG/1.0 (+https://paradigmjp.com)"

interface FetchOptions extends RequestInit {
  dispatcher?: unknown
}

function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
}

function cleanTokenList(values: string[] | null | undefined, fallback: string[] = []): string[] {
  const out = values
    ?.map((value) => value.trim().toLowerCase())
    .filter((value) => /^[a-z0-9_ -]+$/i.test(value))
    .map((value) => value.replace(/\s+/g, "_"))
  return out && out.length > 0 ? [...new Set(out)].slice(0, 8) : fallback
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  console.error(`[searxng-source] ${name} is not configured`)
  throw new Error(`${name} is not configured`)
}

async function fetchSearxngPage(url: string): Promise<JsonRecord> {
  const dispatcher = getProxyDispatcher()
  const res = await fetch(url, {
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
    return JSON.parse(textBody) as JsonRecord
  } catch (error) {
    console.error("[searxng-source] JSON parse failed:", error)
    throw new Error("SearxNG did not return valid JSON. Check settings.yml search.formats includes json.")
  }
}

function mapResult(row: SearxngResultRow): SearxngResultSummary {
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

function mapRun(row: SearxngRunRow, results: SearxngResultRow[]): SearxngRunSummary {
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
    .from("sales_searxng_search_runs")
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
        .from("sales_searxng_search_results")
        .select("id, run_id, result_index, url, domain, title, snippet, engine, category, score, status, rejection_reason, raw")
        .in("run_id", ids)
        .order("score", { ascending: false })
        .limit(500)
    : { data: [], error: null }
  if (resultRes.error) return { ok: false, runs: [], error: resultRes.error.message }
  return { ok: true, runs: runs.map((run) => mapRun(run, (resultRes.data ?? []) as SearxngResultRow[])) }
}

export async function runSearxngSearch(input: SearxngSearchInput): Promise<{
  ok: boolean
  run?: SearxngRunSummary
  error?: string
}> {
  const sb = getSb()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const query = input.query.trim()
  if (!query) return { ok: false, error: "query is required" }
  const scope = salesScopeFromCountry({ reportLocale: input.reportLocale, targetCountry: input.targetCountry })
  const baseUrl = requiredEnv("SEARXNG_BASE_URL")
  const engines = cleanTokenList(input.engines)
  const categories = cleanTokenList(input.categories, DEFAULT_CATEGORIES)
  const language = (input.language?.trim() || scope.reportLocale || "en").slice(0, 12)
  const safesearch = Math.max(0, Math.min(2, Math.round(input.safesearch ?? 1)))
  const pages = Math.max(1, Math.min(5, Math.round(input.pages ?? 1)))

  const inserted = await sb
    .from("sales_searxng_search_runs")
    .insert({
      query,
      region: scope.region,
      report_locale: scope.reportLocale,
      target_country: scope.targetCountry,
      status: "running",
      engines,
      categories,
      language,
      safesearch,
      time_range: input.timeRange ?? null,
      pages_requested: pages,
      meta: { source: "searxng", base_url_origin: getSearxngOrigin(baseUrl) },
    })
    .select("*")
    .single()
  if (inserted.error) return { ok: false, error: inserted.error.message }
  const run = inserted.data as SearxngRunRow

  try {
    const rawRows: JsonRecord[] = []
    const pageMeta: JsonRecord[] = []
    for (let page = 1; page <= pages; page++) {
      const url = buildSearxngSearchUrl(baseUrl, {
        query,
        engines,
        categories,
        language,
        safesearch,
        page,
        timeRange: input.timeRange ?? null,
      })
      const payload = await fetchSearxngPage(url)
      const pageResults = Array.isArray(payload.results) ? (payload.results as JsonRecord[]) : []
      rawRows.push(...pageResults)
      pageMeta.push({
        page,
        result_count: pageResults.length,
        unresponsive_engines: payload.unresponsive_engines ?? [],
        suggestions: payload.suggestions ?? [],
      })
    }
    const candidates = normalizeSearxngResults(rawRows, query)
    if (candidates.length > 0) {
      const { error } = await sb.from("sales_searxng_search_results").upsert(
        candidates.map((candidate, index) => ({
          run_id: run.id,
          result_index: index,
          url: candidate.url,
          domain: candidate.domain,
          title: candidate.title,
          snippet: candidate.snippet,
          engine: candidate.engine,
          category: candidate.category,
          score: candidate.score,
          status: candidate.status,
          rejection_reason: candidate.rejectionReason,
          raw: candidate.raw,
        })),
        { onConflict: "run_id,domain" },
      )
      if (error) throw new Error(error.message)
    }
    const completedAt = new Date().toISOString()
    await sb
      .from("sales_searxng_search_runs")
      .update({
        status: "completed",
        total_results: rawRows.length,
        unique_domains: new Set(candidates.map((candidate) => candidate.domain)).size,
        completed_at: completedAt,
        meta: { source: "searxng", pages: pageMeta },
      })
      .eq("id", run.id)
  } catch (error) {
    console.error("[searxng-source] search run failed:", error)
    await sb
      .from("sales_searxng_search_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "SearxNG search failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
    return { ok: false, error: error instanceof Error ? error.message : "SearxNG search failed" }
  }

  const listed = await listSearxngRuns(scope, 1)
  return { ok: true, run: listed.runs[0] }
}

function companyNameFromResult(result: SearxngResultRow): string {
  const title = result.title.replace(/\s+[|-].*$/, "").trim()
  if (title.length >= 2) return title.slice(0, 120)
  return result.domain.replace(/\.[^.]+$/, "")
}

export async function importSearxngRunToLeadBatch(input: {
  runId: string
  limit?: number | null
  minScore?: number | null
  enrich?: boolean
  maxOutreachReady?: number | null
}): Promise<{ ok: boolean; batch?: SalesLeadBatchSummary; imported: number; error?: string }> {
  const sb = getSb()
  if (!sb) return { ok: false, imported: 0, error: "Supabase service_role not configured" }
  const runRes = await sb.from("sales_searxng_search_runs").select("*").eq("id", input.runId).single()
  if (runRes.error) return { ok: false, imported: 0, error: runRes.error.message }
  const run = runRes.data as SearxngRunRow
  const minScore = Math.max(0, Math.min(100, Math.round(input.minScore ?? 58)))
  const limit = Math.max(1, Math.min(1000, Math.round(input.limit ?? 100)))
  const resultRes = await sb
    .from("sales_searxng_search_results")
    .select("id, run_id, result_index, url, domain, title, snippet, engine, category, score, status, rejection_reason, raw")
    .eq("run_id", run.id)
    .eq("status", "ready")
    .gte("score", minScore)
    .order("score", { ascending: false })
    .limit(limit)
  if (resultRes.error) return { ok: false, imported: 0, error: resultRes.error.message }
  const results = (resultRes.data ?? []) as SearxngResultRow[]
  if (results.length === 0) return { ok: false, imported: 0, error: "No ready SearxNG results match the import gate" }

  // --- LLM Pre-filtering ---
  const validResults: SearxngResultRow[] = []
  const CHUNK_SIZE = 50
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE)
    const promptData = chunk.map(r => ({ id: r.id, domain: r.domain, title: r.title, snippet: r.snippet }))
    const prompt = `Evaluate the following list of search results. Return a JSON object with keys as 'id' and value boolean true/false. True if it appears to be a legitimate B2B/B2C business or corporate site. False if it is a directory site, blog, news, aggregator, social media, or irrelevant garbage.\n\n${JSON.stringify(promptData, null, 2)}`
    
    try {
      const llmRes = await callDeepSeek([{ role: "user", content: prompt }], { responseFormat: "json_object", maxTokens: 2000 })
      if (llmRes.ok && llmRes.text) {
        const decisionMap = JSON.parse(llmRes.text) as Record<string, boolean>
        for (const r of chunk) {
          const decision = decisionMap[r.id]
          if (decision === true || String(decision).toLowerCase() === "true") {
            validResults.push(r)
          } else {
             await sb.from("sales_searxng_search_results").update({ status: "rejected", rejection_reason: "llm_filtered" }).eq("id", r.id)
          }
        }
      } else {
        // LLM unavailable: mark as "pending_review" instead of accepting blindly
        for (const r of chunk) {
          await sb.from("sales_searxng_search_results").update({ status: "rejected", rejection_reason: "llm_unavailable_fallback" }).eq("id", r.id)
        }
      }
    } catch (e) {
      console.warn("[searxng-import] LLM pre-filter failed for chunk, rejecting as safety measure:", e)
      for (const r of chunk) {
        sb.from("sales_searxng_search_results").update({ status: "rejected", rejection_reason: "llm_error_fallback" }).eq("id", r.id).then(() => {}, () => {})
      }
    }
  }

  if (validResults.length === 0) return { ok: false, imported: 0, error: "All results filtered out by LLM" }

  const rows: LeadBatchCsvRow[] = validResults.map((result) => ({
    company_name: companyNameFromResult(result),
    domain: result.domain,
    report_locale: run.report_locale,
    target_country: run.target_country,
    source: "searxng",
    search_url: result.url,
    search_title: result.title,
    search_snippet: result.snippet,
    search_score: String(result.score),
    searxng_run_id: run.id,
    searxng_result_id: result.id,
  }))
  const created = await createLeadBatch({
    name: `SearxNG ${run.target_country} ${new Date().toISOString().slice(0, 10)}`,
    rows,
    reportLocale: run.report_locale,
    targetCountry: run.target_country,
    source: "searxng",
    enrich: input.enrich ?? true,
    minOutreachScore: minScore,
    maxOutreachReady: input.maxOutreachReady ?? 300,
    dryRunOnly: false,
  })
  if (!created.ok || !created.batch) return { ok: false, imported: 0, error: created.error ?? "batch import failed" }

  await sb
    .from("sales_searxng_search_results")
    .update({ status: "imported" })
    .in("id", validResults.map((result) => result.id))
  await sb
    .from("sales_searxng_search_runs")
    .update({
      status: "imported",
      imported_count: validResults.length,
      batch_id: created.batch.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id)

  return { ok: true, batch: created.batch, imported: validResults.length }
}

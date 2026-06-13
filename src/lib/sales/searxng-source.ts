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
import { validateSearchQuery, isRejectedDomain } from "./data-quality-guard"
import { buildFootprintSearchQuery } from "./sources/cms-footprint-search"
import { DB_TABLES } from "@/lib/sales/db-tables"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type SearxngRunStatus = "running" | "completed" | "completed_partial" | "failed" | "imported"
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
  techStacks?: string[] | null
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
const SEARCH_RETRY_DELAY_MS = 2_000 // exponential backoff base
const SEARCH_MAX_RETRIES = 2
const USER_AGENT = "Paradigm Sales OS SearxNG/1.0 (+https://paradigmjp.com)"

const COUNTRY_TLD_MAP: Record<string, string> = {
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
}

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

// ── Fix 5: Retry SearXNG page fetch with exponential backoff ──
async function fetchSearxngPageWithRetry(url: string, maxRetries: number = SEARCH_MAX_RETRIES): Promise<JsonRecord> {
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

// ── Fix 2: LLM call with retry ──
async function callLLMWithRetry(prompt: string, maxRetries: number = 3): Promise<{ ok: boolean; text?: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await callDeepSeek([{ role: "user", content: prompt }], { responseFormat: "json_object", maxTokens: 2000 })
      if (res.ok && res.text) return res
    } catch {
      // retry
    }
    if (attempt < maxRetries - 1) {
      const delay = 500 * Math.pow(2, attempt) // 500ms, 1s, 2s
      console.warn(`[searxng-import] LLM attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  return { ok: false }
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
  // Use raw target_country for TLD/footprint queries (preserve user-specified country)
  const rawCountry = (input.targetCountry?.trim().toUpperCase() || scope.targetCountry)
  const techStacks = input.techStacks?.filter(t => t.length > 0) ?? []
  const countryTld = COUNTRY_TLD_MAP[rawCountry] ?? ""
  const footprintQuery = techStacks.length > 0 ? buildFootprintSearchQuery(rawCountry, techStacks, 3) : null
  const enhancedQuery = footprintQuery 
    ? `${query} (${footprintQuery})`
    : countryTld ? `${query} ${countryTld}` : query
  const baseUrl = requiredEnv("SEARXNG_BASE_URL")
  const engines = cleanTokenList(input.engines)
  const categories = cleanTokenList(input.categories, DEFAULT_CATEGORIES)
  const language = (input.language?.trim() || scope.reportLocale || "en").slice(0, 12)
  const safesearch = Math.max(0, Math.min(2, Math.round(input.safesearch ?? 1)))
  // Max 50 pages ≁E1000 results (SearXNG defaults ~20 results/page)
  const pages = Math.max(1, Math.min(50, Math.round(input.pages ?? 5)))

  const inserted = await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
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

  // ── Fix 1 + Fix 5: Page-by-page incremental save with retry ──
  const pageMeta: JsonRecord[] = []
  const seenDomains = new Set<string>()
  let totalRawResults = 0
  let lastError: Error | null = null
  let lastSavedPage = 0

  for (let page = 1; page <= pages; page++) {
    const url = buildSearxngSearchUrl(baseUrl, {
      query: enhancedQuery,
      engines,
      categories,
      language,
      safesearch,
      page,
      timeRange: input.timeRange ?? null,
    })

    try {
      // Fix 5: retry with exponential backoff
      const payload = await fetchSearxngPageWithRetry(url, SEARCH_MAX_RETRIES)
      const pageResults = Array.isArray(payload.results) ? (payload.results as JsonRecord[]) : []
      totalRawResults += pageResults.length
      pageMeta.push({
        page,
        result_count: pageResults.length,
        unresponsive_engines: payload.unresponsive_engines ?? [],
        suggestions: payload.suggestions ?? [],
      })

      // Fix 1: Save this page's results immediately (incremental persist)
      if (pageResults.length > 0) {
        const candidates = normalizeSearxngResults(pageResults, query)
        const newDomains = candidates.filter((c) => {
          if (seenDomains.has(c.domain)) return false
          seenDomains.add(c.domain)
          return true
        })

        if (newDomains.length > 0) {
          const { error: upsertError } = await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS).upsert(
            newDomains.map((candidate, index) => ({
              run_id: run.id,
              result_index: (page - 1) * 100 + index, // page-relative index
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
          if (upsertError) {
            console.error(`[searxng-source] page ${page} upsert failed:`, upsertError.message)
          }
        }
      }

      // Update run progress after each completed page
      lastSavedPage = page
      await sb
        .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
        .update({
          total_results: totalRawResults,
          unique_domains: seenDomains.size,
          meta: { source: "searxng", pages: pageMeta, last_page_saved: page },
        })
        .eq("id", run.id)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[searxng-source] page ${page}/${pages} failed:`, lastError.message)
      // Save partial progress before breaking
      await sb
        .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
        .update({
          status: seenDomains.size > 0 ? "completed_partial" : "failed",
          total_results: totalRawResults,
          unique_domains: seenDomains.size,
          completed_at: new Date().toISOString(),
          error_message: `Search stopped at page ${page}/${pages}: ${lastError.message.slice(0, 200)}`,
          meta: { source: "searxng", pages: pageMeta, partial: true, failed_at_page: page },
        })
        .eq("id", run.id)
      break
    }
  }

  // Final completion update (if no errors broke the loop)
  if (!lastError) {
    const completedAt = new Date().toISOString()
    await sb
      .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
      .update({
        status: "completed",
        total_results: totalRawResults,
        unique_domains: seenDomains.size,
        completed_at: completedAt,
        meta: { source: "searxng", pages: pageMeta },
      })
      .eq("id", run.id)
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
  const runRes = await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS).select("*").eq("id", input.runId).single()
  if (runRes.error) return { ok: false, imported: 0, error: runRes.error.message }
  const run = runRes.data as SearxngRunRow

  // ── Fix 6: Idempotency check  Edon't re-import already imported runs ──
  if (run.status === "imported" && run.batch_id) {
    const scope = salesScopeFromCountry({ reportLocale: run.report_locale, targetCountry: run.target_country })
    const { listLeadBatches } = await import("./monthly-batch")
    const existing = await listLeadBatches(scope, 1)
    if (existing.ok && existing.batches.length > 0) {
      return { ok: true, batch: existing.batches[0], imported: run.imported_count }
    }
  }

  const minScore = Math.max(0, Math.min(100, Math.round(input.minScore ?? 58)))
  const limit = Math.max(1, Math.min(1000, Math.round(input.limit ?? 100)))
  const resultRes = await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS)
    .select("id, run_id, result_index, url, domain, title, snippet, engine, category, score, status, rejection_reason, raw")
    .eq("run_id", run.id)
    .eq("status", "ready")
    .gte("score", minScore)
    .order("score", { ascending: false })
    .limit(limit)
  if (resultRes.error) return { ok: false, imported: 0, error: resultRes.error.message }
  const results = (resultRes.data ?? []) as SearxngResultRow[]
  if (results.length === 0) return { ok: false, imported: 0, error: "No ready SearxNG results match the import gate" }

  // ── LLM Pre-filtering with Fix 2 (retry + pending_review fallback) + Fix 4 (no fire-and-forget) ──
  const validResults: SearxngResultRow[] = []
  const CHUNK_SIZE = 50
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE)
    const promptData = chunk.map(r => ({ id: r.id, domain: r.domain, title: r.title, snippet: r.snippet }))
    const prompt = `Evaluate each search result below. Return a JSON object with keys as 'id' and value true/false.

Mark TRUE only if it is a genuine SMB (small/medium business) company site that an agency could sell services to. Criteria:
- Independent business, local store, e-commerce brand, service provider
- NOT a Fortune 500, multinational, or enterprise (EY, Uniqlo, Amazon, Shopify itself)
- NOT a directory, blog, news, aggregator, social media, app store, job board
- NOT government, education, or non-profit
- Has a real product/service and an actual website (not just a listing)

Mark FALSE for anything that fails these criteria, especially large corporations, platforms, and aggregators.

${JSON.stringify(promptData, null, 2)}`

    try {
      // Fix 2: Retry LLM call up to 3 times
      const llmRes = await callLLMWithRetry(prompt, 3)
      if (llmRes.ok && llmRes.text) {
        const decisionMap = JSON.parse(llmRes.text) as Record<string, boolean>
        for (const r of chunk) {
          const decision = decisionMap[r.id]
          if (decision === true || String(decision).toLowerCase() === "true") {
            validResults.push(r)
          } else {
            await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS).update({ status: "rejected", rejection_reason: "llm_filtered" }).eq("id", r.id)
          }
        }
      } else {
        // Fix 2: LLM unavailable ↁEmark as pending_review (NOT rejected)
        console.warn(`[searxng-import] LLM unavailable for chunk after ${3} retries, marking as pending_review`)
        for (const r of chunk) {
          await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS).update({ status: "pending_review", rejection_reason: "llm_unavailable" }).eq("id", r.id)
        }
      }
    } catch (e) {
      // Fix 4: Proper error handling  Eno fire-and-forget
      console.error("[searxng-import] LLM pre-filter error for chunk:", e)
      for (const r of chunk) {
        try {
          await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS).update({ status: "pending_review", rejection_reason: "llm_error_fallback" }).eq("id", r.id)
        } catch (updateErr) {
          console.error(`[searxng-import] failed to update status for result ${r.id}:`, updateErr)
        }
      }
    }
  }

  if (validResults.length === 0) return { ok: false, imported: 0, error: "All results filtered out by LLM (check pending_review items in DB)" }

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
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS)
    .update({ status: "imported" })
    .in("id", validResults.map((result) => result.id))
  await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
    .update({
      status: "imported",
      imported_count: validResults.length,
      batch_id: created.batch.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id)

  return { ok: true, batch: created.batch, imported: validResults.length }
}

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { SalesLocaleScope } from "../locale-scope"
import { normalizeSearxngResults, type JsonRecord, type SearxngTimeRange } from "../searxng-normalize"
import { buildFootprintQueries } from "./cms-footprint-search"
import { batchSearchWithBrowser, getBrowserSearchBackendStatus } from "./browser-search"
import { listSearxngRuns, type SearxngRunRow, type SearxngRunSummary } from "./searxng-source-helpers"

type SalesSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export async function runBrowserSearchRun(input: {
  sb: SalesSupabase
  query: string
  enhancedQuery: string
  scope: SalesLocaleScope
  rawCountry: string
  pages: number
  techStacks: string[]
  language: string
  safesearch: number
  timeRange: SearxngTimeRange | null
}): Promise<{ ok: boolean; run?: SearxngRunSummary; error?: string }> {
  const { sb, query, enhancedQuery, scope, rawCountry, pages, techStacks, language, safesearch, timeRange } = input
  const backend = getBrowserSearchBackendStatus()
  const queryLimit = Math.max(1, Math.min(80, pages * 8))
  const footprintQueries = techStacks.length > 0
    ? buildFootprintQueries(rawCountry, techStacks, Math.max(1, Math.min(6, pages))).map((item) => item.query)
    : []
  const browserQueries = [...new Set([enhancedQuery, ...footprintQueries].filter((item) => item.trim().length > 0))].slice(0, queryLimit)
  const runMeta: JsonRecord = {
    source: "browser_search",
    providers: backend.providers,
    enhanced_query: enhancedQuery,
    tech_stacks: techStacks,
    browser_queries: browserQueries,
    searxng_policy: "disabled_by_default",
  }

  const inserted = await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
    .insert({
      query,
      region: scope.region,
      report_locale: scope.reportLocale,
      target_country: scope.targetCountry,
      status: "running",
      engines: backend.providers,
      categories: ["browser_search"],
      language,
      safesearch,
      time_range: timeRange,
      pages_requested: pages,
      meta: runMeta,
    })
    .select("*")
    .single()
  if (inserted.error) return { ok: false, error: inserted.error.message }
  const run = inserted.data as SearxngRunRow

  if (!backend.configured) {
    const error = backend.error ?? "Browser search backend is not configured"
    console.error("[browser-search-run] backend missing:", error)
    await sb
      .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error,
        meta: { ...runMeta, error },
      })
      .eq("id", run.id)
    return { ok: false, error }
  }

  const batch = await batchSearchWithBrowser(browserQueries)
  const candidates = normalizeSearxngResults(
    batch.domains.map((domain) => ({
      url: `https://${domain}`,
      title: domain,
      content: `Official business website candidate discovered via ${backend.providers.join(" + ")} browser search for ${query}.`,
      engine: backend.providers.join("+") || "browser_search",
      category: "browser_search",
    })),
    query,
  )
  const readyCount = candidates.filter((candidate) => candidate.status === "ready").length
  const errors = batch.errors.slice(0, 25)

  if (candidates.length > 0) {
    const { error: upsertError } = await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS).upsert(
      candidates.map((candidate, index) => ({
        run_id: run.id,
        result_index: index,
        url: candidate.url,
        domain: candidate.domain,
        title: candidate.title,
        snippet: candidate.snippet,
        engine: candidate.engine,
        category: candidate.category,
        score: Math.max(candidate.score, candidate.status === "ready" ? 64 : candidate.score),
        status: candidate.status,
        rejection_reason: candidate.rejectionReason,
        raw: { ...candidate.raw, source: "browser_search", providers: backend.providers },
      })),
      { onConflict: "run_id,domain" },
    )
    if (upsertError) {
      console.error("[browser-search-run] result upsert failed:", upsertError.message)
      errors.push(`result upsert failed: ${upsertError.message}`)
    }
  }

  const errorMessage = errors.length > 0 && readyCount === 0
    ? errors[0] ?? "Browser search returned no import-ready domains"
    : readyCount > 0 ? null : "Browser search returned no import-ready domains"
  await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
    .update({
      status: readyCount > 0 ? "completed" : "failed",
      total_results: batch.total,
      unique_domains: candidates.length,
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
      meta: {
        ...runMeta,
        domains_found: batch.total,
        normalized_count: candidates.length,
        ready_count: readyCount,
        errors,
      },
    })
    .eq("id", run.id)

  const listed = await listSearxngRuns(scope, 1)
  return {
    ok: readyCount > 0,
    run: listed.runs[0],
    error: readyCount > 0 ? undefined : errorMessage ?? "Browser search returned no import-ready domains",
  }
}

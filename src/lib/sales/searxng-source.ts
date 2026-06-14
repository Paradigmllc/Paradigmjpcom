import { createLeadBatch, type LeadBatchCsvRow, type SalesLeadBatchSummary } from "./monthly-batch"
import { salesScopeFromCountry } from "./locale-scope"
import {
  buildSearxngSearchUrl,
  getSearxngOrigin,
  normalizeSearxngResults,
  type JsonRecord,
  type SearxngResultStatus,
  type SearxngTimeRange,
} from "./searxng-normalize"
import { buildFootprintSearchQuery } from "./sources/cms-footprint-search"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  callLLMWithRetry,
  cleanTokenList,
  companyNameFromResult,
  COUNTRY_TLD_MAP,
  DEFAULT_CATEGORIES,
  fetchSearxngPageWithRetry,
  getSb,
  listSearxngRuns,
  requiredEnv,
  type SearxngResultRow,
  type SearxngRunRow,
  type SearxngRunSummary,
} from "./sources/searxng-source-helpers"

export type { SearxngResultStatus, SearxngTimeRange } from "./searxng-normalize"
export type {
  SearxngRunStatus,
  SearxngResultSummary,
  SearxngRunSummary,
} from "./sources/searxng-source-helpers"
export { listSearxngRuns } from "./sources/searxng-source-helpers"

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
  const pages = Math.max(1, Math.min(10, Math.round(input.pages ?? 3)))

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
      const payload = await fetchSearxngPageWithRetry(url)
      const pageResults = Array.isArray(payload.results) ? (payload.results as JsonRecord[]) : []
      totalRawResults += pageResults.length
      pageMeta.push({
        page,
        result_count: pageResults.length,
        unresponsive_engines: payload.unresponsive_engines ?? [],
        suggestions: payload.suggestions ?? [],
      })

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
              result_index: (page - 1) * 100 + index,
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
        console.warn(`[searxng-import] LLM unavailable for chunk after ${3} retries, marking as pending_review`)
        for (const r of chunk) {
          await sb.from(DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS).update({ status: "pending_review", rejection_reason: "llm_unavailable" }).eq("id", r.id)
        }
      }
    } catch (e) {
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

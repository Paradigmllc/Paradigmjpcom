/**
 * search-orchestrator.ts — Bulk SMB domain acquisition via browser search.
 * Generates queries from CMS footprints + JS signatures + cities,
 * runs them through FlareSolverr/Steel browser search,
 * and stores results directly in Supabase.
 */
import { buildFootprintQueries } from "./cms-footprint-search"
import { searchWithBrowser, batchSearchWithBrowser } from "./browser-search"
import { normalizeDomain } from "../dedup"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { isEnterpriseTechStack } from "./enterprise-filter"
import type { JsonRecord } from "../searxng-normalize"

export interface BulkSearchInput {
  countryCode: string
  techStacks: string[]
  targetCount?: number
  citiesPerTech?: number
}

function getSb() { return getServiceSalesSupabase() }

/**
 * Generate search queries, run batch browser search, and store results.
 * Runs 1 query per city-tech combo, rotating through Google/Brave/DuckDuckGo.
 */
export async function runBrowserBulkSearch(input: BulkSearchInput): Promise<{
  ok: boolean
  domainsFound: number
  companiesCreated: number
  queries: number
  errors: string[]
}> {
  const sb = getSb()
  if (!sb) return { ok: false, domainsFound: 0, companiesCreated: 0, queries: 0, errors: ["Supabase not configured"] }

  const citiesPerTech = input.citiesPerTech ?? 3
  const targetCount = input.targetCount ?? 500

  // Generate CMS footprint queries
  const footprintQueries = buildFootprintQueries(input.countryCode, input.techStacks, citiesPerTech)
  
  // Add generic business queries for broader coverage
  const genericQueries = [
    `${input.countryCode} small business company contact`,
    `${input.countryCode} online store ecommerce shop`,
    `${input.countryCode} services company contact us`,
  ]

  const allQueries = [...footprintQueries.map(q => q.query), ...genericQueries]
  const uniqueQueries = [...new Set(allQueries)].slice(0, 200) // cap at 200 queries

  console.log(`[search-orchestrator] Starting bulk search: ${uniqueQueries.length} queries, target ${targetCount} domains`)

  // Run batch search
  const result = await batchSearchWithBrowser(
    uniqueQueries,
    (done, total, domains) => {
      if (done % 10 === 0) console.log(`[search-orchestrator] ${done}/${total} queries, ${domains} domains found`)
    },
  )

  if (!result.ok || result.domains.length === 0) {
    return { ok: false, domainsFound: 0, companiesCreated: 0, queries: uniqueQueries.length, errors: result.errors }
  }

  // Store domains as companies in Supabase
  let created = 0
  const now = new Date().toISOString()

  for (const domain of result.domains.slice(0, targetCount)) {
    const normalized = normalizeDomain(domain)
    if (!normalized) continue

    try {
      const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).upsert({
        domain: normalized,
        company_name: normalized.replace(/\.[^.]+$/, ""),
        region: "global",
        report_locale: "en",
        target_country: input.countryCode,
        pipeline_status: "scanning",
        source: "browser_search",
        meta: { source: "browser_search", discovered_at: now },
      }, { onConflict: "domain", ignoreDuplicates: true })

      if (!error) created++
    } catch (e) {
      // Skip failures
    }
  }

  console.log(`[search-orchestrator] Done: ${created} companies created from ${result.domains.length} domains`)

  return {
    ok: true,
    domainsFound: result.domains.length,
    companiesCreated: created,
    queries: uniqueQueries.length,
    errors: result.errors,
  }
}

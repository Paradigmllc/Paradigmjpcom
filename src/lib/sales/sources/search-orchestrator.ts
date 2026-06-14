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
  const companyIds: string[] = []

  for (const domain of result.domains.slice(0, targetCount)) {
    const normalized = normalizeDomain(domain)
    if (!normalized) continue

    try {
      const { data: inserted, error } = await sb.from(DB_TABLES.SALES_COMPANIES).upsert({
        domain: normalized,
        company_name: normalized.split(".")[0].charAt(0).toUpperCase() + normalized.split(".")[0].slice(1).replace(/[-_]/g, " "),
        region: "global",
        report_locale: "en",
        target_country: input.countryCode,
        pipeline_status: "scanning",
        source: "browser_search",
        meta: { source: "browser_search", discovered_at: now },
      }, { onConflict: "domain", ignoreDuplicates: true }).select("id").single()

      if (!error && inserted) {
        created++
        companyIds.push(inserted.id)
      }
    } catch (e) { /* skip */ }
  }

  console.log(`[search-orchestrator] Created ${created} companies`)

  // Auto-enrich in background: Wappalyzer + report_ready + Twenty sync
  if (companyIds.length > 0) {
    import("./wappalyzer").then(async ({ detectTechStack }) => {
      const { isEnterpriseTechStack } = await import("./enterprise-filter")
      let enriched = 0
      for (const companyId of companyIds.slice(0, 20)) {
        try {
          const { data: co } = await sb.from(DB_TABLES.SALES_COMPANIES).select("domain").eq("id", companyId).single()
          if (!co) continue
          const url = co.domain.startsWith("http") ? co.domain : `https://${co.domain}`
          const techResult = await detectTechStack(url).catch(() => ({ tech: [], server: null }))
          const enterpriseCheck = isEnterpriseTechStack(techResult.tech.map((t: { name: string }) => t.name))
          await sb.from(DB_TABLES.SALES_COMPANIES).update({
            pipeline_status: enterpriseCheck.isEnterprise ? "pending" : "report_ready",
            meta: {
              tech: { stack: techResult.tech, server: techResult.server, count: techResult.tech.length },
              sales_os: { last_enriched_at: new Date().toISOString(), enriched_via: "browser_search_auto" },
              enterprise_filter: enterpriseCheck.isEnterprise ? { excluded: true, matched_tech: enterpriseCheck.matched } : null,
            },
          }).eq("id", companyId)
          enriched++
          // Auto-sync to Twenty
          try {
            const { syncCompanyKarteToTwenty } = await import("../twenty-sync-companies")
            await syncCompanyKarteToTwenty(companyId)
          } catch { /* Twenty sync is best-effort */ }
        } catch (e) { /* skip enrichment failures */ }
      }
      console.log(`[search-orchestrator] Auto-enriched ${enriched}/${companyIds.slice(0, 20).length} companies`)
    }).catch(e => console.error("[search-orchestrator] auto-enrich failed:", e))
  }

  return {
    ok: true,
    domainsFound: result.domains.length,
    companiesCreated: created,
    queries: uniqueQueries.length,
    errors: result.errors,
  }
}

/**
 * search-orchestrator.ts — Bulk SMB domain acquisition via browser search.
 * Generates queries from CMS footprints + JS signatures + cities,
 * runs them through FlareSolverr/Steel browser search,
 * and stores results directly in Supabase.
 * Auto-enqueues all discovered companies to enrichment pipeline.
 */
import { buildFootprintQueries } from "./cms-footprint-search"
import { searchWithBrowser, batchSearchWithBrowser } from "./browser-search"
import { normalizeDomain } from "../dedup"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { logError } from "@/lib/sales/error-monitor"
import { validateCompanyName } from "@/lib/sales/data-quality-guard"
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
  const errors = [...result.errors]

  for (const domain of result.domains.slice(0, targetCount)) {
    const normalized = normalizeDomain(domain)
    if (!normalized) continue

    const derivedName = normalized.split(".")[0].charAt(0).toUpperCase() + normalized.split(".")[0].slice(1).replace(/[-_]/g, " ")
    const nameCheck = validateCompanyName(derivedName)
    if (!nameCheck.ok) {
      console.log(`[search-orchestrator] Skipping company: ${derivedName} — ${nameCheck.reason}`)
      continue
    }

    try {
      const { data: inserted, error } = await sb.from(DB_TABLES.SALES_COMPANIES).upsert({
        domain: normalized,
        company_name: derivedName,
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
      } else if (error) {
        console.error("[search-orchestrator] company upsert failed:", error.message)
        errors.push(`${normalized}: ${error.message}`)
      }
    } catch (error) {
      console.error("[search-orchestrator] company upsert crashed:", error)
      errors.push(`${normalized}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`[search-orchestrator] Created ${created} companies`)

  // Auto-enqueue ALL discovered companies to enrichment pipeline (not just first 20)
  if (companyIds.length > 0) {
    await autoEnqueueCompanies(sb, companyIds)
  }

  return {
    ok: true,
    domainsFound: result.domains.length,
    companiesCreated: created,
    queries: uniqueQueries.length,
    errors,
  }
}

/**
 * Enqueue all companies to the enrichment pipeline via Trigger.dev.
 * Each company gets a "company_karte" job queued, and the enrichment runner is triggered.
 * Failures are logged to sales_error_log for dashboard visibility.
 */
async function autoEnqueueCompanies(sb: NonNullable<ReturnType<typeof getServiceSalesSupabase>>, companyIds: string[]): Promise<void> {
  const { enqueueCompanyEnrichment } = await import("../enrichment-jobs")
  const { triggerEnrichmentRunner } = await import("../enrichment-jobs")

  let enqueued = 0
  let skipped = 0
  let failed = 0

  for (const companyId of companyIds) {
    try {
      const enqueue = await enqueueCompanyEnrichment({
        companyId,
        source: "browser_search",
        triggeredBy: "search_orchestrator",
        priority: 50,
      })
      if (enqueue.ok) {
        enqueued++
      } else if (enqueue.error) {
        failed++
        logError("search-orchestrator", new Error(enqueue.error), { companyId, phase: "enqueue" })
      } else {
        skipped++
      }
    } catch (e) {
      failed++
      logError("search-orchestrator", e, { companyId, phase: "enqueue" })
    }
  }

  console.log(`[search-orchestrator] Enrichment enqueue: ${enqueued} enqueued, ${skipped} skipped, ${failed} failed`)

  // Trigger the enrichment runner to process the queue
  if (enqueued > 0) {
    try {
      const trigger = await triggerEnrichmentRunner(enqueued > 5 ? 10 : enqueued)
      if (!trigger.ok) {
        console.warn("[search-orchestrator] Enrichment runner trigger failed:", trigger.error)
        logError("search-orchestrator", new Error(trigger.error ?? "runner trigger failed"), {
          enqueued,
          phase: "trigger_runner",
        })
      }
    } catch (e) {
      console.error("[search-orchestrator] Enrichment runner trigger crashed:", e)
      logError("search-orchestrator", e, { enqueued, phase: "trigger_runner" })
    }
  }
}

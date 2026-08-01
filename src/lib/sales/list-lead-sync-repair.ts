import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import {
  listLeadSyncDriftReasons,
  syncListLeadToTwenty,
  type ListLeadCompany,
} from "./twenty-sync-list-lead"

export interface ListLeadRepairAnomaly {
  companyId: string
  domain: string
  reasons: string[]
  repaired: boolean
  error: string | null
}

export interface ListLeadRepairResult {
  scanned: number
  drifted: number
  repaired: number
  failed: number
  anomalies: ListLeadRepairAnomaly[]
}

async function mapLimit<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await task(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

export async function inspectAndRepairListLeadSync(input: {
  dryRun: boolean
  limit: number
}): Promise<ListLeadRepairResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  const query = await sb.from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, target_country, source, tech_stack, meta, report_url, pipeline_status")
    .contains("meta", { list_only: true })
    .order("updated_at", { ascending: true })
    .limit(input.limit)
  if (query.error) throw new Error(query.error.message)
  const companies = (query.data ?? []) as ListLeadCompany[]
  const drifted = companies.map((company) => ({ company, reasons: listLeadSyncDriftReasons(company) }))
    .filter((item) => item.reasons.length > 0)
  if (input.dryRun) {
    return {
      scanned: companies.length,
      drifted: drifted.length,
      repaired: 0,
      failed: 0,
      anomalies: drifted.map(({ company, reasons }) => ({ companyId: company.id, domain: company.domain, reasons, repaired: false, error: null })),
    }
  }
  const anomalies = await mapLimit(drifted, 3, async ({ company, reasons }): Promise<ListLeadRepairAnomaly> => {
    const result = await syncListLeadToTwenty(company.id)
    return {
      companyId: company.id,
      domain: company.domain,
      reasons,
      repaired: result.ok,
      error: result.ok ? null : result.error ?? "Twenty list-only repair failed",
    }
  })
  return {
    scanned: companies.length,
    drifted: drifted.length,
    repaired: anomalies.filter((item) => item.repaired).length,
    failed: anomalies.filter((item) => !item.repaired).length,
    anomalies,
  }
}

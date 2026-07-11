import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { Region, SalesCompany } from "../types"

export interface CandidateSelection {
  companies: SalesCompany[]
  missingCompanyIds: string[]
  notReadyCompanyIds: string[]
}

/**
 * Select report-ready companies for outreach. Explicit Twenty selections are
 * returned in request order and never broadened to a region-wide query.
 */
export async function fetchCandidates(
  region: Region,
  limit: number,
  companyId?: string,
  companyIds: string[] = [],
): Promise<CandidateSelection> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { companies: [], missingCompanyIds: companyIds, notReadyCompanyIds: [] }
  const selectedIds = [...new Set(companyIds.filter((id) => id.trim().length > 0))].slice(0, 50)
  if (selectedIds.length > 0) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*")
      .in("id", selectedIds)
    if (error) {
      console.error("[sales-outreach] fetch selected companies failed:", error.message)
      return { companies: [], missingCompanyIds: selectedIds, notReadyCompanyIds: [] }
    }
    const rows = (data as SalesCompany[]) ?? []
    const byId = new Map(rows.map((row) => [row.id, row]))
    const missingCompanyIds = selectedIds.filter((id) => !byId.has(id))
    const notReadyCompanyIds = rows
      .filter((row) => row.pipeline_status !== "report_ready")
      .map((row) => row.id)
    return {
      companies: selectedIds
        .map((id) => byId.get(id))
        .filter((row): row is SalesCompany => Boolean(row && row.pipeline_status === "report_ready")),
      missingCompanyIds,
      notReadyCompanyIds,
    }
  }
  if (companyId) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*")
      .eq("id", companyId)
      .maybeSingle()
    if (error) {
      console.error("[sales-outreach] fetch pipeline company failed:", error.message)
      return { companies: [], missingCompanyIds: [companyId], notReadyCompanyIds: [] }
    }
    return {
      companies: data ? [data as SalesCompany] : [],
      missingCompanyIds: data ? [] : [companyId],
      notReadyCompanyIds: [],
    }
  }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("region", region)
    .eq("pipeline_status", "report_ready")
    .order("updated_at", { ascending: true })
    .limit(limit)
  if (error) {
    console.error("[sales-outreach] fetch candidates failed:", error.message)
    return { companies: [], missingCompanyIds: [], notReadyCompanyIds: [] }
  }
  return { companies: (data as SalesCompany[]) ?? [], missingCompanyIds: [], notReadyCompanyIds: [] }
}

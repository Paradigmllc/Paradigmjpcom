import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { findCompanyById } from "./companies"
import {
  buildInitialJapanEntryMessage,
  buildJapanEntryProjection,
  type BusinessModel,
  type JapanEntryProjection,
} from "./japan-entry-projection"
import type { MarketVisibilityIndex } from "./market-visibility"

type JsonRecord = Record<string, unknown>

export interface GenerateProjectionOptions {
  businessModel?: BusinessModel
  averageOrderValueUsd?: number
  conversionRate?: number
  grossMargin?: number
  currentJapanShare?: number
  targetJapanShareMonth24?: number
}

export interface StoredJapanEntryProjection {
  id: string
  company_id: string
  status: "needs_review" | "approved" | "superseded"
  projection: JapanEntryProjection
  initial_message: string
  created_at: string
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}

function visibilityFromMeta(meta: JsonRecord): MarketVisibilityIndex | null {
  const smbSignals = asRecord(meta.smb_signals)
  const candidate = asRecord(smbSignals?.marketVisibility) ?? asRecord(meta.market_visibility)
  if (!candidate || candidate.version !== "public-signals-v1") return null
  if (typeof candidate.band !== "string" || !Array.isArray(candidate.evidence)) return null
  return candidate as unknown as MarketVisibilityIndex
}

export async function getLatestJapanEntryProjection(companyId: string): Promise<{
  ok: boolean
  projection: StoredJapanEntryProjection | null
  error?: string
}> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, projection: null, error: "Supabase service_role not configured" }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS)
    .select("id, company_id, status, projection, initial_message, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error("[japan-entry-projection] latest fetch failed:", error.message)
    return { ok: false, projection: null, error: error.message }
  }
  return { ok: true, projection: data as StoredJapanEntryProjection | null }
}

export async function generateJapanEntryProjection(companyId: string, options: GenerateProjectionOptions = {}): Promise<{
  ok: boolean
  projection?: StoredJapanEntryProjection
  error?: string
}> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, error: "company not found" }
  const visibility = visibilityFromMeta(company.meta ?? {})
  if (!visibility) {
    return { ok: false, error: "public-signals-v1 market visibility evidence is required" }
  }

  let projection: JapanEntryProjection
  let initialMessage: string
  try {
    projection = buildJapanEntryProjection({
      companyName: company.company_name,
      domain: company.domain,
      targetCountry: company.target_country,
      visibility,
      ...options,
    })
    initialMessage = buildInitialJapanEntryMessage(company.company_name, projection)
  } catch (error) {
    const message = error instanceof Error ? error.message : "projection calculation failed"
    console.error("[japan-entry-projection] calculation failed:", error)
    return { ok: false, error: message }
  }

  const input = {
    domain: company.domain,
    target_country: company.target_country,
    business_model: projection.assumptions.businessModel,
    assumptions: projection.assumptions,
    visibility_version: visibility.version,
    visibility_band: visibility.band,
  }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS)
    .insert({
      company_id: company.id,
      model_version: projection.modelVersion,
      status: "needs_review",
      input,
      evidence: projection.evidence,
      projection,
      initial_message: initialMessage,
      created_by: "revenue_os",
    })
    .select("id, company_id, status, projection, initial_message, created_at")
    .single()
  if (error) {
    console.error("[japan-entry-projection] insert failed:", error.message)
    return { ok: false, error: error.message }
  }

  const meta = {
    ...(company.meta ?? {}),
    japan_entry_projection: projection,
    japan_entry_initial_message: initialMessage,
    japan_entry_outreach_state: "needs_review",
  }
  const update = await sb.from(DB_TABLES.SALES_COMPANIES).update({ meta }).eq("id", company.id)
  if (update.error) {
    console.error("[japan-entry-projection] company meta update failed:", update.error.message)
    await sb.from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS).delete().eq("id", data.id)
    return { ok: false, error: update.error.message }
  }

  const stored = data as StoredJapanEntryProjection
  return { ok: true, projection: stored }
}

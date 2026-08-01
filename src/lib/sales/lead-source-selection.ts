import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import {
  listLeadSourceConfigs,
  type LeadSourceConfig,
  type LeadSourceRecord,
} from "./lead-source-records"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function preflightCount(config: LeadSourceConfig, key: "pending" | "checking"): number {
  const summary = config.last_preflight && typeof config.last_preflight === "object" && !Array.isArray(config.last_preflight)
    ? config.last_preflight as JsonRecord
    : {}
  const value = summary[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function getLeadSourceReadiness(countryCodes: string[]): Promise<Record<string, {
  sourceIds: string[]
  scaleReadySourceIds: string[]
  recordCount: number
  scaleReadyRecordCount: number
}>> {
  const configs = await listLeadSourceConfigs()
  return Object.fromEntries(countryCodes.map((countryCode) => {
    const pilotReady = configs.filter((config) => {
      const lastPreflightAt = config.last_preflighted_at ? Date.parse(config.last_preflighted_at) : Number.NaN
      const preflightFresh = Number.isFinite(lastPreflightAt) && Date.now() - lastPreflightAt <= 7 * 24 * 60 * 60_000
      return config.active
        && config.terms_checked
        && config.approval_status === "approved"
        && config.last_status === "ready"
        && config.country_code === countryCode
        && config.eligible_record_count > 0
        && preflightFresh
    })
    const scaleReady = pilotReady.filter((config) => config.pilot_approved_at !== null
      && preflightCount(config, "pending") === 0
      && preflightCount(config, "checking") === 0)
    return [countryCode, {
      sourceIds: pilotReady.map((config) => config.id),
      scaleReadySourceIds: scaleReady.map((config) => config.id),
      recordCount: pilotReady.reduce((sum, config) => sum + config.eligible_record_count, 0),
      scaleReadyRecordCount: scaleReady.reduce((sum, config) => sum + config.eligible_record_count, 0),
    }]
  }))
}

export async function fetchLeadSourceCandidateRecords(input: {
  countryCode: string
  sourceConfigIds: string[]
  limit: number
  allowPartialSource?: boolean
}): Promise<Array<LeadSourceRecord & { source: LeadSourceConfig }>> {
  if (input.sourceConfigIds.length === 0) return []
  const sb = getSb()
  const configsResult = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS)
    .select("*")
    .in("id", input.sourceConfigIds)
    .eq("country_code", input.countryCode)
    .eq("active", true)
    .eq("terms_checked", true)
    .eq("approval_status", "approved")
    .eq("last_status", "ready")
  if (configsResult.error) throw new Error(configsResult.error.message)
  const configs = (configsResult.data ?? []) as LeadSourceConfig[]
  const configById = new Map(configs.map((config) => [config.id, config]))
  if (configById.size === 0) return []
  const records: LeadSourceRecord[] = []
  const seenDomains = new Set<string>()
  for (let attempt = 0; attempt < 3 && records.length < input.limit; attempt += 1) {
    const remaining = input.limit - records.length
    const claimed = await sb.rpc(input.allowPartialSource ? "sales_claim_lead_source_pilot_records" : "sales_claim_lead_source_records", {
      p_country_code: input.countryCode,
      p_source_config_ids: [...configById.keys()],
      // Every claimed row advances last_selected_at. Claim only what this run
      // can persist so unpersisted records are not stranded for the lease window.
      p_limit: Math.min(Math.max(remaining, 100), 10_000),
    })
    if (claimed.error) throw new Error(claimed.error.message)
    const page = (claimed.data ?? []) as LeadSourceRecord[]
    for (const record of page) {
      if (!seenDomains.has(record.domain)) {
        records.push(record)
        seenDomains.add(record.domain)
      }
    }
    if (page.length === 0) break
  }
  const ranked = records.sort((a, b) => (configById.get(b.source_config_id)?.trust_tier ?? 0) - (configById.get(a.source_config_id)?.trust_tier ?? 0))
  const unique = new Map<string, LeadSourceRecord & { source: LeadSourceConfig }>()
  for (const record of ranked) {
    const source = configById.get(record.source_config_id)
    if (source && !unique.has(record.domain)) unique.set(record.domain, { ...record, source })
    if (unique.size >= input.limit) break
  }
  return [...unique.values()]
}

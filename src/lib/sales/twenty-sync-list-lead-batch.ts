import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { insertWithOptionalColumns } from "./safe-supabase-insert"
import {
  listLeadTwentyPayload,
  listLeadTwentyReadbackIssues,
  type ListLeadCompany,
} from "./twenty-sync-list-lead"
import { requireTwentyAuth } from "./twenty-health"
import {
  domainMatches,
  twentyFetch,
  type TwentyListResponse,
  type TwentyRecord,
} from "./twenty-sync-utils"

type JsonRecord = Record<string, unknown>

interface BatchMutationResponse {
  data?: { createCompanies?: TwentyRecord[] }
}

export interface BatchListLeadSyncResult {
  companyId: string
  ok: boolean
  twentyCompanyId?: string
  error?: string
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function filterString(parts: string[]): string {
  return parts.length === 1 ? parts[0] as string : `or(${parts.join(",")})`
}

async function findExistingCompanies(companies: ListLeadCompany[]): Promise<Map<string, TwentyRecord>> {
  if (companies.length === 0) return new Map()
  const filter = filterString(companies.map((company) => `domainName.primaryLinkUrl[ilike]:"%${company.domain}%"`))
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(
    `/rest/companies?limit=60&depth=0&filter=${encodeURIComponent(filter)}`,
  )
  if (!result.ok) throw new Error(result.error)
  const found = result.data.data?.companies ?? []
  return new Map(companies.flatMap((company) => {
    const match = found.find((candidate) => domainMatches(candidate, company.domain))
    return match ? [[company.id, match] as const] : []
  }))
}

async function readCompaniesById(ids: string[]): Promise<Map<string, TwentyRecord>> {
  const filter = filterString(ids.map((id) => `id[eq]:"${id}"`))
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(
    `/rest/companies?limit=60&depth=0&filter=${encodeURIComponent(filter)}`,
  )
  if (!result.ok) throw new Error(result.error)
  return new Map((result.data.data?.companies ?? []).flatMap((company) => company.id ? [[company.id, company] as const] : []))
}

export async function syncListLeadsToTwentyBatch(companyIds: string[]): Promise<BatchListLeadSyncResult[]> {
  const ids = [...new Set(companyIds)].slice(0, 60)
  if (ids.length === 0) return []
  if (ids.length !== companyIds.length) throw new Error("Twenty batch sync requires 1-60 unique company IDs")
  requireTwentyAuth()
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")

  const companyResult = await sb.from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, target_country, source, tech_stack, meta")
    .in("id", ids)
  if (companyResult.error) throw new Error(companyResult.error.message)
  const companies = (companyResult.data ?? []) as ListLeadCompany[]
  const byId = new Map(companies.map((company) => [company.id, company]))
  const invalid = ids.filter((id) => {
    const company = byId.get(id)
    const meta = record(company?.meta)
    return !company || meta.list_only !== true || meta.skip_enrichment !== true
  })
  if (invalid.length > 0) throw new Error(`Only reviewed list-only companies can use batch sync: ${invalid.join(",")}`)

  const known = new Map<string, TwentyRecord>()
  for (const company of companies) {
    const twentyId = record(record(company.meta).twenty).id
    if (typeof twentyId === "string" && twentyId.length > 0) known.set(company.id, { id: twentyId })
  }
  const unknown = companies.filter((company) => !known.has(company.id))
  const discovered = await findExistingCompanies(unknown)
  const payloadByCompany = new Map<string, JsonRecord>()
  const twentyIdByCompany = new Map<string, string>()
  const mutations = companies.map((company) => {
    const payload = listLeadTwentyPayload(company)
    const twentyId = known.get(company.id)?.id ?? discovered.get(company.id)?.id ?? company.id
    if (!twentyId) throw new Error(`Twenty ID could not be assigned: ${company.domain}`)
    payloadByCompany.set(company.id, payload)
    twentyIdByCompany.set(company.id, twentyId)
    return {
      id: twentyId,
      name: company.company_name,
      domainName: { primaryLinkLabel: company.domain, primaryLinkUrl: `https://${company.domain}` },
      ...payload,
    }
  })

  const written = await twentyFetch<BatchMutationResponse>("/rest/batch/companies?upsert=true&depth=0", {
    method: "POST",
    body: JSON.stringify(mutations),
  })
  if (!written.ok) return ids.map((companyId) => ({ companyId, ok: false, error: written.error }))
  const returnedIds = new Set((written.data.data?.createCompanies ?? []).flatMap((company) => company.id ? [company.id] : []))
  const readback = await readCompaniesById([...twentyIdByCompany.values()])
  const results = companies.map((company): BatchListLeadSyncResult => {
    const twentyCompanyId = twentyIdByCompany.get(company.id)
    const payload = payloadByCompany.get(company.id)
    if (!twentyCompanyId || !payload) return { companyId: company.id, ok: false, error: "Twenty batch mapping missing" }
    if (!returnedIds.has(twentyCompanyId)) return { companyId: company.id, ok: false, error: "Twenty batch response omitted company" }
    const issues = listLeadTwentyReadbackIssues(readback.get(twentyCompanyId) ?? null, twentyCompanyId, payload)
    return issues.length > 0
      ? { companyId: company.id, ok: false, twentyCompanyId, error: `Twenty list lead read-back verification failed: ${issues.join(", ")}` }
      : { companyId: company.id, ok: true, twentyCompanyId }
  })
  const successful = results.filter((result): result is BatchListLeadSyncResult & { twentyCompanyId: string } => result.ok && Boolean(result.twentyCompanyId))
  if (successful.length > 0) {
    const reconciled = await sb.rpc("sales_reconcile_list_lead_twenty_batch", {
      p_rows: successful.map((result) => {
        const payload = payloadByCompany.get(result.companyId) ?? {}
        return {
          company_id: result.companyId,
          twenty_company_id: result.twentyCompanyId,
          summary: record(payload.paradigmKarteSummary).markdown ?? "",
          source_name: "codex_verification",
          next_action: payload.paradigmNextAction ?? "候補レビュー待ち（未送信）",
          updated_at: new Date().toISOString(),
        }
      }),
    })
    if (reconciled.error) throw new Error(`Local Twenty batch reconciliation failed: ${reconciled.error.message}`)
    const reconciledIds = new Set((reconciled.data ?? []).map((row: { company_id?: unknown }) => String(row.company_id ?? "")))
    for (const result of successful) {
      if (!reconciledIds.has(result.companyId)) {
        result.ok = false
        result.error = "Local Twenty batch reconciliation omitted company"
      }
    }
    const logs = successful.filter((result) => result.ok).map((result) => ({
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: result.companyId,
      action: "list_lead_sync",
      status: "success",
      payload: { twenty_company_id: result.twentyCompanyId, list_only: true },
    }))
    if (logs.length > 0) {
      const { error } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, logs, [])
      if (error) console.error("[twenty-list-lead-batch] sync log insert failed:", error.message)
    }
  }
  return results
}

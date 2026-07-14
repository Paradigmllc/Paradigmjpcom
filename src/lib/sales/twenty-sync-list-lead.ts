import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { insertWithOptionalColumns } from "./safe-supabase-insert"
import { countrySelectValue } from "./twenty-sync-summaries"
import {
  createTwentyCompanyBase,
  findTwentyCompanyByDomain,
  patchTwentyCompanyHome,
} from "./twenty-sync-company-home"
import { requireTwentyAuth } from "./twenty-health"
import {
  twentyFetch,
  type TwentyMutationResponse,
  type TwentySyncResult,
} from "./twenty-sync-utils"

interface ListLeadCompany {
  id: string
  company_name: string
  domain: string
  target_country: string | null
  source: string | null
  tech_stack: unknown
  meta: unknown
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function finiteScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : null
}

function technologyNames(techStack: unknown): string[] {
  const detections = record(techStack).detections
  if (!Array.isArray(detections)) return []
  return [...new Set(detections
    .map((item) => record(item).name)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => name.trim()))]
}

export function listLeadTwentyPayload(company: ListLeadCompany): Record<string, unknown> {
  const meta = record(company.meta)
  const formUrl = typeof meta.contact_form_url === "string" ? meta.contact_form_url : null
  const candidate = record(meta.lead_candidate)
  const score = record(candidate.score)
  const technologies = technologyNames(company.tech_stack)
  const opportunityScore = finiteScore(score.opportunityScore)
  const smbScore = finiteScore(score.smbScore)
  const evidence = [
    "Japan Entry候補（OSSフォーム適格収集 / 未送信）",
    `対象国: ${company.target_country ?? "未判定"}`,
    `技術: ${technologies.join(", ") || "未判定"}`,
    `機会スコア: ${opportunityScore ?? "未判定"}`,
    `SMBスコア: ${smbScore ?? "未判定"}`,
    `実フォーム: ${formUrl ?? "未確認"}`,
    "レポート・文面・Opportunity・送信は未生成",
  ].join("\n")

  return {
    name: company.company_name,
    paradigmFormUrl: {
      primaryLinkLabel: formUrl ? "確認済みフォーム" : "",
      primaryLinkUrl: formUrl ?? "",
    },
    paradigmCountryName: countrySelectValue(company.target_country),
    // Twenty 2.14 restores SELECT options from its application manifest at boot.
    // Use an existing stable value and describe the OSS lane in the lead evidence.
    paradigmSourceName: "codex_verification",
    paradigmLeadStatus: "フォーム確認済み / Twenty登録済み / 未送信",
    paradigmTechnology: technologies.join(", ") || null,
    paradigmOpportunityScore: opportunityScore,
    paradigmSmbScore: smbScore,
    paradigmNextAction: "候補レビュー待ち（未送信）",
    paradigmKarteSummary: { markdown: evidence },
    // Clear legacy pipeline values. They are populated only after an interested reply.
    paradigmReportUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    paradigmSalesMaterialUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    paradigmDemoUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    paradigmSalesStatus: null,
    paradigmDataStatus: null,
    paradigmDataSources: null,
    paradigmSourceCoverage: null,
    paradigmLastError: null,
  }
}

export async function syncListLeadToTwenty(companyId: string): Promise<TwentySyncResult> {
  try {
    requireTwentyAuth()
  } catch (error) {
    return {
      ok: false,
      configured: false,
      error: error instanceof Error ? error.message : "Twenty auth required for list lead sync",
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, configured: true, error: "Supabase service_role not configured" }

  const { data, error: companyError } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, target_country, source, tech_stack, meta")
    .eq("id", companyId)
    .single()
  if (companyError || !data) {
    return { ok: false, configured: true, error: companyError?.message ?? "List lead company not found" }
  }
  const company = data as ListLeadCompany
  let createdTwentyCompanyId: string | null = null

  try {
    let twentyCompany = await findTwentyCompanyByDomain(company.domain)
    if (!twentyCompany?.id) {
      twentyCompany = await createTwentyCompanyBase({ companyName: company.company_name, domain: company.domain })
      createdTwentyCompanyId = twentyCompany.id ?? null
    }
    if (!twentyCompany.id) throw new Error("Twenty company id missing")

    const patched = await patchTwentyCompanyHome(twentyCompany.id, listLeadTwentyPayload(company))
    if (!patched.ok) throw new Error(patched.error)

    const { error: logError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: company.id,
      action: "list_lead_sync",
      status: "success",
      payload: {
        twenty_company_id: twentyCompany.id,
        list_only: true,
        form_url: record(company.meta).contact_form_url ?? null,
      },
    }, [])
    if (logError) console.error("[twenty-list-lead] sync log insert failed:", logError.message)

    return {
      ok: true,
      configured: true,
      companyId: twentyCompany.id,
      homeSynced: true,
      opportunityIds: [],
      recommendationCount: 0,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twenty list lead sync failed"
    console.error("[twenty-list-lead] sync failed:", error)
    if (createdTwentyCompanyId) {
      const rollback = await twentyFetch<TwentyMutationResponse>(`/rest/companies/${createdTwentyCompanyId}`, { method: "DELETE" })
      if (!rollback.ok) console.error("[twenty-list-lead] partial company rollback failed:", rollback.error)
    }
    return { ok: false, configured: true, error: message }
  }
}

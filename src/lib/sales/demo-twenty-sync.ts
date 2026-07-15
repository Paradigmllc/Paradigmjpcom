import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { insertWithOptionalColumns } from "./safe-supabase-insert"
import {
  createTwentyCompanyBase,
  findTwentyCompanyByDomain,
  patchTwentyCompanyHome,
} from "./twenty-sync-company-home"
import { requireTwentyAuth } from "./twenty-health"
import {
  twentyFetch,
  type TwentyMutationResponse,
  type TwentyRecord,
  type TwentySyncResult,
} from "./twenty-sync-utils"

interface DemoCompanyRow {
  id: string
  company_name: string
  domain: string
  prefecture: string | null
  industry: string | null
  source: string | null
  meta: unknown
}

export interface DemoTwentySyncInput {
  companyId: string
  jobId: string
  previewUrl: string
  expiresAt: string
  slug: string
  qualityScore: number | null
  sourcePolicy?: string | null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function actualLink(value: unknown): string {
  const url = record(value).primaryLinkUrl
  return typeof url === "string" ? url : ""
}

function demoTwentyPayload(company: DemoCompanyRow, input: DemoTwentySyncInput): Record<string, unknown> {
  const meta = record(company.meta)
  const manifest = record(meta.demo_source_manifest)
  const sources = Array.isArray(manifest.sources) ? manifest.sources.length : 0
  const assets = Array.isArray(manifest.assets) ? manifest.assets.length : 0
  const facts = Array.isArray(manifest.facts) ? manifest.facts.length : 0
  const summary = [
    `SMB DEMO候補（未送信）: ${company.company_name}`,
    `DEMO URL: ${input.previewUrl}`,
    `失効: ${input.expiresAt}`,
    `品質スコア: ${input.qualityScore ?? "未判定"}/100`,
    `業種: ${company.industry ?? "未設定"}`,
    `地域: ${company.prefecture ?? "未設定"}`,
    `取得元: ${company.source ?? "reviewed_demo_manifest"}`,
    `根拠: sources ${sources} / facts ${facts} / assets ${assets}`,
    `slug: ${input.slug}`,
    "状態: Twenty確認用に同期済み。外部送信・Opportunity・レポート生成は未実行。",
  ].join("\n")

  return {
    name: company.company_name,
    paradigmDemoUrl: {
      primaryLinkLabel: "7日限定DEMO URL",
      primaryLinkUrl: input.previewUrl,
    },
    paradigmLeadStatus: "DEMO生成済み / 要確認 / 未送信",
    paradigmNextAction: "DEMOを目視確認（未送信）",
    paradigmSourceName: "codex_verification",
    paradigmKarteScore: input.qualityScore,
    paradigmKarteSummary: { markdown: summary },
    paradigmLastError: null,
    paradigmReportUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    paradigmSalesMaterialUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    paradigmSalesStatus: null,
  }
}

function demoTwentyReadbackIssues(
  company: TwentyRecord | null,
  expectedCompanyId: string,
  payload: Record<string, unknown>,
): string[] {
  if (!company) return ["company_not_found"]
  const issues: string[] = []
  if (company.id !== expectedCompanyId) issues.push("company_id_mismatch")
  if (actualLink(company.paradigmDemoUrl) !== actualLink(payload.paradigmDemoUrl)) issues.push("demo_url_mismatch")
  if (company.paradigmLeadStatus !== payload.paradigmLeadStatus) issues.push("lead_status_mismatch")
  if (company.paradigmNextAction !== payload.paradigmNextAction) issues.push("next_action_mismatch")
  if (company.paradigmKarteSummary?.markdown !== record(payload.paradigmKarteSummary).markdown) issues.push("summary_mismatch")
  return issues
}

export async function syncDemoCandidateToTwenty(input: DemoTwentySyncInput): Promise<TwentySyncResult> {
  try {
    requireTwentyAuth()
  } catch (error) {
    return {
      ok: false,
      configured: false,
      error: error instanceof Error ? error.message : "Twenty auth required for demo candidate sync",
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, configured: true, error: "Supabase service_role not configured" }

  const { data, error: companyError } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, prefecture, industry, source, meta")
    .eq("id", input.companyId)
    .single()
  if (companyError || !data) {
    return { ok: false, configured: true, error: companyError?.message ?? "Demo company not found" }
  }

  const company = data as DemoCompanyRow
  let createdTwentyCompanyId: string | null = null
  try {
    let twentyCompany = await findTwentyCompanyByDomain(company.domain)
    if (!twentyCompany?.id) {
      twentyCompany = await createTwentyCompanyBase({ companyName: company.company_name, domain: company.domain })
      createdTwentyCompanyId = twentyCompany.id ?? null
    }
    if (!twentyCompany.id) throw new Error("Twenty company id missing")

    const payload = demoTwentyPayload(company, input)
    const patched = await patchTwentyCompanyHome(twentyCompany.id, payload)
    if (!patched.ok) throw new Error(patched.error)

    const readback = await findTwentyCompanyByDomain(company.domain)
    const readbackIssues = demoTwentyReadbackIssues(readback, twentyCompany.id, payload)
    if (readbackIssues.length > 0) {
      throw new Error(`Twenty demo read-back verification failed: ${readbackIssues.join(", ")}`)
    }

    const meta = record(company.meta)
    const twentyMeta = record(meta.twenty)
    const { error: localError } = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      pipeline_status: "pending",
      meta: {
        ...meta,
        demo_site: {
          ...record(meta.demo_site),
          url: input.previewUrl,
          expiresAt: input.expiresAt,
          slug: input.slug,
          jobId: input.jobId,
          sourcePolicy: input.sourcePolicy ?? null,
          status: "private_review",
          sendingEnabled: false,
        },
        twenty: {
          ...twentyMeta,
          id: twentyCompany.id,
          demoUrl: input.previewUrl,
          leadStatus: payload.paradigmLeadStatus,
          nextAction: payload.paradigmNextAction,
          updatedAt: new Date().toISOString(),
        },
      },
    }).eq("id", company.id)
    if (localError) throw new Error(`Local demo Twenty state could not be reconciled: ${localError.message}`)

    const { error: logError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: company.id,
      action: "demo_candidate_sync",
      status: "success",
      payload: {
        twenty_company_id: twentyCompany.id,
        job_id: input.jobId,
        demo_url: input.previewUrl,
        expires_at: input.expiresAt,
        sending_enabled: false,
      },
    }, [])
    if (logError) console.error("[twenty-demo-sync] sync log insert failed:", logError.message)

    return {
      ok: true,
      configured: true,
      companyId: twentyCompany.id,
      homeSynced: true,
      opportunityIds: [],
      recommendationCount: 0,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twenty demo sync failed"
    console.error("[twenty-demo-sync] sync failed:", error)
    if (createdTwentyCompanyId) {
      const rollback = await twentyFetch<TwentyMutationResponse>(`/rest/companies/${createdTwentyCompanyId}`, { method: "DELETE" })
      if (!rollback.ok) console.error("[twenty-demo-sync] partial company rollback failed:", rollback.error)
    }
    return { ok: false, configured: true, error: message }
  }
}

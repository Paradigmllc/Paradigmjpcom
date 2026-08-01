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
  linkField,
  type TwentyMutationResponse,
  type TwentyRecord,
  type TwentySyncResult,
} from "./twenty-sync-utils"

export interface ListLeadCompany {
  id: string
  company_name: string
  domain: string
  target_country: string | null
  source: string | null
  tech_stack: unknown
  meta: unknown
  report_url?: string | null
  pipeline_status?: string | null
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

const TECHNOLOGY_LABELS: Record<string, string> = {
  "apple-pay": "Apple Pay",
  "aws-cloudfront": "AWS CloudFront",
  cloudflare: "Cloudflare",
  contentful: "Contentful",
  express: "Express",
  "google-analytics": "Google Analytics",
  hcaptcha: "hCaptcha",
  java: "Java",
  recaptcha: "reCAPTCHA",
  shopify: "Shopify",
  "shopify-jp-detection": "Shopify (JP detection)",
  "shopify-payments": "Shopify Payments",
  zendesk: "Zendesk",
}

function labelTechnology(value: string): string {
  const slug = value.trim().toLowerCase()
  return TECHNOLOGY_LABELS[slug] ?? slug.split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function technologyNames(techStack: unknown, meta: Record<string, unknown>): string[] {
  const detections = record(techStack).detections
  const detectedNames = Array.isArray(detections) ? detections.map((item) => record(item).name) : []
  const candidateSlugs = record(record(record(meta.lead_candidate).score).details).detectedTechnologies
  const fallbackNames = Array.isArray(candidateSlugs) ? candidateSlugs : []
  return [...new Set((detectedNames.length > 0 ? detectedNames : fallbackNames)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => detectedNames.length > 0 ? name.trim() : labelTechnology(name)))]
}

function hasCurrentListLeadSummary(value: unknown): boolean {
  if (typeof value !== "string") return false
  const hasCurrentEmptyState = value.includes("レポート・文面・Opportunity・送信は未生成")
  const hasCurrentDraftState = value.includes("初回文面: DeepSeek V4 Pro生成済み / 人間レビュー待ち / 未送信")
    && value.includes("--- ここまで / 外部送信 0件 ---")
  return value.startsWith("Japan Entry候補（OSSフォーム適格収集 / 未送信）\n")
    && (hasCurrentEmptyState || hasCurrentDraftState)
    && !/(?:Report URL:|無料API\/OSS取得データ|全ソース詳細)/u.test(value)
}

export function listLeadTwentyPayload(company: ListLeadCompany): Record<string, unknown> {
  const meta = record(company.meta)
  const formUrl = typeof meta.contact_form_url === "string" ? meta.contact_form_url : null
  const candidate = record(meta.lead_candidate)
  const score = record(candidate.score)
  const technologies = technologyNames(company.tech_stack, meta)
  const opportunityScore = finiteScore(score.opportunityScore)
  const smbScore = finiteScore(score.smbScore)
  const draft = record(meta.initial_form_draft)
  const draftMessage = typeof draft.message === "string" ? draft.message.trim() : ""
  const draftReview = record(draft.review)
  const draftQuality = finiteScore(draftReview.score)
  const draftSafety = finiteScore(draftReview.safetyScore)
  const hasReviewableDraft = draft.state === "needs_review" && draftMessage.length > 0 && draft.sent === false
  const evidence = [
    "Japan Entry候補（OSSフォーム適格収集 / 未送信）",
    `対象国: ${company.target_country ?? "未判定"}`,
    `技術: ${technologies.join(", ") || "未判定"}`,
    `機会スコア: ${opportunityScore ?? "未判定"}`,
    `SMBスコア: ${smbScore ?? "未判定"}`,
    `実フォーム: ${formUrl ?? "未確認"}`,
    hasReviewableDraft
      ? "初回文面: DeepSeek V4 Pro生成済み / 人間レビュー待ち / 未送信"
      : "レポート・文面・Opportunity・送信は未生成",
    hasReviewableDraft ? `文面品質: ${draftQuality ?? "未判定"}/100 / safety ${draftSafety ?? "未判定"}/100` : null,
    hasReviewableDraft ? "--- 初回フォーム文面（URL・資料・価格なし） ---" : null,
    hasReviewableDraft ? draftMessage : null,
    hasReviewableDraft ? "--- ここまで / 外部送信 0件 ---" : null,
  ].filter((line): line is string => Boolean(line)).join("\n")

  return {
    name: company.company_name,
    paradigmFormUrl: linkField(formUrl ? "確認済みフォーム" : "", formUrl),
    paradigmOutreachTargetUrl: linkField(formUrl ? "営業先（確認済みフォーム）" : "", formUrl),
    paradigmCountryName: countrySelectValue(company.target_country),
    // Twenty 2.14 restores SELECT options from its application manifest at boot.
    // Use an existing stable value and describe the OSS lane in the lead evidence.
    paradigmSourceName: "codex_verification",
    paradigmLeadStatus: hasReviewableDraft
      ? "初回文面生成済み / 要レビュー / 未送信"
      : "フォーム確認済み / Twenty登録済み / 未送信",
    paradigmTechnology: technologies.join(", ") || null,
    paradigmOpportunityScore: opportunityScore,
    paradigmSmbScore: smbScore,
    paradigmNextAction: hasReviewableDraft
      ? "初回フォーム文面を人間確認（未送信）"
      : "候補レビュー待ち（未送信）",
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

export function listLeadSyncDriftReasons(company: ListLeadCompany): string[] {
  const meta = record(company.meta)
  const twenty = record(meta.twenty)
  const reasons: string[] = []
  if (meta.list_only !== true || meta.skip_enrichment !== true) reasons.push("list_only_guard_missing")
  if (typeof twenty.id !== "string" || twenty.id.trim().length === 0) reasons.push("twenty_id_missing")
  if (!hasCurrentListLeadSummary(twenty.summary)) reasons.push("twenty_summary_drift")
  if (twenty.salesStatus !== null && twenty.salesStatus !== undefined && twenty.salesStatus !== "") reasons.push("legacy_sales_status")
  if (company.report_url !== undefined && company.report_url !== null) reasons.push("legacy_report_url")
  if (company.pipeline_status !== undefined && company.pipeline_status !== "pending") reasons.push("pipeline_status_drift")
  return reasons
}

function expectedText(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key]
  return typeof value === "string" ? value : null
}

function expectedLink(payload: Record<string, unknown>, key: string): string {
  const value = record(payload[key]).primaryLinkUrl
  return typeof value === "string" ? value : ""
}

function actualLink(value: unknown): string {
  const url = record(value).primaryLinkUrl
  return typeof url === "string" ? url : ""
}

function canonicalLink(value: string): string {
  if (!value) return ""
  try {
    const url = new URL(value)
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = ""
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "")
    return url.toString()
  } catch (error) {
    console.error("[twenty-list-lead] invalid link during read-back comparison:", error)
    return value.trim()
  }
}

export function listLeadTwentyReadbackIssues(
  company: TwentyRecord | null,
  expectedCompanyId: string,
  payload: Record<string, unknown>,
): string[] {
  if (!company) return ["company_not_found"]
  const issues: string[] = []
  if (company.id !== expectedCompanyId) issues.push("company_id_mismatch")
  if (company.paradigmCountryName !== expectedText(payload, "paradigmCountryName")) issues.push("country_mismatch")
  if (canonicalLink(actualLink(company.paradigmFormUrl)) !== canonicalLink(expectedLink(payload, "paradigmFormUrl"))) issues.push("form_url_mismatch")
  if (canonicalLink(actualLink(company.paradigmOutreachTargetUrl)) !== canonicalLink(expectedLink(payload, "paradigmOutreachTargetUrl"))) issues.push("outreach_target_url_mismatch")
  if (company.paradigmLeadStatus !== expectedText(payload, "paradigmLeadStatus")) issues.push("lead_status_mismatch")
  if (company.paradigmNextAction !== expectedText(payload, "paradigmNextAction")) issues.push("next_action_mismatch")
  const expectedSummary = record(payload.paradigmKarteSummary).markdown
  if (company.paradigmKarteSummary?.markdown !== expectedSummary) issues.push("summary_mismatch")
  if (actualLink(company.paradigmReportUrl) !== "") issues.push("legacy_report_url")
  if (actualLink(company.paradigmSalesMaterialUrl) !== "") issues.push("legacy_sales_material_url")
  if (actualLink(company.paradigmDemoUrl) !== "") issues.push("legacy_demo_url")
  return issues
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
  const companyMeta = record(company.meta)
  if (companyMeta.list_only !== true || companyMeta.skip_enrichment !== true) {
    return { ok: false, configured: true, error: "Only reviewed list-only companies can use the list lead sync" }
  }
  let createdTwentyCompanyId: string | null = null

  try {
    let twentyCompany = await findTwentyCompanyByDomain(company.domain)
    if (!twentyCompany?.id) {
      twentyCompany = await createTwentyCompanyBase({ companyName: company.company_name, domain: company.domain })
      createdTwentyCompanyId = twentyCompany.id ?? null
    }
    if (!twentyCompany.id) throw new Error("Twenty company id missing")

    const payload = listLeadTwentyPayload(company)
    const patched = await patchTwentyCompanyHome(twentyCompany.id, payload)
    if (!patched.ok) throw new Error(patched.error)
    const readback = await findTwentyCompanyByDomain(company.domain)
    const readbackIssues = listLeadTwentyReadbackIssues(readback, twentyCompany.id, payload)
    if (readbackIssues.length > 0) {
      throw new Error(`Twenty list lead read-back verification failed: ${readbackIssues.join(", ")}`)
    }

    const twentyMeta = record(companyMeta.twenty)
    const canonicalSummary = record(payload.paradigmKarteSummary).markdown
    const localUpdate = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      report_url: null,
      pipeline_status: "pending",
      meta: {
        ...companyMeta,
        list_only: true,
        skip_enrichment: true,
        twenty: {
          ...twentyMeta,
          id: twentyCompany.id,
          summary: canonicalSummary,
          salesStatus: null,
          dataStatus: "",
          lastError: "",
          sourceName: "codex_verification",
          nextAction: payload.paradigmNextAction,
          updatedAt: new Date().toISOString(),
        },
      },
    }).eq("id", company.id)
    if (localUpdate.error) throw new Error(`Local list-only state could not be reconciled: ${localUpdate.error.message}`)

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

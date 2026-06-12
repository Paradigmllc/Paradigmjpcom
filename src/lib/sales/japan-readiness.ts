import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyById } from "./companies"
import { normalizeDifyCloudApiUrl, normalizeDifyCloudBaseUrl } from "./dify-cloud"
import type {
  JapanReadinessInsightSummary,
  JapanReadinessRow,
  JsonRecord,
  ShopifyProbe,
} from "./japan-readiness-types"
import { mapJapanReadinessRow } from "./japan-readiness-types"
import { asNumber, asRecord, asString, cleanDomain, hasTech, optionalEnv } from "./japan-readiness-utils"
import { buildJapanReadinessUserPayload, JAPAN_READINESS_OUTPUT_SCHEMA, JAPAN_READINESS_SYSTEM_PROMPT } from "./japan-readiness-prompt"
import { salesScopeFromCountry, type SalesLocaleScope } from "./locale-scope"
import { auditJapanMarketReadiness, type JapanMarketAudit } from "./sources/japan-market-audit"
import type { SalesCompany } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { auditFromMeta, buildLocalInsight, buildTraffic, type LocalInsight } from "./japan-readiness-scoring"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type { JapanReadinessInsightSummary } from "./japan-readiness-types"

export interface GenerateJapanReadinessOptions {
  refreshAudit?: boolean
  probeShopify?: boolean
  useDify?: boolean
}

async function probeShopifyProducts(domain: string): Promise<ShopifyProbe> {
  const url = `https://${cleanDomain(domain)}/products.json?limit=50`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Paradigm Sales OS/1.0 (+https://paradigmjp.com)" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { ok: false, productCount: 0, averagePrice: null, sampledAt: new Date().toISOString(), error: `HTTP ${res.status}` }
    const json = (await res.json()) as JsonRecord
    const products = Array.isArray(json.products) ? json.products : []
    const prices = products.flatMap((product) => {
      const variants = asRecord(product)?.variants
      return Array.isArray(variants)
        ? variants.map((variant) => asNumber(asRecord(variant)?.price)).filter((price): price is number => price !== null && price > 0)
        : []
    })
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null
    return { ok: products.length > 0, productCount: products.length, averagePrice, sampledAt: new Date().toISOString() }
  } catch (error) {
    console.warn("[japan-readiness] Shopify products probe failed:", domain, error)
    return { ok: false, productCount: 0, averagePrice: null, sampledAt: new Date().toISOString(), error: error instanceof Error ? error.message : "unknown error" }
  }
}

function getDifyKey(): { envName: string; value: string } | null {
  for (const envName of ["DIFY_JAPAN_READINESS_API_KEY", "DIFY_JAPAN_MARKET_AUDITOR_API_KEY", "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY", "DIFY_API_KEY"]) {
    const value = optionalEnv(envName)
    if (value) return { envName, value }
  }
  return null
}

async function runDifyCopy(company: SalesCompany, local: LocalInsight): Promise<{ subject: string; body: string; output: JsonRecord; modelName: string | null; engine: string }> {
  const key = getDifyKey()
  if (!key) {
    return { subject: local.subject, body: local.body, output: { fallback: "local_copy", reason: "dify key not configured" }, modelName: null, engine: "local_heuristic" }
  }
  const baseUrl = normalizeDifyCloudBaseUrl(optionalEnv("DIFY_JAPAN_READINESS_BASE_URL") ?? optionalEnv("DIFY_BASE_URL"))
  const workflowUrl = normalizeDifyCloudApiUrl(optionalEnv("DIFY_JAPAN_READINESS_API_URL") ?? `${baseUrl}/v1/workflows/run`)
  const userPayload = buildJapanReadinessUserPayload({
    company: { id: company.id, name: company.company_name, domain: company.domain },
    scores: local.scores,
    estimates: local.estimates,
    evidence: local.evidence,
    gaps: local.gaps,
  })
  const payload = {
    inputs: {
      company: { id: company.id, name: company.company_name, domain: company.domain },
      scores: local.scores,
      estimates: local.estimates,
      evidence: local.evidence,
      gaps: local.gaps,
      system_prompt: JAPAN_READINESS_SYSTEM_PROMPT,
      user_payload: JSON.stringify(userPayload),
      output_schema: JAPAN_READINESS_OUTPUT_SCHEMA,
      guardrails: [
        "Do not claim legal violation, penalty, guaranteed traffic, or guaranteed revenue.",
        "Use numbers only when present in estimates; otherwise say needs validation.",
        "Output strict JSON with subject and body fields.",
      ],
    },
    response_mode: "blocking",
    user: `sales-os-${company.id}`,
  }
  try {
    const res = await fetch(workflowUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${key.value}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
    })
    const json = (await res.json()) as JsonRecord
    if (!res.ok) throw new Error(`Dify HTTP ${res.status}: ${JSON.stringify(json).slice(0, 240)}`)
    const outputs = asRecord(json.data)?.outputs ?? json.outputs
    const parsed = parseDifyJson(outputs)
    return {
      subject: asString(parsed.subject) ?? local.subject,
      body: asString(parsed.body) ?? local.body,
      output: { env_name: key.envName, response: json, parsed },
      modelName: asString(asRecord(json.data)?.workflow_run_id) ?? "dify_workflow",
      engine: "dify_cloud",
    }
  } catch (error) {
    console.error("[japan-readiness] Dify copy generation failed:", error)
    return { subject: local.subject, body: local.body, output: { fallback: "local_copy", error: error instanceof Error ? error.message : "unknown error" }, modelName: null, engine: "local_heuristic" }
  }
}

function parseDifyJson(value: unknown): JsonRecord {
  if (asRecord(value)) {
    const record = asRecord(value)
    const result = record ? (record.result ?? record.text ?? record.output) : null
    if (asRecord(result)) return asRecord(result) ?? {}
    if (typeof result === "string") return parseJsonString(result)
    return record ?? {}
  }
  if (typeof value === "string") return parseJsonString(value)
  return {}
}

function parseJsonString(value: string): JsonRecord {
  try {
    const parsed = JSON.parse(value) as unknown
    return asRecord(parsed) ?? {}
  } catch (error) {
    console.error("[japan-readiness] Dify JSON parse failed:", error)
    return {}
  }
}

export async function listJapanReadinessInsights(scope: SalesLocaleScope, limit = 8): Promise<{ ok: boolean; insights: JapanReadinessInsightSummary[]; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, insights: [], error: "Supabase service_role not configured" }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_READINESS_INSIGHTS)
    .select("*, sales_companies(company_name, domain)")
    .eq("region", scope.region)
    .eq("report_locale", scope.reportLocale)
    .order("japan_entry_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit)
  if (error) return { ok: false, insights: [], error: error.message }
  return { ok: true, insights: ((data ?? []) as JapanReadinessRow[]).map(mapJapanReadinessRow) }
}

export async function getJapanReadinessInsight(companyId: string): Promise<{ ok: boolean; insight: JapanReadinessInsightSummary | null; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, insight: null, error: "Supabase service_role not configured" }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_READINESS_INSIGHTS)
    .select("*, sales_companies(company_name, domain)")
    .eq("company_id", companyId)
    .maybeSingle()
  if (error) return { ok: false, insight: null, error: error.message }
  return { ok: true, insight: data ? mapJapanReadinessRow(data as JapanReadinessRow) : null }
}

export async function generateJapanReadinessInsight(companyId: string, options: GenerateJapanReadinessOptions = {}): Promise<{ ok: boolean; insight?: JapanReadinessInsightSummary; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, error: "company not found" }

  const meta = asRecord(company.meta) ?? {}
  const audit = options.refreshAudit ? await auditJapanMarketReadiness(company.domain) : auditFromMeta(meta)
  const shouldProbeShopify = options.probeShopify !== false && (hasTech(meta, ["shopify"]) || options.refreshAudit)
  const shopify = shouldProbeShopify ? await probeShopifyProducts(company.domain) : null
  const local = buildLocalInsight(company, audit, shopify)
  const dify = options.useDify === false ? { subject: local.subject, body: local.body, output: { disabled: true }, modelName: null, engine: "local_heuristic" } : await runDifyCopy(company, local)
  const scope = salesScopeFromCountry({ reportLocale: company.report_locale, targetCountry: company.target_country })
  const row = await persistInsight(sb, company, scope, local, dify)
  if (!row.ok) return { ok: false, error: row.error }
  await updateCompanyMeta(sb, company, row.insight, audit, shopify)
  await upsertSourceRun(sb, company.id, row.insight)
  return { ok: true, insight: row.insight }
}

async function persistInsight(
  sb: ServiceSupabase,
  company: SalesCompany,
  scope: SalesLocaleScope,
  local: LocalInsight,
  dify: { subject: string; body: string; output: JsonRecord; modelName: string | null; engine: string },
): Promise<{ ok: boolean; insight: JapanReadinessInsightSummary; error?: string }> {
  const payload = {
    company_id: company.id,
    region: scope.region,
    report_locale: scope.reportLocale,
    target_country: scope.targetCountry,
    status: local.status,
    priority: local.priority,
    japan_entry_score: local.scores.japanEntry,
    traffic_score: local.scores.traffic,
    commerce_score: local.scores.commerce,
    localization_gap_score: local.scores.localizationGap,
    payment_gap_score: local.scores.paymentGap,
    legal_gap_score: local.scores.legalGap,
    creative_gap_score: local.scores.creativeGap,
    ability_to_pay_score: local.scores.abilityToPay,
    monthly_visits_estimate: local.estimates.monthlyVisits,
    japan_visits_estimate: local.estimates.japanVisits,
    japan_share_percent: local.estimates.japanSharePercent,
    estimated_monthly_revenue_usd: local.estimates.monthlyRevenueUsd,
    loss_amount_usd_min: local.estimates.lossMinUsd,
    loss_amount_usd_max: local.estimates.lossMaxUsd,
    confidence: local.confidence,
    evidence: local.evidence,
    gaps: local.gaps,
    dify_output: dify.output,
    cold_email_subject: dify.subject,
    cold_email_body: dify.body,
    manual_review_flags: local.manualReviewFlags,
    model_name: dify.modelName,
    engine: dify.engine,
    generated_at: new Date().toISOString(),
  }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_READINESS_INSIGHTS)
    .upsert(payload, { onConflict: "company_id", ignoreDuplicates: false })
    .select("*, sales_companies(company_name, domain)")
    .single()
  if (error || !data) {
    const message = error?.message ?? "insert returned no data"
    return { ok: false, error: message, insight: undefined as never }
  }
  return { ok: true, insight: mapJapanReadinessRow(data as JapanReadinessRow) }
}

async function updateCompanyMeta(sb: ServiceSupabase, company: SalesCompany, insight: JapanReadinessInsightSummary, audit: JapanMarketAudit | null, shopify: ShopifyProbe | null) {
  const current = asRecord(company.meta) ?? {}
  const nextMeta: JsonRecord = {
    ...current,
    japan_readiness_insight: {
      id: insight.id,
      score: insight.japanEntryScore,
      priority: insight.priority,
      confidence: insight.confidence,
      generated_at: insight.generatedAt,
      loss_amount_usd_min: insight.lossAmountUsdMin,
      loss_amount_usd_max: insight.lossAmountUsdMax,
      manual_review_flags: insight.manualReviewFlags,
    },
  }
  if (audit) nextMeta.japan_market_audit = audit
  if (shopify) nextMeta.shopify_products_probe = shopify
  const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update({ meta: nextMeta }).eq("id", company.id)
  if (error) console.error("[japan-readiness] company meta update failed:", error)
}

async function upsertSourceRun(sb: ServiceSupabase, companyId: string, insight: JapanReadinessInsightSummary) {
  const { error } = await sb
    .from(DB_TABLES.SALES_SOURCE_RUNS)
    .upsert({
      company_id: companyId,
      source_slug: "japan_readiness_insight",
      category: "analysis",
      status: insight.status === "failed" ? "error" : "collected",
      score: insight.japanEntryScore,
      details: {
        priority: insight.priority,
        confidence: insight.confidence,
        manual_review_flags: insight.manualReviewFlags,
      },
      measured_at: insight.generatedAt,
    }, { onConflict: "company_id,source_slug", ignoreDuplicates: false })
  if (error) console.error("[japan-readiness] source run update failed:", error)
}

export const __japanReadinessTest = { buildLocalInsight, buildTraffic }

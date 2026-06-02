import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyById } from "./companies"
import { normalizeDifyCloudApiUrl, normalizeDifyCloudBaseUrl } from "./dify-cloud"
import type {
  JapanReadinessEvidence,
  JapanReadinessGap,
  JapanReadinessInsightSummary,
  JapanReadinessPriority,
  JapanReadinessRow,
  JapanReadinessStatus,
  JsonRecord,
} from "./japan-readiness-types"
import { mapJapanReadinessRow } from "./japan-readiness-types"
import { asNumber, asRecord, asString, clampScore, cleanDomain, hasTech, optionalEnv, pickNumber } from "./japan-readiness-utils"
import { buildJapanReadinessUserPayload, JAPAN_READINESS_OUTPUT_SCHEMA, JAPAN_READINESS_SYSTEM_PROMPT } from "./japan-readiness-prompt"
import { salesScopeFromCountry, type SalesLocaleScope } from "./locale-scope"
import { auditJapanMarketReadiness, type JapanMarketAudit } from "./sources/japan-market-audit"
import type { SalesCompany } from "./types"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type { JapanReadinessInsightSummary } from "./japan-readiness-types"

interface ShopifyProbe {
  ok: boolean
  productCount: number
  averagePrice: number | null
  sampledAt: string
  error?: string
}

interface LocalInsight {
  priority: JapanReadinessPriority
  status: JapanReadinessStatus
  scores: {
    japanEntry: number
    traffic: number
    commerce: number
    localizationGap: number
    paymentGap: number
    legalGap: number
    creativeGap: number
    abilityToPay: number
  }
  estimates: {
    monthlyVisits: number | null
    japanVisits: number | null
    japanSharePercent: number | null
    monthlyRevenueUsd: number | null
    lossMinUsd: number | null
    lossMaxUsd: number | null
  }
  confidence: number
  evidence: JapanReadinessEvidence[]
  gaps: JapanReadinessGap[]
  subject: string
  body: string
  manualReviewFlags: string[]
}

export interface GenerateJapanReadinessOptions {
  refreshAudit?: boolean
  probeShopify?: boolean
  useDify?: boolean
}

function auditFromMeta(meta: JsonRecord): JapanMarketAudit | null {
  return asRecord(meta.japan_market_audit) as JapanMarketAudit | null
}

function buildAuditEvidence(audit: JapanMarketAudit | null): JapanReadinessEvidence[] {
  if (!audit) {
    return [{
      id: "audit-missing",
      label: "Japan readiness audit",
      value: "not collected",
      source: "japan_market_audit",
      confidence: 0.15,
    }]
  }
  const missing = Object.values(audit.status).filter(Boolean).length
  return [
    {
      id: "audit-score",
      label: "Public-page Japan readiness",
      value: `${3 - missing}/3 signals confirmed`,
      source: "japan_market_audit",
      confidence: audit.pages_checked.length > 0 ? 0.72 : 0.35,
    },
  ]
}

function buildTraffic(meta: JsonRecord): {
  monthlyVisits: number | null
  japanSharePercent: number | null
  japanVisits: number | null
  evidence: JapanReadinessEvidence[]
} {
  const monthlyVisits = pickNumber(meta, [
    ["dataforseo", "traffic", "monthly_visits"],
    ["dataforseo", "monthly_visits"],
    ["similarweb", "monthly_visits"],
    ["traffic", "monthly_visits_estimate"],
    ["traffic", "monthly_visits"],
  ])
  const percentShare = pickNumber(meta, [
    ["traffic", "japan_share_percent"],
    ["traffic", "jp_share_percent"],
  ])
  const rawShare = percentShare ?? pickNumber(meta, [
    ["dataforseo", "traffic", "country_distribution", "JP"],
    ["dataforseo", "traffic", "countries", "JP"],
    ["similarweb", "country_shares", "JP"],
  ])
  const japanSharePercent = percentShare ?? (rawShare !== null && rawShare <= 1 ? rawShare * 100 : rawShare)
  const japanVisits = monthlyVisits !== null && japanSharePercent !== null
    ? Math.round((monthlyVisits * japanSharePercent) / 100)
    : null
  const evidence: JapanReadinessEvidence[] = []
  evidence.push({
    id: "monthly-visits",
    label: "Monthly visits",
    value: monthlyVisits === null ? "unknown" : monthlyVisits.toLocaleString("en-US"),
    source: monthlyVisits === null ? "not_collected" : "traffic_meta",
    confidence: monthlyVisits === null ? 0.1 : 0.55,
  })
  evidence.push({
    id: "japan-traffic-share",
    label: "Japan traffic share",
    value: japanSharePercent === null ? "unknown" : `${japanSharePercent.toFixed(2)}%`,
    source: japanSharePercent === null ? "not_collected" : "traffic_meta",
    confidence: japanSharePercent === null ? 0.1 : 0.55,
  })
  return { monthlyVisits, japanSharePercent, japanVisits, evidence }
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

function buildLocalInsight(company: SalesCompany, audit: JapanMarketAudit | null, shopify: ShopifyProbe | null): LocalInsight {
  const meta = asRecord(company.meta) ?? {}
  const traffic = buildTraffic(meta)
  const shopifyDetected = hasTech(meta, ["shopify"]) || shopify?.ok === true
  const paymentDetected = hasTech(meta, ["stripe", "shopify payments", "paypal", "adyen", "komoju"])
  const revenueFromMeta = pickNumber(meta, [
    ["commerce", "estimated_monthly_revenue_usd"],
    ["shopify", "estimated_monthly_revenue_usd"],
    ["revenue", "monthly_usd"],
  ])
  const averageOrderValue = shopify?.averagePrice ?? pickNumber(meta, [["commerce", "average_order_value_usd"], ["shopify", "average_price"]])
  const monthlyRevenue = revenueFromMeta ?? (
    traffic.monthlyVisits !== null && averageOrderValue !== null ? Math.round(traffic.monthlyVisits * averageOrderValue * 0.015) : null
  )
  const lossMin = traffic.japanVisits !== null && averageOrderValue !== null ? Math.round(traffic.japanVisits * averageOrderValue * 0.005) : null
  const lossMax = traffic.japanVisits !== null && averageOrderValue !== null ? Math.round(traffic.japanVisits * averageOrderValue * 0.02) : null
  const status = audit?.status
  const localizationGap = audit ? (status?.tokushoho_missing || status?.appi_missing ? 70 : 25) : 55
  const paymentGap = status?.local_payments_missing ? 82 : paymentDetected ? 35 : 60
  const legalGap = status ? [status.tokushoho_missing, status.appi_missing].filter(Boolean).length * 42 : 55
  const trafficScore = traffic.japanVisits === null ? (traffic.monthlyVisits && traffic.monthlyVisits > 100_000 ? 55 : 25) : traffic.japanVisits > 1500 ? 90 : traffic.japanVisits > 300 ? 70 : 40
  const commerceScore = shopifyDetected ? 78 : paymentDetected ? 62 : monthlyRevenue && monthlyRevenue > 80_000 ? 65 : 38
  const abilityToPay = clampScore((monthlyRevenue ? Math.min(85, monthlyRevenue / 2500) : 35) + (hasTech(meta, ["klaviyo", "hubspot", "salesforce", "segment"]) ? 20 : 0) + (paymentDetected ? 12 : 0))
  const creativeGap = hasTech(meta, ["wistia", "vimeo", "youtube"]) ? 42 : 62
  const japanEntry = clampScore(trafficScore * 0.24 + commerceScore * 0.18 + localizationGap * 0.18 + paymentGap * 0.16 + legalGap * 0.12 + creativeGap * 0.06 + abilityToPay * 0.06)
  const priority: JapanReadinessPriority = japanEntry >= 74 ? "high" : japanEntry >= 52 ? "medium" : "low"
  const evidence: JapanReadinessEvidence[] = [
    ...traffic.evidence,
    ...buildAuditEvidence(audit),
    {
      id: "commerce-stack",
      label: "Commerce/payment stack",
      value: [shopifyDetected ? "Shopify-like commerce" : null, paymentDetected ? "payment tool detected" : null].filter(Boolean).join(", ") || "not enough stack evidence",
      source: "wappalyzer_or_meta",
      confidence: shopifyDetected || paymentDetected ? 0.65 : 0.2,
    },
  ]
  if (shopify) {
    evidence.push({
      id: "shopify-products-json",
      label: "Shopify products.json",
      value: shopify.ok ? `${shopify.productCount} products sampled` : `not confirmed${shopify.error ? ` (${shopify.error})` : ""}`,
      source: "products_json_probe",
      confidence: shopify.ok ? 0.7 : 0.25,
    })
  }
  const gaps = buildGaps({ localizationGap, paymentGap, legalGap, creativeGap, traffic, evidence })
  const manualReviewFlags = [
    traffic.monthlyVisits === null ? "traffic_estimate_missing" : null,
    traffic.japanSharePercent === null ? "japan_share_missing" : null,
    audit?.human_review_required ? "legal_payment_claim_requires_review" : null,
    lossMin === null || lossMax === null ? "loss_amount_directional_only" : null,
  ].filter((item): item is string => item !== null)
  const confidence = clampScore((traffic.monthlyVisits ? 22 : 0) + (traffic.japanSharePercent ? 22 : 0) + (audit ? 22 : 0) + (shopifyDetected ? 18 : 0) + (monthlyRevenue ? 16 : 0)) / 100
  const subject = `${company.company_name}: Japan-entry conversion gaps worth reviewing`
  const body = buildLocalEmail(company, { traffic, lossMin, lossMax, audit, gaps })
  return {
    priority,
    status: manualReviewFlags.includes("legal_payment_claim_requires_review") ? "manual_review" : "generated",
    scores: { japanEntry, traffic: trafficScore, commerce: commerceScore, localizationGap: clampScore(localizationGap), paymentGap: clampScore(paymentGap), legalGap: clampScore(legalGap), creativeGap: clampScore(creativeGap), abilityToPay },
    estimates: { monthlyVisits: traffic.monthlyVisits, japanVisits: traffic.japanVisits, japanSharePercent: traffic.japanSharePercent, monthlyRevenueUsd: monthlyRevenue, lossMinUsd: lossMin, lossMaxUsd: lossMax },
    confidence,
    evidence,
    gaps,
    subject,
    body,
    manualReviewFlags,
  }
}

function buildGaps(input: {
  localizationGap: number
  paymentGap: number
  legalGap: number
  creativeGap: number
  traffic: ReturnType<typeof buildTraffic>
  evidence: JapanReadinessEvidence[]
}): JapanReadinessGap[] {
  const gaps: JapanReadinessGap[] = []
  if (input.traffic.japanVisits === null || input.traffic.japanVisits > 300) {
    gaps.push({ type: "traffic", severity: input.traffic.japanVisits === null ? 45 : 78, title: "Japan traffic needs sizing", detail: "Use DataForSEO or Similarweb evidence before quoting a hard number.", evidenceRefs: ["monthly-visits", "japan-traffic-share"], confidence: input.traffic.japanVisits === null ? 0.25 : 0.55 })
  }
  if (input.localizationGap >= 50) gaps.push({ type: "localization", severity: input.localizationGap, title: "Localized trust path appears incomplete", detail: "Japanese-language buyer cues should be confirmed before sending the offer.", evidenceRefs: ["audit-score"], confidence: 0.55 })
  if (input.paymentGap >= 50) gaps.push({ type: "payment", severity: input.paymentGap, title: "Japan-local payment readiness needs review", detail: "JCB, konbini, PayPay, Paidy, or local payment wording was not clearly confirmed.", evidenceRefs: ["audit-score", "commerce-stack"], confidence: 0.55 })
  if (input.legalGap >= 50) gaps.push({ type: "legal", severity: input.legalGap, title: "Disclosure and privacy wording need human review", detail: "Do not assert legal non-compliance. Treat this as a pre-sales review queue.", evidenceRefs: ["audit-score"], confidence: 0.5 })
  if (input.creativeGap >= 50) gaps.push({ type: "creative", severity: input.creativeGap, title: "Japan-specific video proof is not visible", detail: "A localized async explainer can reduce the need for live English sales calls.", evidenceRefs: input.evidence.map((item) => item.id).slice(0, 3), confidence: 0.35 })
  return gaps.slice(0, 6)
}

function buildLocalEmail(company: SalesCompany, input: {
  traffic: ReturnType<typeof buildTraffic>
  lossMin: number | null
  lossMax: number | null
  audit: JapanMarketAudit | null
  gaps: JapanReadinessGap[]
}): string {
  const japanVisits = input.traffic.japanVisits === null ? "a measurable number of" : input.traffic.japanVisits.toLocaleString("en-US")
  const loss = input.lossMin !== null && input.lossMax !== null
    ? `$${input.lossMin.toLocaleString("en-US")}-$${input.lossMax.toLocaleString("en-US")}`
    : "an unpriced but visible"
  const primaryGap = input.gaps[0]?.title ?? "Japan-entry readiness gap"
  return [
    `Hi ${company.company_name} team,`,
    "",
    `We reviewed ${company.domain} as a Japan-entry prospect and found ${japanVisits} Japan-side visits or readiness signals that may not be converting cleanly yet.`,
    "",
    `The first gap to validate is: ${primaryGap}. Based on the public-page audit and stack evidence, the opportunity is currently estimated as ${loss} monthly conversion risk. This is a sales hypothesis, not legal advice, and should be checked by a human before final sending.`,
    "",
    "Paradigm can package the Japan buyer path asynchronously: localized site copy, payment/trust cues, and Loom-style video explainers so your team does not need live Japanese sales coverage.",
  ].join("\n")
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
    .from("sales_japan_readiness_insights")
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
    .from("sales_japan_readiness_insights")
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
    .from("sales_japan_readiness_insights")
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
  const { error } = await sb.from("sales_companies").update({ meta: nextMeta }).eq("id", company.id)
  if (error) console.error("[japan-readiness] company meta update failed:", error)
}

async function upsertSourceRun(sb: ServiceSupabase, companyId: string, insight: JapanReadinessInsightSummary) {
  const { error } = await sb
    .from("sales_source_runs")
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

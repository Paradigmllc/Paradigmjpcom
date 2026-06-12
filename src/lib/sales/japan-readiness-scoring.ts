import type { JapanMarketAudit } from "./sources/japan-market-audit"
import type {
  JapanReadinessEvidence,
  JapanReadinessGap,
  JapanReadinessPriority,
  JapanReadinessStatus,
  JsonRecord,
  ShopifyProbe,
} from "./japan-readiness-types"
import { asRecord, clampScore, hasTech, pickNumber } from "./japan-readiness-utils"
import type { SalesCompany } from "./types"

export interface LocalInsight {
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

export function auditFromMeta(meta: JsonRecord): JapanMarketAudit | null {
  return asRecord(meta.japan_market_audit) as JapanMarketAudit | null
}

export function buildAuditEvidence(audit: JapanMarketAudit | null): JapanReadinessEvidence[] {
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

export function buildTraffic(meta: JsonRecord): {
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

export function buildLocalInsight(company: SalesCompany, audit: JapanMarketAudit | null, shopify: ShopifyProbe | null): LocalInsight {
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

export function buildGaps(input: {
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

export function buildLocalEmail(company: SalesCompany, input: {
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

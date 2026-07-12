import type { MarketVisibilityBand, MarketVisibilityIndex } from "./market-visibility"

export const JAPAN_ENTRY_MODEL_VERSION = "public-opportunity-v1" as const
export const JAPAN_ENTRY_HORIZONS = [6, 12, 24] as const
export const JAPAN_ENTRY_SCENARIOS = ["conservative", "base", "upside"] as const

export type JapanEntryScenario = (typeof JAPAN_ENTRY_SCENARIOS)[number]
export type JapanEntryHorizon = (typeof JAPAN_ENTRY_HORIZONS)[number]
export type BusinessModel = "ecommerce" | "saas" | "service"

export interface ProjectionEvidence {
  id: string
  classification: "observed" | "indexed" | "estimated" | "assumed"
  label: string
  value: string
  source: string
  sourceUrl: string | null
  observedAt: string | null
  confidence: number
  limitation: string
}

export interface ProjectionAssumptions {
  businessModel: BusinessModel
  averageOrderValueUsd: number
  conversionRate: number
  grossMargin: number
  currentJapanShare: number
  targetJapanShareMonth24: number
  monthlyManagedFeeUsdAfterMonth6: number
  setupFeeUsd: number
}

export interface MarketProjection {
  code: string
  label: string
  estimatedMonthlyVisits: number
  share: number
  confidence: number
  classification: "estimated"
}

export interface ProjectionMonth {
  month: number
  japanVisits: number
  incrementalRevenueUsd: number
  incrementalGrossProfitUsd: number
  cumulativeGrossProfitUsd: number
  cumulativeCostUsd: number
  cumulativeNetBenefitUsd: number
  roiPercent: number
}

export interface ProjectionHorizonSummary extends ProjectionMonth {
  horizon: JapanEntryHorizon
}

export interface ProjectionScenarioResult {
  scenario: JapanEntryScenario
  months: ProjectionMonth[]
  horizons: ProjectionHorizonSummary[]
}

export interface JapanEntryProjection {
  modelVersion: typeof JAPAN_ENTRY_MODEL_VERSION
  generatedAt: string
  classification: "modeled-estimate"
  estimatedMonthlyVisits: number
  monthlyVisitRange: { low: number; high: number }
  markets: MarketProjection[]
  assumptions: ProjectionAssumptions
  scenarios: ProjectionScenarioResult[]
  monthlyOpportunityGapUsd: number
  paybackMonth: number | null
  evidence: ProjectionEvidence[]
  limitations: string[]
}

export interface JapanEntryProjectionInput {
  companyName: string
  domain: string
  targetCountry?: string | null
  visibility: MarketVisibilityIndex
  businessModel?: BusinessModel
  averageOrderValueUsd?: number
  conversionRate?: number
  grossMargin?: number
  currentJapanShare?: number
  targetJapanShareMonth24?: number
  observedAt?: string
}

const VISITS_BY_BAND: Record<MarketVisibilityBand, { low: number; base: number; high: number } | null> = {
  "top-100": { low: 20_000_000, base: 50_000_000, high: 120_000_000 },
  "top-1k": { low: 2_000_000, base: 6_000_000, high: 20_000_000 },
  "top-10k": { low: 300_000, base: 900_000, high: 2_500_000 },
  "top-100k": { low: 45_000, base: 130_000, high: 350_000 },
  "top-1m": { low: 6_000, base: 18_000, high: 55_000 },
  "top-10m": { low: 700, base: 2_200, high: 8_000 },
  ranked: { low: 150, base: 600, high: 2_500 },
  "not-observed": null,
}

const MARKET_DEFINITIONS = [
  { code: "US", label: "United States", weight: 30 },
  { code: "EU_UK", label: "United Kingdom & Europe", weight: 24 },
  { code: "AU_NZ", label: "Australia & New Zealand", weight: 10 },
  { code: "CA", label: "Canada", weight: 8 },
  { code: "SG", label: "Singapore", weight: 7 },
  { code: "MENA", label: "UAE, Saudi Arabia & Qatar", weight: 8 },
  { code: "JP", label: "Japan", weight: 3 },
  { code: "OTHER", label: "Other markets", weight: 10 },
] as const

const DEFAULTS: Record<BusinessModel, Pick<ProjectionAssumptions, "averageOrderValueUsd" | "conversionRate" | "grossMargin">> = {
  ecommerce: { averageOrderValueUsd: 110, conversionRate: 0.018, grossMargin: 0.55 },
  saas: { averageOrderValueUsd: 149, conversionRate: 0.012, grossMargin: 0.82 },
  service: { averageOrderValueUsd: 1_500, conversionRate: 0.004, grossMargin: 0.6 },
}

const SCENARIO_FACTORS: Record<JapanEntryScenario, { share: number; conversion: number }> = {
  conservative: { share: 0.65, conversion: 0.75 },
  base: { share: 1, conversion: 1 },
  upside: { share: 1.35, conversion: 1.2 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundMoney(value: number): number {
  return Math.round(value)
}

function targetMarketCode(country: string | null | undefined): string {
  const code = country?.toUpperCase() ?? ""
  if (["GB", "DE", "FR", "ES", "IT", "NL", "SE", "NO", "DK", "FI", "IE", "CH", "AT", "BE", "PT"].includes(code)) return "EU_UK"
  if (["AU", "NZ"].includes(code)) return "AU_NZ"
  if (["AE", "SA", "QA"].includes(code)) return "MENA"
  if (["SG"].includes(code)) return "SG"
  if (["CA"].includes(code)) return "CA"
  return "US"
}

function buildMarkets(totalVisits: number, currentJapanShare: number, targetCountry?: string | null): MarketProjection[] {
  const target = targetMarketCode(targetCountry)
  const japanPercent = currentJapanShare * 100
  const nonJapan = 100 - japanPercent
  const adjusted = MARKET_DEFINITIONS.map((market) => {
    if (market.code === "JP") return { ...market, weight: japanPercent }
    const originalNonJapanWeight = MARKET_DEFINITIONS.filter((item) => item.code !== "JP").reduce((sum, item) => sum + item.weight, 0)
    const targetBoost = market.code === target ? 12 : 0
    const boostedTotal = originalNonJapanWeight + 12
    return { ...market, weight: ((market.weight + targetBoost) / boostedTotal) * nonJapan }
  })
  return adjusted.map((market) => ({
    code: market.code,
    label: market.label,
    estimatedMonthlyVisits: Math.round(totalVisits * market.weight / 100),
    share: Number((market.weight / 100).toFixed(4)),
    confidence: market.code === "JP" ? 0.35 : 0.4,
    classification: "estimated",
  }))
}

function interpolateJapanShare(month: number, current: number, target24: number): number {
  const milestone6 = current + (target24 - current) * 0.35
  const milestone12 = current + (target24 - current) * 0.65
  if (month <= 6) return current + (milestone6 - current) * month / 6
  if (month <= 12) return milestone6 + (milestone12 - milestone6) * (month - 6) / 6
  return milestone12 + (target24 - milestone12) * (month - 12) / 12
}

function scenarioSeries(totalVisits: number, assumptions: ProjectionAssumptions, scenario: JapanEntryScenario): ProjectionScenarioResult {
  const factor = SCENARIO_FACTORS[scenario]
  let cumulativeGrossProfit = 0
  const months = Array.from({ length: 24 }, (_, index): ProjectionMonth => {
    const month = index + 1
    const modeledShare = assumptions.currentJapanShare + (interpolateJapanShare(month, assumptions.currentJapanShare, assumptions.targetJapanShareMonth24) - assumptions.currentJapanShare) * factor.share
    const japanVisits = Math.round(totalVisits * modeledShare)
    const incrementalVisits = Math.max(0, japanVisits - totalVisits * assumptions.currentJapanShare)
    const incrementalRevenue = incrementalVisits * assumptions.conversionRate * factor.conversion * assumptions.averageOrderValueUsd
    const grossProfit = incrementalRevenue * assumptions.grossMargin
    cumulativeGrossProfit += grossProfit
    const continuationCost = Math.max(0, month - 6) * assumptions.monthlyManagedFeeUsdAfterMonth6
    const cumulativeCost = assumptions.setupFeeUsd + continuationCost
    const net = cumulativeGrossProfit - cumulativeCost
    return {
      month,
      japanVisits,
      incrementalRevenueUsd: roundMoney(incrementalRevenue),
      incrementalGrossProfitUsd: roundMoney(grossProfit),
      cumulativeGrossProfitUsd: roundMoney(cumulativeGrossProfit),
      cumulativeCostUsd: roundMoney(cumulativeCost),
      cumulativeNetBenefitUsd: roundMoney(net),
      roiPercent: Number(((net / assumptions.setupFeeUsd) * 100).toFixed(1)),
    }
  })
  return {
    scenario,
    months,
    horizons: JAPAN_ENTRY_HORIZONS.map((horizon) => ({ ...months[horizon - 1], horizon })),
  }
}

export function buildJapanEntryProjection(input: JapanEntryProjectionInput): JapanEntryProjection {
  const visitBand = VISITS_BY_BAND[input.visibility.band]
  if (!visitBand) throw new Error("Public rank evidence is required before a traffic model can be generated")
  const businessModel = input.businessModel ?? "ecommerce"
  const defaults = DEFAULTS[businessModel]
  const assumptions: ProjectionAssumptions = {
    businessModel,
    averageOrderValueUsd: clamp(input.averageOrderValueUsd ?? defaults.averageOrderValueUsd, 1, 1_000_000),
    conversionRate: clamp(input.conversionRate ?? defaults.conversionRate, 0.0001, 0.5),
    grossMargin: clamp(input.grossMargin ?? defaults.grossMargin, 0.01, 1),
    currentJapanShare: clamp(input.currentJapanShare ?? 0.015, 0, 0.3),
    targetJapanShareMonth24: clamp(input.targetJapanShareMonth24 ?? 0.055, 0.001, 0.5),
    monthlyManagedFeeUsdAfterMonth6: 995,
    setupFeeUsd: 12_000,
  }
  if (assumptions.targetJapanShareMonth24 <= assumptions.currentJapanShare) {
    throw new Error("targetJapanShareMonth24 must exceed currentJapanShare")
  }
  const scenarios = JAPAN_ENTRY_SCENARIOS.map((scenario) => scenarioSeries(visitBand.base, assumptions, scenario))
  const base = scenarios.find((scenario) => scenario.scenario === "base")
  if (!base) throw new Error("Base scenario generation failed")
  const payback = base.months.find((month) => month.cumulativeNetBenefitUsd >= 0)?.month ?? null
  const currentRevenue = visitBand.base * assumptions.currentJapanShare * assumptions.conversionRate * assumptions.averageOrderValueUsd
  const targetRevenue = visitBand.base * assumptions.targetJapanShareMonth24 * assumptions.conversionRate * assumptions.averageOrderValueUsd
  const generatedAt = input.observedAt ?? new Date().toISOString()
  const evidence: ProjectionEvidence[] = [
    ...input.visibility.evidence.map((item) => ({
      id: item.id,
      classification: "observed" as const,
      label: item.label,
      value: item.value,
      source: item.source,
      sourceUrl: item.sourceUrl,
      observedAt: item.observedAt,
      confidence: item.confidence,
      limitation: item.limitation,
    })),
    {
      id: "traffic-band-model",
      classification: "estimated",
      label: "Monthly traffic range",
      value: `${visitBand.low.toLocaleString("en-US")}–${visitBand.high.toLocaleString("en-US")}`,
      source: `${JAPAN_ENTRY_MODEL_VERSION} rank-band model`,
      sourceUrl: null,
      observedAt: generatedAt,
      confidence: 0.38,
      limitation: "A wide planning range derived from public popularity bands; it is not analytics data.",
    },
  ]
  return {
    modelVersion: JAPAN_ENTRY_MODEL_VERSION,
    generatedAt,
    classification: "modeled-estimate",
    estimatedMonthlyVisits: visitBand.base,
    monthlyVisitRange: { low: visitBand.low, high: visitBand.high },
    markets: buildMarkets(visitBand.base, assumptions.currentJapanShare, input.targetCountry),
    assumptions,
    scenarios,
    monthlyOpportunityGapUsd: roundMoney(targetRevenue - currentRevenue),
    paybackMonth: payback,
    evidence,
    limitations: [
      "Traffic, country mix, revenue and ROI are modeled estimates, not observed analytics or guarantees.",
      "Public rank and crawl signals indicate relative visibility but do not disclose exact visits.",
      "Country allocation, conversion, order value and margin must be replaced with first-party data when available.",
      "The first six managed months add no monthly fee; the model applies $995/month from month 7 under signed terms.",
    ],
  }
}

export function buildInitialJapanEntryMessage(companyName: string, projection: JapanEntryProjection): string {
  const base = projection.scenarios.find((scenario) => scenario.scenario === "base")
  const month12 = base?.horizons.find((item) => item.horizon === 12)
  if (!month12) throw new Error("12-month base projection is unavailable")
  const range = `${projection.monthlyVisitRange.low.toLocaleString("en-US")}–${projection.monthlyVisitRange.high.toLocaleString("en-US")}`
  const message = `Hi ${companyName} team — using public web visibility signals, we modeled roughly ${range} monthly visits across your markets. Japan appears underrepresented in the model, with an estimated monthly opportunity gap of about $${projection.monthlyOpportunityGapUsd.toLocaleString("en-US")} before costs. Under the base assumptions, the 12-month modeled net impact is $${month12.cumulativeNetBenefitUsd.toLocaleString("en-US")} (${month12.roiPercent}% ROI). Our Japan Entry Package is $12,000 paid upfront and includes the first six managed months at no additional charge. These are modeled estimates, not analytics or a guarantee. Reply “Japan” and I’ll send the assumptions for review.`
  if (/(?:https?:\/\/|www\.|\[[^\]]+\]\([^)]+\))/i.test(message)) {
    throw new Error("Initial Japan Entry message must not contain a URL")
  }
  return message
}

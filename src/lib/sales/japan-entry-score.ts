import type { JapanMarketAudit } from "./sources/japan-market-audit"
import type { MarketVisibilityIndex, MarketCountrySignal } from "./market-visibility"

export const JAPAN_ENTRY_TARGET_COUNTRIES = ["US", "GB", "AU", "CA", "NZ", "DE", "FR"] as const
export type JapanEntryTargetCountry = (typeof JAPAN_ENTRY_TARGET_COUNTRIES)[number]
export type ReadinessAnswer = "yes" | "no" | "unknown"

export interface JapanEntrySelfReported {
  japaneseLanguage: ReadinessAnswer
  japanPayments: ReadinessAnswer
  japanFulfillment: ReadinessAnswer
  japanSupport: ReadinessAnswer
  decisionReady: ReadinessAnswer
}

export interface JapanEntryHomepageSignals {
  ok: boolean
  hasJapaneseLanguage: boolean
  hasJapaneseCurrency: boolean
  hasJapanPayment: boolean
  hasJapanShipping: boolean
  hasCheckoutOrInquiry: boolean
  title: string | null
  observedAt: string
}

export interface JapanEntryScoreFactor {
  id: string
  label: string
  score: number | null
  weight: number
  source: "public" | "self-reported"
  detail: string
}

export type JapanEntryScoreBand =
  | "no-data"
  | "limited-evidence"
  | "signals-not-visible"
  | "foundation"
  | "promising"
  | "strong-signals"

export interface JapanEntryScoreInput {
  domain: string
  targetCountry: JapanEntryTargetCountry
  visibility: MarketVisibilityIndex
  audit: JapanMarketAudit | null
  homepage: JapanEntryHomepageSignals
  sitemap: {
    totalUrls: number | null
    hasBlog: boolean | null
    hasProducts: boolean | null
  }
  schema: {
    hasOrganization: boolean
    hasProduct: boolean
    hasPrice: boolean
  }
  selfReported: JapanEntrySelfReported
}

export interface JapanEntryScoreResult {
  version: "japan-entry-score-v1"
  domain: string
  targetCountry: JapanEntryTargetCountry
  score: number | null
  coverage: number
  band: JapanEntryScoreBand
  factors: JapanEntryScoreFactor[]
  unknowns: string[]
  recommendedActions: string[]
  countrySignals: MarketCountrySignal[]
  marketVisibility: MarketVisibilityIndex
  actualMonthlyVisits: null
  actualRevenue: null
  observedAt: string
}

export function normalizePublicDomain(value: string): string | null {
  const raw = value.trim()
  if (!raw || raw.length > 253 || /[\s@]/.test(raw)) return null
  try {
    const url = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!hostname.includes(".") || hostname.endsWith(".local") || hostname === "localhost") return null
    const looksLikeIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    const looksLikeIpv6 = hostname.includes(":")
    if (looksLikeIpv4 || looksLikeIpv6) return null
    if (url.username || url.password) return null
    return hostname
  } catch (error) {
    console.error("[japan-entry-score] invalid domain:", error)
    return null
  }
}

export function parseTargetCountry(value: unknown): JapanEntryTargetCountry {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : ""
  return (JAPAN_ENTRY_TARGET_COUNTRIES as readonly string[]).includes(candidate)
    ? candidate as JapanEntryTargetCountry
    : "US"
}

export function parseReadinessAnswer(value: unknown): ReadinessAnswer {
  return value === "yes" || value === "no" ? value : "unknown"
}

export function parseSelfReported(value: unknown): JapanEntrySelfReported {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return {
    japaneseLanguage: parseReadinessAnswer(source.japaneseLanguage),
    japanPayments: parseReadinessAnswer(source.japanPayments),
    japanFulfillment: parseReadinessAnswer(source.japanFulfillment),
    japanSupport: parseReadinessAnswer(source.japanSupport),
    decisionReady: parseReadinessAnswer(source.decisionReady),
  }
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function answerScore(value: ReadinessAnswer): number | null {
  if (value === "yes") return 100
  if (value === "no") return 20
  return null
}

function average(values: Array<number | null>): number | null {
  const observed = values.filter((value): value is number => value !== null)
  return observed.length > 0 ? clampScore(observed.reduce((sum, value) => sum + value, 0) / observed.length) : null
}

function buildFactors(input: JapanEntryScoreInput): JapanEntryScoreFactor[] {
  const targetSignal = input.visibility.countrySignals.find((signal) => signal.countryCode === input.targetCountry)
  const marketAlignment = input.visibility.countrySignals.length === 0
    ? null
    : targetSignal
      ? 100
      : 55

  const auditScore = input.audit?.score ?? null
  const homepageReadiness = input.homepage.ok
    ? clampScore(
      (input.homepage.hasJapaneseLanguage ? 45 : 0) +
      (input.homepage.hasJapaneseCurrency ? 20 : 0) +
      (input.homepage.hasJapanPayment ? 20 : 0) +
      (input.homepage.hasJapanShipping ? 15 : 0),
    )
    : null
  const japanReadiness = auditScore !== null && homepageReadiness !== null
    ? clampScore((auditScore + homepageReadiness) / 2)
    : auditScore ?? homepageReadiness

  const commerceSignals = [
    input.sitemap.totalUrls !== null && input.sitemap.totalUrls > 0,
    input.sitemap.hasProducts === true,
    input.sitemap.hasBlog === true,
    input.schema.hasOrganization,
    input.schema.hasProduct,
    input.schema.hasPrice,
    input.homepage.hasCheckoutOrInquiry,
  ].filter(Boolean).length
  const commerce = input.homepage.ok || input.sitemap.totalUrls !== null
    ? clampScore((commerceSignals / 7) * 100)
    : null

  const execution = average([
    answerScore(input.selfReported.japaneseLanguage),
    answerScore(input.selfReported.japanPayments),
    answerScore(input.selfReported.japanFulfillment),
    answerScore(input.selfReported.japanSupport),
    answerScore(input.selfReported.decisionReady),
  ])

  return [
    {
      id: "public-visibility",
      label: "Public visibility",
      score: input.visibility.index,
      weight: 30,
      source: "public",
      detail: input.visibility.index === null ? "No public rank or crawl signal observed" : `${input.visibility.band} public footprint`,
    },
    {
      id: "market-alignment",
      label: "Target-market alignment",
      score: marketAlignment,
      weight: 15,
      source: "public",
      detail: targetSignal ? `${input.targetCountry} signal observed` : input.visibility.countrySignals.length > 0 ? "Other country signal observed" : "No country alignment signal observed",
    },
    {
      id: "japan-readiness",
      label: "Japan localization and trust",
      score: japanReadiness,
      weight: 25,
      source: "public",
      detail: input.audit ? "Public-page legal, privacy, and payment heuristic" : "Homepage signals only",
    },
    {
      id: "commerce-footprint",
      label: "Commerce footprint",
      score: commerce,
      weight: 15,
      source: "public",
      detail: `${commerceSignals} of 7 public commerce signals observed`,
    },
    {
      id: "execution-readiness",
      label: "Execution readiness",
      score: execution,
      weight: 15,
      source: "self-reported",
      detail: execution === null ? "No execution answers provided" : "Based on the submitted readiness answers",
    },
  ]
}

function bandFor(score: number | null, coverage: number): JapanEntryScoreBand {
  if (score === null) return "no-data"
  if (coverage < 35) return "limited-evidence"
  if (score < 40) return "signals-not-visible"
  if (score < 65) return "foundation"
  if (score < 80) return "promising"
  return "strong-signals"
}

function buildUnknowns(input: JapanEntryScoreInput, factors: JapanEntryScoreFactor[]): string[] {
  const unknowns: string[] = []
  if (input.visibility.actualMonthlyVisits === null) unknowns.push("Actual monthly visits are not publicly observable")
  if (input.visibility.actualRevenue === null) unknowns.push("Actual revenue is not publicly observable")
  if (!factors.some((factor) => factor.id === "execution-readiness" && factor.score !== null)) unknowns.push("Execution readiness is self-reported and was not provided")
  if (input.visibility.countrySignals.length === 0) unknowns.push("Country-level traffic share is not publicly observable")
  if (!input.audit) unknowns.push("Japan public-page audit could not be completed")
  return unknowns
}

function buildActions(input: JapanEntryScoreInput, factors: JapanEntryScoreFactor[]): string[] {
  const actions: string[] = []
  const readiness = factors.find((factor) => factor.id === "japan-readiness")
  const visibility = factors.find((factor) => factor.id === "public-visibility")
  if (visibility?.score === null) actions.push("Create an indexable public footprint before sizing Japan demand.")
  if (!readiness || readiness.score === null || readiness.score < 60) actions.push("Add a Japanese buyer path with trust, privacy, and payment cues.")
  if (input.audit?.status.local_payments_missing) actions.push("Validate JCB, konbini, PayPay, Paidy, or another suitable Japan payment route.")
  if (input.selfReported.decisionReady === "no") actions.push("Assign one empowered decision-maker and implementation owner.")
  if (actions.length === 0) actions.push("Validate the remaining unknowns and move into a scoped 14-business-day launch plan.")
  return actions.slice(0, 3)
}

export function buildJapanEntryScore(input: JapanEntryScoreInput): JapanEntryScoreResult {
  const factors = buildFactors(input)
  const observedWeight = factors.reduce((sum, factor) => sum + (factor.score === null ? 0 : factor.weight), 0)
  const weightedScore = factors.reduce((sum, factor) => sum + (factor.score === null ? 0 : factor.score * factor.weight), 0)
  const score = observedWeight > 0 ? clampScore(weightedScore / observedWeight) : null
  const coverage = Math.round(observedWeight)
  return {
    version: "japan-entry-score-v1",
    domain: input.domain,
    targetCountry: input.targetCountry,
    score,
    coverage,
    band: bandFor(score, coverage),
    factors,
    unknowns: buildUnknowns(input, factors),
    recommendedActions: buildActions(input, factors),
    countrySignals: input.visibility.countrySignals,
    marketVisibility: input.visibility,
    actualMonthlyVisits: null,
    actualRevenue: null,
    observedAt: new Date().toISOString(),
  }
}

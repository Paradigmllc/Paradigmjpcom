import { clampScore } from "./lead-candidate-scoring"
import { getGlobalSmbMarketConfig } from "./global-smb-market-config"

export const FRESH_DOMAIN_WEBSITE_STATES = [
  "unknown",
  "dead",
  "parked",
  "under_construction",
  "default_server",
  "legacy",
  "modern",
] as const

export type FreshDomainWebsiteState = typeof FRESH_DOMAIN_WEBSITE_STATES[number]

const ENTERPRISE_RE =
  /\b(enterprise|global|holdings?|group|corporation|corp\.?|bank|insurance|government|ministry|university|national|international|franchise|subsidiary|investors?|public company|nasdaq|nyse|lse|asx)\b/i

const HIGH_VALUE_LOCAL_SERVICE_RE =
  /\b(dental|dentist|orthodont|roof|plumb|hvac|electric|clinic|med spa|spa|fitness|gym|restaurant|cafe|law|attorney|accounting|construction|remodel|landscap|salon|beauty|chiropractic|physio|therapy)\b/i

export interface FreshDomainScoringInput {
  domain: string
  countryCode: string
  registeredAt?: string | null
  changedAt?: string | null
  companyName?: string | null
  industryHint?: string | null
  websiteState?: FreshDomainWebsiteState | null
  hasPublicContact?: boolean
  evidenceText?: string | null
}

export interface FreshDomainSignals {
  market: ReturnType<typeof getGlobalSmbMarketConfig>
  isEnterpriseLike: boolean
  websiteWeaknessScore: number
  freshnessHintScore: number
  contactabilityHint: boolean
  localServiceFitScore: number
  reasons: string[]
}

function daysSince(value: string | null | undefined): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000))
}

export function inferFreshDomainSignals(input: FreshDomainScoringInput): FreshDomainSignals {
  const market = getGlobalSmbMarketConfig(input.countryCode)
  const evidence = [input.domain, input.companyName, input.industryHint, input.evidenceText].filter(Boolean).join("\n")
  const reasons: string[] = []
  const state = input.websiteState ?? "unknown"

  const registeredAgeDays = daysSince(input.registeredAt)
  const changedAgeDays = daysSince(input.changedAt)
  const newestAgeDays = [registeredAgeDays, changedAgeDays].filter((value): value is number => value !== null).sort((a, b) => a - b)[0] ?? null

  const freshnessHintScore = newestAgeDays === null
    ? 66
    : newestAgeDays <= 14
      ? 96
      : newestAgeDays <= 45
        ? 86
        : newestAgeDays <= 120
          ? 72
          : 48
  if (newestAgeDays !== null) reasons.push(`domain freshness ${newestAgeDays}d`)

  const websiteWeaknessScore = {
    dead: 94,
    parked: 92,
    under_construction: 88,
    default_server: 86,
    legacy: 68,
    unknown: 44,
    modern: 8,
  }[state]
  reasons.push(`website state ${state}`)

  const isEnterpriseLike = ENTERPRISE_RE.test(evidence)
  if (isEnterpriseLike) reasons.push("enterprise-like keyword detected")

  const localServiceFitScore = HIGH_VALUE_LOCAL_SERVICE_RE.test(evidence)
    ? 88
    : market.defaultIndustryFocus.some((focus) => evidence.toLowerCase().includes(focus.replace(/_/g, " ")))
      ? 72
      : 46
  if (localServiceFitScore >= 72) reasons.push("local service industry signal")

  return {
    market,
    isEnterpriseLike,
    websiteWeaknessScore: clampScore(websiteWeaknessScore),
    freshnessHintScore: clampScore(freshnessHintScore),
    contactabilityHint: input.hasPublicContact === true,
    localServiceFitScore: clampScore(localServiceFitScore),
    reasons,
  }
}

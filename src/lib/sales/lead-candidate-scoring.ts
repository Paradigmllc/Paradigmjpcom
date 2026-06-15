import type { TechItem } from "./sources/wappalyzer"

export type CandidateLane = "tech_footprint" | "no_website_local_smb"
export type CandidateStatus = "candidate" | "scored" | "promoted" | "rejected"

export interface CandidateCountrySignal {
  countryCode: string
  signalType: string
  confidence: number
  evidence: string
}

export interface CandidateScore {
  stackFitScore: number
  smbScore: number
  freshnessScore: number
  geoConfidence: number
  contactabilityScore: number
  websiteAbsenceScore: number
  opportunityScore: number
  falsePositiveRisk: number
  details: Record<string, unknown>
}

const COUNTRY_TLD_PATTERNS: Record<string, string[]> = {
  ZA: ["*.za"],
  CH: ["*.ch", "*.swiss"],
}

const COUNTRY_SIGNAL_RULES: Record<string, Array<{ type: string; pattern: RegExp; confidence: number }>> = {
  ZA: [
    { type: "phone", pattern: /\+27|0027/i, confidence: 92 },
    { type: "currency", pattern: /\bZAR\b|R\s?\d{2,}/i, confidence: 76 },
    { type: "address", pattern: /South Africa|Johannesburg|Cape Town|Pretoria|Durban/i, confidence: 82 },
  ],
  CH: [
    { type: "phone", pattern: /\+41|0041/i, confidence: 92 },
    { type: "currency", pattern: /\bCHF\b|Fr\.\s?\d{2,}/i, confidence: 78 },
    { type: "address", pattern: /Switzerland|Schweiz|Suisse|Zurich|Zuerich|Geneva|Geneve|Basel|Bern/i, confidence: 84 },
  ],
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function technologySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function countryTldSignal(domain: string, countryCode: string): CandidateCountrySignal | null {
  const cc = countryCode.toUpperCase()
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "")
  if (cc === "ZA" && (normalized.endsWith(".za") || normalized.includes(".co.za"))) {
    return { countryCode: cc, signalType: "tld", confidence: 95, evidence: normalized }
  }
  if (cc === "CH" && (normalized.endsWith(".ch") || normalized.endsWith(".swiss"))) {
    return { countryCode: cc, signalType: "tld", confidence: 95, evidence: normalized }
  }
  const tld = cc.toLowerCase()
  if (normalized.endsWith(`.${tld}`)) {
    return { countryCode: cc, signalType: "tld", confidence: 90, evidence: normalized }
  }
  return null
}

export function inferCountrySignals(input: {
  domain?: string | null
  targetCountry: string
  evidenceText?: string | null
}): CandidateCountrySignal[] {
  const countryCode = input.targetCountry.trim().toUpperCase()
  const signals: CandidateCountrySignal[] = []
  if (input.domain) {
    const signal = countryTldSignal(input.domain, countryCode)
    if (signal) signals.push(signal)
  }

  const evidence = input.evidenceText ?? ""
  for (const rule of COUNTRY_SIGNAL_RULES[countryCode] ?? []) {
    if (rule.pattern.test(evidence)) {
      signals.push({
        countryCode,
        signalType: rule.type,
        confidence: rule.confidence,
        evidence: evidence.slice(0, 240),
      })
    }
  }

  if (signals.length === 0 && countryCode.length === 2) {
    signals.push({ countryCode, signalType: "request_scope", confidence: 35, evidence: "country requested by operator" })
  }
  return signals
}

function maxCountryConfidence(signals: CandidateCountrySignal[]): number {
  return signals.reduce((max, signal) => Math.max(max, signal.confidence), 0)
}

export function scoreCandidate(input: {
  requestedTechnology?: string | null
  detections?: TechItem[]
  countrySignals: CandidateCountrySignal[]
  lane: CandidateLane
  hasWebsite: boolean
  hasContactSignal?: boolean
  source: string
}): CandidateScore {
  const requestedSlug = input.requestedTechnology ? technologySlug(input.requestedTechnology) : null
  const detectionSlugs = (input.detections ?? []).map((tech) => technologySlug(tech.name))
  const exactStack = requestedSlug ? detectionSlugs.includes(requestedSlug) : detectionSlugs.length > 0
  const stackFitScore = requestedSlug ? (exactStack ? 96 : 0) : Math.min(90, detectionSlugs.length * 18)
  const geoConfidence = maxCountryConfidence(input.countrySignals)
  const websiteAbsenceScore = input.hasWebsite ? 0 : 92
  const smbScore = input.lane === "no_website_local_smb" ? 86 : 58
  const freshnessScore = input.source === "common_crawl_domains" ? 62 : 74
  const contactabilityScore = input.hasContactSignal ? 70 : 34
  const falsePositiveRisk = clampScore((requestedSlug && !exactStack ? 35 : 12) + (geoConfidence < 50 ? 28 : 0))
  const laneOpportunityBonus = input.lane === "no_website_local_smb" ? 12 : 0
  const opportunityScore = clampScore(
    stackFitScore * 0.34 +
      geoConfidence * 0.24 +
      smbScore * 0.16 +
      contactabilityScore * 0.12 +
      websiteAbsenceScore * 0.1 +
      freshnessScore * 0.04 -
      falsePositiveRisk * 0.12 +
      laneOpportunityBonus,
  )

  return {
    stackFitScore,
    smbScore,
    freshnessScore,
    geoConfidence,
    contactabilityScore,
    websiteAbsenceScore,
    opportunityScore,
    falsePositiveRisk,
    details: {
      requestedTechnology: input.requestedTechnology ?? null,
      detectedTechnologies: detectionSlugs,
      exactStack,
      source: input.source,
      laneOpportunityBonus,
    },
  }
}

export function tldPatternsForCountry(countryCode: string): string[] {
  const cc = countryCode.trim().toUpperCase()
  return COUNTRY_TLD_PATTERNS[cc] ?? [`*.${cc.toLowerCase()}`]
}

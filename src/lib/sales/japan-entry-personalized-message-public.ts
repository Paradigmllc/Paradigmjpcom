export interface ManualMessageStrategy {
  primaryObservation: string
  whyNow: string
  japaneseSegment: string
  japanGap: string
  opportunityAngle: string
  offerRelevance: string
  tone: string
  cta: string
  countryAdaptation: string
  prohibitedClaims: string[]
}

export interface ManualGeneratedMessageCandidate {
  message: string
  factIds: string[]
  productEvidence: string
  productEvidenceRendering: string
  angle: string
  openingStyle: string
  diagnosticFocus: string
  ctaType: string
  architecture: string
  personalizationAnchors: string[]
  solutionFocus: string
}

interface StrategyValue {
  primary_observation: string
  why_now: string
  japanese_segment: string
  japan_gap: string
  opportunity_angle: string
  offer_relevance: string
  tone: string
  cta: string
  country_adaptation: string
  prohibited_claims: string[]
}

interface CandidateValue {
  message: string
  fact_ids: string[]
  product_evidence: string
  product_evidence_rendering: string
  angle: string
  opening_style: string
  diagnostic_focus: string
  cta_type: string
  architecture: string
  personalization_anchors: string[]
  solution_focus: string
}

export function publicManualMessageStrategy(
  value: StrategyValue | undefined,
  productContext: string | null,
): ManualMessageStrategy {
  return {
    primaryObservation: value?.primary_observation ?? productContext ?? "Public product evidence",
    whyNow: value?.why_now ?? "Japan applicability remains unverified",
    japaneseSegment: value?.japanese_segment ?? "Relevant Japanese buyers require validation",
    japanGap: value?.japan_gap ?? "The checked public pages do not yet establish a Japan customer path",
    opportunityAngle: value?.opportunity_angle ?? "Evidence-led Japan validation",
    offerRelevance: value?.offer_relevance ?? "A public-evidence opportunity analysis can test the hypothesis",
    tone: value?.tone ?? "Direct, respectful, and low pressure",
    cta: value?.cta ?? "Permission to share the analysis",
    countryAdaptation: value?.country_adaptation ?? "Business-formal without nationality assumptions",
    prohibitedClaims: value?.prohibited_claims ?? ["Measured demand", "Guaranteed revenue", "Legal conclusions"],
  }
}

export function publicManualMessageCandidate(candidate: CandidateValue): ManualGeneratedMessageCandidate {
  return {
    message: candidate.message.trim(),
    factIds: candidate.fact_ids,
    productEvidence: candidate.product_evidence,
    productEvidenceRendering: candidate.product_evidence_rendering,
    angle: candidate.angle,
    openingStyle: candidate.opening_style,
    diagnosticFocus: candidate.diagnostic_focus,
    ctaType: candidate.cta_type,
    architecture: candidate.architecture,
    personalizationAnchors: candidate.personalization_anchors,
    solutionFocus: candidate.solution_focus,
  }
}

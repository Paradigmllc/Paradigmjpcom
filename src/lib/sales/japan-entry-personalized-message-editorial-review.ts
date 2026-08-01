import type { ManualMessageSimilarityReview } from "./manual-japan-entry-message-similarity"
import type { ManualPersonalizationReview } from "./manual-japan-entry-copy-quality"
import type { JapanEntryMessageReview } from "./japan-entry-personalized-message-review"

export const EDITORIAL_PASS_SCORE = 92
export const EDITORIAL_DIMENSION_FLOOR = 23

export interface ManualEditorialCriticResult {
  product_evidence_faithful: boolean
  scores: {
    specificity: number
    naturalness: number
    credibility: number
    executive_relevance: number
  }
  rationale: string
  risk_flags: string[]
}

export function buildManualEditorialReview(input: {
  selected: {
    safety: { score: number; wordCount: number; factIds: string[] }
    personalization: ManualPersonalizationReview
  }
  criticized: ManualEditorialCriticResult
  attempts: number
  similarity?: ManualMessageSimilarityReview
  candidateCount: number
}): JapanEntryMessageReview {
  const editorial = {
    specificity: input.criticized.scores.specificity,
    naturalness: input.criticized.scores.naturalness,
    credibility: input.criticized.scores.credibility,
    executiveRelevance: input.criticized.scores.executive_relevance,
  }
  const score = Object.values(editorial).reduce((sum, value) => sum + value, 0)
  const riskFlags = input.criticized.risk_flags.filter(
    (flag) => !/(?:abrupt pricing|price placement|pricing insertion|generic (?:call to action|cta)|shallow product|flow|tone|style)/i.test(flag),
  )
  const evidenceFaithful = input.criticized.product_evidence_faithful
  const passed = score >= EDITORIAL_PASS_SCORE
    && Object.values(editorial).every((value) => value >= EDITORIAL_DIMENSION_FLOOR)
    && riskFlags.length === 0
    && evidenceFaithful
    && input.selected.personalization.passed
  const issues = [
    ...(score < EDITORIAL_PASS_SCORE || Object.values(editorial).some((value) => value < EDITORIAL_DIMENSION_FLOOR) || riskFlags.length > 0
      ? [`DeepSeek V4 Pro editorial score did not meet the ${EDITORIAL_PASS_SCORE}/100 production quality bar`]
      : []),
    ...(!evidenceFaithful
      ? ["DeepSeek V4 Pro did not verify the English product-evidence rendering as faithful to the public source phrase"]
      : []),
    ...input.selected.personalization.issues,
  ]
  return {
    score,
    safetyScore: input.selected.safety.score,
    passed,
    issues: passed ? [] : issues,
    wordCount: input.selected.safety.wordCount,
    observedFactIds: input.selected.safety.factIds,
    model: "deepseek-v4-pro",
    attempts: input.attempts,
    editorialScores: editorial,
    rationale: input.criticized.rationale,
    riskFlags,
    uniquenessScore: Math.round((1 - (input.similarity?.maxSimilarity ?? 0)) * 100),
    maxSimilarity: input.similarity?.maxSimilarity ?? 0,
    matchedMessageId: input.similarity?.matchedMessageId ?? null,
    candidateCount: input.candidateCount,
    personalization: input.selected.personalization,
  }
}

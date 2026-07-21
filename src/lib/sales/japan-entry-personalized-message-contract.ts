import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options"
import type { ManualMessageAngle } from "./manual-japan-entry-angle"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const EVIDENCE_STOP_WORDS = new Set([
  "a", "an", "and", "any", "for", "from", "in", "into", "of", "or", "the", "to", "with",
])

const PRODUCT_OUTCOME_CLAIM_RE = /(?:\b(?:boost|maximi[sz]e|increase|generate|grow|scale|transform|accelerate|improve|enhance|drive)\b.{0,90}\b(?:conversion|conversions|sales|revenue|profit|growth|performance|results?|subscribers?|shoppers?|customers?|users?|audience)\b|\b(?:conversion|conversions|sales|revenue|profit|growth|performance|subscribers?|shoppers?|customers?|users?|audience)\b.{0,70}\b(?:boost|increase|maximi[sz]e|generate|grow|scale|transform|accelerate|improve|enhance|drive)\b|\bhelp you scale\b)/i
const CASE_STUDY_HEADING_RE = /(?:\s+x\s+|:\s*$|^case stud(?:y|ies)\b)/i
const PROMOTIONAL_QUALIFIER_RE = /\b(?:free|significantly|effectively|effortlessly|seamlessly|powerfully)\b/i
const FORM_COPY_UNSAFE_EVIDENCE_RE = /(?:https?:\/\/|www\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b|\b(?:attached|attachment|downloadable|download|unlock(?:ed|s|ing)?|ROI|return on investment|revenue|guarantee(?:d|s|ing)?)\b)/i
const CUSTOMER_QUOTE_RE = /(?:\b(?:I|we|our|my|I've|we've)\b|trusted by|definitely recommended|absolutely love)/i

function evidenceToken(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (normalized.endsWith("ies") && normalized.length > 5) return `${normalized.slice(0, -3)}y`
  if (normalized.endsWith("ing") && normalized.length > 6) return normalized.slice(0, -3)
  if (normalized.endsWith("es") && normalized.length > 5) return normalized.slice(0, -2)
  if (normalized.endsWith("s") && normalized.length > 4) return normalized.slice(0, -1)
  return normalized
}

function evidenceTokens(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/i)
    .map(evidenceToken)
    .filter((token) => token.length >= 3 && !EVIDENCE_STOP_WORDS.has(token))
}

export function isGroundedProductEvidence(productContext: string, productEvidence: string): boolean {
  const context = productContext.toLowerCase()
  const evidence = productEvidence.trim().toLowerCase()
  if (evidence.length < 3) return false
  if (context.includes(evidence)) return true
  const evidenceTerms = [...new Set(evidenceTokens(evidence))]
  if (evidenceTerms.length < 4) return false
  const contextTerms = new Set(evidenceTokens(context))
  const covered = evidenceTerms.filter((term) => contextTerms.has(term)).length
  return covered / evidenceTerms.length >= 0.8
}

function cleanEvidenceSegment(value: string, companyName: string): string {
  const company = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return value
    .replace(new RegExp(`^${company}\\s+(?:provides?|offers?|builds?|creates?|makes?|is)\\s+`, "i"), "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .replace(/^[\s"'“”‘’|,:;–—-]+|[\s"'“”‘’|,:;–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function exactCapabilityClauses(value: string): string[] {
  const clauses: string[] = []
  const patterns = [
    /\b(?:where|that)\s+you\s+can\s+(.+?)(?=,\s+(?:all|while|so)\b|[.!?]|$)/gi,
    /\b(?:lets?|allows?|enables?)\s+(?:you|customers?|users?)\s+to\s+(.+?)(?=,\s+(?:all|while|so)\b|[.!?]|$)/gi,
  ]
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const clause = match[1]?.trim().replace(/[,:;\s]+$/g, "")
      if (clause) clauses.push(clause)
    }
  }
  return clauses
}

function productEvidenceCandidates(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string[] {
  const productNames = new Set((input.productNames ?? []).map((name) => name.trim().toLowerCase()))
  return input.productContext
    .split(/\s*\|\s*|\n+|(?<=[.!?])\s+/)
    .map((value) => cleanEvidenceSegment(value, input.companyName))
    .flatMap((value) => [value, ...exactCapabilityClauses(value)])
    .filter((value) => value.length >= 12 && value.length <= 180)
    .filter((value) => !/\d/.test(value))
    .filter((value) => !/\b(?:best|faster|fastest|leading|developers? love|ready to ship|game[- ]changer|award[- ]winning)\b/i.test(value))
    .filter((value) => !/\b(?:for free|whole lot more)\b/i.test(value))
    .filter((value) => !PRODUCT_OUTCOME_CLAIM_RE.test(value))
    .filter((value) => !FORM_COPY_UNSAFE_EVIDENCE_RE.test(value))
    .filter((value) => !CUSTOMER_QUOTE_RE.test(value))
    .filter((value) => !CASE_STUDY_HEADING_RE.test(value))
    .filter((value) => !PROMOTIONAL_QUALIFIER_RE.test(value))
    .filter((value) => !productNames.has(value.toLowerCase()))
    .filter((value) => evidenceTokens(value).length >= 4)
}

export function isInitialInterestProductEvidenceSafe(value: string): boolean {
  return value.trim().length >= 3
    && !FORM_COPY_UNSAFE_EVIDENCE_RE.test(value)
    && !PRODUCT_OUTCOME_CLAIM_RE.test(value)
    && !PROMOTIONAL_QUALIFIER_RE.test(value)
}

function primaryEvidenceScore(value: string): number {
  const terms = evidenceTokens(value).length
  const descriptiveBonus = /\bai-powered\b/i.test(value)
    ? 16
    : /\b(?:conversion|workflow|platform|software|supports?|integrates?|enables?)\b/i.test(value) ? 10 : 0
  const imperativePenalty = /^(?:convert|build|get|try|start|ready)\b/i.test(value) ? 8 : 0
  return terms + descriptiveBonus - imperativePenalty
}

function rankedProductEvidenceCandidates(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string[] {
  return productEvidenceCandidates(input)
    .map((value, index) => ({ value, index, score: primaryEvidenceScore(value) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.value)
}

export function selectGroundedProductEvidence(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string {
  return rankedProductEvidenceCandidates(input)[0] ?? input.productContext.trim().slice(0, 180)
}

export function selectSupplementalProductEvidence(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string | null {
  return rankedProductEvidenceCandidates(input)[1] ?? null
}

function firstFactId(facts: JapanEntryPersonalizationFact[], predicate: (fact: JapanEntryPersonalizationFact) => boolean): string | undefined {
  return facts.find(predicate)?.id
}

export function initialInterestFactContract(input: {
  facts: JapanEntryPersonalizationFact[]
  options: JapanEntryInitialInterestOptions
  angle: ManualMessageAngle
}): { requiredFactIds: string[]; allowedFactIds: string[] } {
  const auditId = firstFactId(input.facts, (fact) => fact.id.startsWith("japan-audit-"))
  const required = [
    input.options.includeEstimate ? firstFactId(input.facts, (fact) => fact.id === "modeled-global-monthly-visit-range") : undefined,
    input.options.includeEstimate ? firstFactId(input.facts, (fact) => fact.id === "modeled-annual-opportunity-range") : undefined,
    auditId,
    input.angle === "competitor" ? firstFactId(input.facts, (fact) => fact.id.startsWith("verified-competitor-")) : undefined,
    input.angle === "mockup" ? firstFactId(input.facts, (fact) => fact.id === "prepared-positioning-concept") : undefined,
  ].filter((id): id is string => Boolean(id))
  const unique = [...new Set(required)].slice(0, 4)
  return { requiredFactIds: unique, allowedFactIds: unique }
}

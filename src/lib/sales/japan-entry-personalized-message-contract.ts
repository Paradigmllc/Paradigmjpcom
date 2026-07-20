import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options"
import type { ManualMessageAngle } from "./manual-japan-entry-angle"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const EVIDENCE_STOP_WORDS = new Set([
  "a", "an", "and", "any", "for", "from", "in", "into", "of", "or", "the", "to", "with",
])

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

function productEvidenceCandidates(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string[] {
  const productNames = new Set((input.productNames ?? []).map((name) => name.trim().toLowerCase()))
  return input.productContext
    .split(/\s*\|\s*|\n+|(?<=[.!?])\s+/)
    .map((value) => cleanEvidenceSegment(value, input.companyName))
    .filter((value) => value.length >= 12 && value.length <= 180)
    .filter((value) => !productNames.has(value.toLowerCase()))
    .filter((value) => evidenceTokens(value).length >= 4)
}

export function selectGroundedProductEvidence(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string {
  return productEvidenceCandidates(input)[0] ?? input.productContext.trim().slice(0, 180)
}

export function selectSupplementalProductEvidence(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string | null {
  return productEvidenceCandidates(input)[1] ?? null
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

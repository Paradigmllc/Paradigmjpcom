import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options"
import type { ManualMessageAngle } from "./manual-japan-entry-angle"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const EVIDENCE_STOP_WORDS = new Set([
  "a", "an", "and", "any", "for", "from", "in", "into", "of", "or", "the", "to", "with",
])

const PRODUCT_OUTCOME_CLAIM_RE = /(?:\b(?:boost|maximi[sz]e|increase|generate|grow|scale|transform|accelerate|improve|enhance|drive)\b.{0,90}\b(?:conversion|conversions|sales|revenue|profit|growth|performance|results?|subscribers?|shoppers?|customers?|users?|audience)\b|\b(?:conversion|conversions|sales|revenue|profit|growth|performance|subscribers?|shoppers?|customers?|users?|audience)\b.{0,70}\b(?:boost|increase|maximi[sz]e|generate|grow|scale|transform|accelerate|improve|enhance|drive)\b|\bhelp you scale\b)/i
const CASE_STUDY_HEADING_RE = /(?:\s+x\s+|:\s*$|^case stud(?:y|ies)\b)/i
const PROMOTIONAL_QUALIFIER_RE = /\b(?:free|significantly|effectively|effortlessly|seamlessly|powerfully|with confidence)\b/i
const FORM_COPY_UNSAFE_EVIDENCE_RE = /(?:https?:\/\/|www\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b|\b(?:attached|attachment|downloadable|download|unlock(?:ed|s|ing)?|ROI|return on investment|revenue|guarantee(?:d|s|ing)?)\b)/i
const CUSTOMER_QUOTE_RE = /(?:\b(?:I|we|our|my|I've|we've)\b|trusted by|definitely recommended|absolutely love)/i
const UNRESOLVED_PUBLIC_TEXT_RE = /(?:\[[^\]\n]{1,80}\]|\{[^{}\n]{1,80}\}|<[^<>\n]{1,80}>|&(?:hellip|nbsp|amp);)/i
const PUBLIC_BOILERPLATE_RE = /(?:reCAPTCHA|privacy policy|terms of service|cookie policy|all rights reserved|accept all cookies|cookie settings|skip to (?:main )?content|navigation menu|javascript (?:is|required|disabled)|display\s*:\s*none|visibility\s*:\s*hidden|aria-hidden|window\.innerWidth|screen size|hidden (?:text|when|on)|teks ini|akan tersembunyi|ketika ukuran|politique de confidentialit[ée]|pol[ií]tica de privacidad|datenschutz(?:erkl[aä]rung)?)/i
const PUBLIC_ACTION_CTA_RE = /^(?:book|schedule|request)\s+(?:a|an|your)?\s*(?:demo|consultation|call|meeting)|^(?:get started|start (?:a )?(?:free )?trial|sign up|contact sales|talk to sales|learn more|shop now|buy now|order now|join now|apply now|register now)\b/i
const PRODUCT_IMPERATIVE_RE = /^(?:analy[sz]e|automate|build|convert|create|discover|explore|generate|get|identify|integrate|leverage|make|manage|start|track|transform|try|turn|use)\b/i
const IMPERATIVE_NOMINALIZATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^analy[sz]e\s+(.+)$/i, "analysis of "],
  [/^automate\s+(.+)$/i, "automation of "],
  [/^build\s+(.+)$/i, "building "],
  [/^convert\s+(.+)$/i, "conversion of "],
  [/^create\s+(.+)$/i, "creation of "],
  [/^discover\s+(.+)$/i, "discovery of "],
  [/^explore\s+(.+)$/i, "analysis of "],
  [/^generate\s+(.+)$/i, "generation of "],
  [/^get\s+(.+)$/i, "access to "],
  [/^identify\s+(.+)$/i, "identification of "],
  [/^integrate\s+(.+)$/i, "integration of "],
  [/^leverage\s+(.+)$/i, "use of "],
  [/^make\s+(.+)$/i, "creation of "],
  [/^manage\s+(.+)$/i, "management of "],
  [/^start\s+(.+)$/i, "starting "],
  [/^track\s+(.+)$/i, "tracking "],
  [/^transform\s+(.+)$/i, "transformation of "],
  [/^try\s+(.+)$/i, "evaluation of "],
  [/^turn\s+(.+)$/i, "conversion of "],
  [/^use\s+(.+)$/i, "use of "],
]

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
    .replace(new RegExp(`^(?:ible\\s+)?${company}\\s*(?:[–—:-]\\s*)`, "i"), "")
    .replace(new RegExp(`^${company}\\s+(?:provides?|offers?|builds?|creates?|makes?|integrates?|measures?|works?|is)\\s+`, "i"), "")
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

function repeatsCompanyOrProductAnchor(value: string, anchors: string[]): boolean {
  return anchors.some((anchor) => {
    const normalized = anchor.trim()
    if (!normalized) return false
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return (value.match(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "giu"))?.length ?? 0) > 1
  })
}

function productEvidenceCandidates(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string[] {
  const productNames = new Set((input.productNames ?? []).map((name) => name.trim().toLowerCase()))
  const copyAnchors = [input.companyName, ...(input.productNames ?? [])]
  return input.productContext
    .split(/\s*\|\s*|\n+|(?<=[.!?])\s+/)
    .map((value) => cleanEvidenceSegment(value, input.companyName))
    .flatMap((value) => [value, ...exactCapabilityClauses(value)])
    .filter((value) => value.length >= 12 && value.length <= 180)
    .filter((value) => !/\d/.test(value))
    .filter((value) => !/\b(?:best|faster|fastest|leading|developers? love|ready to ship|game[- ]changer|award[- ]winning)\b/i.test(value))
    .filter((value) => !/\b(?:for free|whole lot more)\b/i.test(value))
    .filter((value) => !/\b(?:product is unavailable|choose a different combination|sold out|out of stock)\b/i.test(value))
    .filter((value) => !PRODUCT_OUTCOME_CLAIM_RE.test(value))
    .filter((value) => !FORM_COPY_UNSAFE_EVIDENCE_RE.test(value))
    .filter((value) => !CUSTOMER_QUOTE_RE.test(value))
    .filter((value) => !CASE_STUDY_HEADING_RE.test(value))
    .filter((value) => !PROMOTIONAL_QUALIFIER_RE.test(value))
    .filter((value) => !UNRESOLVED_PUBLIC_TEXT_RE.test(value))
    .filter((value) => !PUBLIC_BOILERPLATE_RE.test(value))
    .filter((value) => !PUBLIC_ACTION_CTA_RE.test(value))
    .filter((value) => !repeatsCompanyOrProductAnchor(value, copyAnchors))
    .filter((value) => !productNames.has(value.toLowerCase()))
    .filter((value) => evidenceTokens(value).length >= 3)
}

export function isInitialInterestProductEvidenceSafe(value: string): boolean {
  return value.trim().length >= 3
    && value.trim().length <= 180
    && !FORM_COPY_UNSAFE_EVIDENCE_RE.test(value)
    && !PRODUCT_OUTCOME_CLAIM_RE.test(value)
    && !PROMOTIONAL_QUALIFIER_RE.test(value)
    && !UNRESOLVED_PUBLIC_TEXT_RE.test(value)
    && !PUBLIC_BOILERPLATE_RE.test(value)
    && !PUBLIC_ACTION_CTA_RE.test(value)
}

export function shouldPreserveProductEvidenceAsRendering(value: string): boolean {
  return !PRODUCT_IMPERATIVE_RE.test(value.trim())
}

export function renderInitialInterestProductEvidence(value: string): string {
  const trimmed = value.trim()
  for (const [pattern, prefix] of IMPERATIVE_NOMINALIZATIONS) {
    const object = trimmed.match(pattern)?.[1]
    if (object) return `${prefix}${object}`
  }
  return trimmed
}

export function renderSupplementalProductEvidence(value: string | null, companyName: string): string | null {
  if (!value) return null
  const companyPattern = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return renderInitialInterestProductEvidence(value)
    .replace(new RegExp(`integration of ${companyPattern} with`, "gi"), "integration with")
    .replace(/\byour existing\b/gi, "existing")
}

function primaryEvidenceScore(value: string): number {
  const terms = evidenceTokens(value).length
  const descriptiveBonus = /\bai-powered\b/i.test(value)
    ? 16
    : /\b(?:customer preferences?|behavio(?:u)?ral trends?|purchase history|analytics?)\b/i.test(value)
      ? 14
      : /\b(?:conversion|workflow|platform|software|product|purifier|supports?|integrates?|enables?)\b/i.test(value) ? 10 : 0
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

function shortGroundedEvidenceFallback(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string | null {
  const excludedNames = new Set([
    input.companyName.trim().toLowerCase(),
    ...(input.productNames ?? []).map((name) => name.trim().toLowerCase()),
  ])
  return input.productContext
    .split(/\s*\|\s*|\n+|(?<=[.!?])\s+/)
    .map((value) => cleanEvidenceSegment(value, input.companyName))
    .find((value) => (
      value.length >= 12
      && value.length <= 180
      && evidenceTokens(value).length >= 2
      && !excludedNames.has(value.toLowerCase())
      && !repeatsCompanyOrProductAnchor(value, [input.companyName, ...(input.productNames ?? [])])
      && isInitialInterestProductEvidenceSafe(value)
    )) ?? null
}

export function selectGroundedProductEvidence(input: {
  companyName: string
  productContext: string
  productNames?: string[]
}): string {
  return rankedProductEvidenceCandidates(input)[0]
    ?? shortGroundedEvidenceFallback(input)
    ?? input.productContext.trim().slice(0, 180)
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

import type { ManualCtaContract } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { manualProductDecisionSubject } from "./manual-japan-entry-product-subject"

const BODY_MIN_WORDS = 90
const SAFE_FINISH_ISSUE = /^(?:The company name must appear no more than twice|The product name must appear no more than twice|The exact product-evidence phrase must appear once|The faithful English product-evidence rendering is missing from the message|The opening product section must contain the company or exact product name and faithful English product-evidence rendering|The message contains an unnatural pronoun bridge|Mechanical exact-evidence CTA language is prohibited|Message must be \d+-\d+ words|The message contains a broken possessive created by anchor reduction|An unpublished positioning concept must not be claimed unless its stored fact is selected|The opening must describe the company's product without conflating the company with its product category)/

interface RecoverableCandidate {
  message: string
  fact_ids: string[]
  product_evidence_rendering: string
  cta_type: string
}

interface CandidateInspection {
  safety: { passed: boolean; score: number }
  similarity: { passed: boolean; maxSimilarity: number }
}

export function canSafelyFinishManualModelCopy(input: {
  issues: string[]
  similarityPassed: boolean
}): boolean {
  return input.similarityPassed
    && input.issues.length > 0
    && input.issues.every((issue) => SAFE_FINISH_ISSUE.test(issue))
}

export function canUseManualDeterministicRecovery(input: {
  allowRecovery: boolean
  similarityPassed: boolean
}): boolean {
  // Recovery rebuilds the middle copy from selected public facts when similarity
  // failed, then the full safety and distinctness reviews run again. Blocking the
  // rebuild here left the model in a repair loop even though the deterministic
  // path is explicitly designed to discard duplicated cross-company sentences.
  return input.allowRecovery
}

function inspectionRank(value: CandidateInspection): number {
  return Number(value.safety.passed) * 1000
    + Number(value.similarity.passed) * 500
    + value.safety.score
    - value.similarity.maxSimilarity * 100
}

export function selectBestManualCandidateInspection<T extends CandidateInspection>(
  candidateAt: (variationIndex: number) => T,
  limit = 8,
): T {
  let best = candidateAt(0)
  for (let variationIndex = 1; variationIndex < limit && (!best.safety.passed || !best.similarity.passed); variationIndex += 1) {
    const alternative = candidateAt(variationIndex)
    if (inspectionRank(alternative) > inspectionRank(best)) best = alternative
  }
  return best
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function productOpening(input: {
  companyName: string
  productNames: string[]
  rendering: string
  variationIndex?: number
}): string {
  const rendering = input.rendering.trim()
  const quotedRendering = `“${rendering}”${/[.!?]$/.test(rendering) ? "" : "."}`
  const renderingIncludesCompany = rendering.toLowerCase().includes(input.companyName.toLowerCase())
  const variants = renderingIncludesCompany
    ? [
        `The public product description states ${quotedRendering}`,
        `The product page presents ${quotedRendering}`,
        `The documented product description is ${quotedRendering}`,
        `The public product wording is ${quotedRendering}`,
      ]
    : [
        `${input.companyName} documents ${quotedRendering}`,
        `${input.companyName}'s product page states ${quotedRendering}`,
        `${input.companyName} presents ${quotedRendering}`,
        `For ${input.companyName}, the product description is ${quotedRendering}`,
      ]
  return variants[(stableHash(`${input.companyName}:${rendering}`) + (input.variationIndex ?? 0)) % variants.length]!
}

function selectedFacts(candidate: RecoverableCandidate, facts: JapanEntryPersonalizationFact[]): JapanEntryPersonalizationFact[] {
  const ids = new Set(candidate.fact_ids)
  return facts.filter((fact) => ids.has(fact.id))
}

function wordCount(paragraphs: string[]): number {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length
}

function limitAnchorOccurrences(paragraphs: string[], anchor: string, replacement: string): string[] {
  const normalized = anchor.trim()
  if (!normalized) return paragraphs
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(['’](?:s)?)?(?=$|[^\\p{L}\\p{N}])`, "giu")
  const finalIndex = paragraphs.length - 1
  let keptBodyAnchor = false
  let keptFinalAnchor = false
  return paragraphs.map((paragraph, paragraphIndex) => paragraph.replace(
    pattern,
    (match, prefix: string, _value: string, possessive: string | undefined, offset: number) => {
      if (paragraphIndex === finalIndex && !keptFinalAnchor) {
        keptFinalAnchor = true
        return match
      }
      if (!keptBodyAnchor) {
        keptBodyAnchor = true
        return match
      }
      const sentenceStart = offset === 0 || /[.!?]\s*$/.test(paragraph.slice(0, offset))
      if (possessive) return `${prefix}${sentenceStart ? "Its" : "its"}`
      return `${prefix}${sentenceStart ? replacement[0]?.toUpperCase() ?? "" : replacement[0]?.toLowerCase() ?? ""}${replacement.slice(1)}`
    },
  ))
}

export function recoverManualInitialInterestCandidate<T extends RecoverableCandidate>(input: {
  candidate: T
  companyName: string
  productNames?: string[]
  facts: JapanEntryPersonalizationFact[]
  supplementalProductEvidence?: string | null
  customerPathAnchor: string
  contract: ManualCtaContract
  issues: string[]
  similarityPassed: boolean
  variationIndex?: number
}): T {
  if (input.issues.length === 0 && input.similarityPassed) return input.candidate
  const facts = selectedFacts(input.candidate, input.facts)
  const subject = manualProductDecisionSubject({
    rendering: input.candidate.product_evidence_rendering,
    companyName: input.companyName,
    productNames: input.productNames ?? [],
  })
  const requiredAnchor = input.productNames?.map((name) => name.trim()).find(Boolean) ?? input.companyName
  const subjectWithArticle = /^(?:analysis|automation|conversion|generation|integration|management|tracking|use)\b/i.test(subject)
    ? `the ${subject}`
    : subject
  const opening = productOpening({
    companyName: input.companyName,
    productNames: input.productNames ?? [],
    rendering: input.candidate.product_evidence_rendering,
    variationIndex: input.variationIndex,
  })
  const auditParagraphs = facts
    .filter((fact) => fact.id.startsWith("japan-audit-"))
    .slice(0, 2)
    .map((fact) => fact.statement)
  if (auditParagraphs.length === 0) {
    auditParagraphs.push(`The checked public pages did not show a ${input.customerPathAnchor} customer path.`)
  }
  const nonAuditStatements = facts
    .filter((fact) => !fact.id.startsWith("japan-audit-"))
    .map((fact) => fact.id === "prepared-positioning-concept"
      ? "A draft Japanese positioning concept has been prepared from the documented product wording and remains unpublished."
      : fact.statement)
  const decisionParagraph = [
    ...nonAuditStatements,
    `The open decision is which ${input.customerPathAnchor} customer-path test should cover ${subjectWithArticle} before broader localization is considered.`,
    "The public-page finding does not establish demand, adoption, or commercial performance; each remains unverified.",
    "No wider investment conclusion follows from the audit alone.",
  ].join(" ")
  const question = input.contract.ctaType === "founder_forward"
    ? `Would the ${requiredAnchor} founder or international-growth owner be the right person to review that customer-path decision?`
    : input.contract.ctaType === "right_person"
      ? `Who at ${requiredAnchor} owns that customer-path decision?`
      : `May I send it to the ${requiredAnchor} team before that customer-path decision is made?`
  const ctaParagraph = `I can prepare a Japan opportunity analysis focused on one ${input.customerPathAnchor} test of ${subjectWithArticle}. ${question}`
  let boundedBody = [opening, ...auditParagraphs, decisionParagraph, ctaParagraph]
  while (wordCount(boundedBody) < BODY_MIN_WORDS) {
    boundedBody[boundedBody.length - 2] = `${boundedBody.at(-2)} Direct market evidence would still be required before any broader commitment.`
  }
  boundedBody = limitAnchorOccurrences(boundedBody, input.companyName, "it")
  for (const productName of input.productNames ?? []) {
    if (productName.trim().toLowerCase() === input.companyName.trim().toLowerCase()) continue
    boundedBody = limitAnchorOccurrences(boundedBody, productName, "the product")
  }
  return {
    ...input.candidate,
    cta_type: input.contract.ctaType,
    message: [manualFormGreeting(input.companyName), ...boundedBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

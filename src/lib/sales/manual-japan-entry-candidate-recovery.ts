import { applyManualCtaContract, type ManualCtaContract } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { manualProductDecisionSubject } from "./manual-japan-entry-product-subject"

const BODY_MIN_WORDS = 75
const SAFE_FINISH_ISSUE = /^(?:The company name must appear no more than twice|The product name must appear no more than twice|The exact product-evidence phrase must appear once|The faithful English product-evidence rendering is missing from the message|The opening product section must contain the company or exact product name and faithful English product-evidence rendering|The message contains an unnatural pronoun bridge|Mechanical exact-evidence CTA language is prohibited|Message must be \d+-\d+ words|The message contains a broken possessive created by anchor reduction|An unpublished positioning concept must not be claimed unless its stored fact is selected|The opening must describe the company's product without conflating the company with its product category)/
const DANGEROUS_SENTENCE = /(?:https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:attached|attachment|downloadable|download)\b|\bunlock\b|\b(?:guarantee(?:d|s|ing)?|ROI|return on investment)\b)/i
const UNSUPPORTED_CAUSAL_SENTENCE = /(?:\bpotentially\b|may (?:cause|limit|affect)|might overlook|could (?:cause|be (?:a )?barrier)|caus(?:e|es|ing)|early exit|drop[- ]?off|abandon(?:ment|ed|ing)?|creates? friction|affects? conversion|lost (?:sale|sales|revenue)|buyer support|Japanese-language touchpoints|(?:details|gaps|options|features).{0,80}(?:decide|determine|influence).{0,80}(?:purchas|buy|checkout|convert|complete))/i
const PROMOTIONAL_SENTENCE = /(?:logical next step|given that reach|i noticed your site|untapped|huge opportunity|game.changer|revolutionary|impressive|interesting detail|well presented|global potential|missed opportunity|emerging applications|\b(?:is|provides?|offers?) (?:a )?clear value\b|\bis valuable\b|position(?:s|ed|ing)? .{0,40} uniquely|uniquely position(?:s|ed|ing)?|stands? out|stood out|aligns well|real need|many japanese|critical to (?:building|build)|capture (?:part of|the|that traffic)|tailored roadmap|data-driven approach|based in Tokyo|lead Japan market entry|consultancy|optimi[sz]e stock|reduce waste|with confidence|likely bounce|creates uncertainty)/i
const EARLY_SENDER_ANALYSIS_SENTENCE = /\b(?:Japan opportunity analysis|Japan (?:entry|launch) brief|opportunity snapshot|(?:an?|the|this|that|our) (?:analysis|brief|snapshot)|(?:analysis|brief|snapshot) (?:would|can|could|will|stays?|remains?|covers?|focuses?))\b/i
const UNRESOLVED_SENTENCE = /(?:\[[^\]\n]{1,80}\]|\{[^{}\n]{1,80}\}|<[^<>\n]{1,80}>|&(?:hellip|nbsp|amp);)/i
const UNNATURAL_PRONOUN_SENTENCE = /\b(?:for|from|around|within) it,\s+(?:the|an?|that|this|one)\b/i
const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "with"])

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

function blocks(message: string): string[] {
  return message
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function bodyBlocks(message: string): string[] {
  const output = blocks(message)
  if (/^hello\b/i.test(output[0] ?? "")) output.shift()
  if (/(?:best|kind|warm) regards/i.test(output.at(-1) ?? "")) output.pop()
  return output
}

function paragraphSentences(paragraphs: string[]): string[] {
  return paragraphs.flatMap((paragraph) => paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean))
}

function sentenceTokens(value: string): Set<string> {
  return new Set(value.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))
}

function tooSimilar(left: string, right: string): boolean {
  const leftTokens = sentenceTokens(left)
  const rightTokens = sentenceTokens(right)
  if (leftTokens.size < 5 || rightTokens.size < 5) return false
  let overlap = 0
  for (const token of leftTokens) if (rightTokens.has(token)) overlap += 1
  return overlap / Math.min(leftTokens.size, rightTokens.size) >= 0.74
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function safeSentences(paragraphs: string[], input: {
  removeRevenue: boolean
  removeUnsupportedCausal: boolean
  removePromotional: boolean
}): string[] {
  const accepted: string[] = []
  for (const paragraph of paragraphs) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean)
    for (const sentence of sentences) {
      if (DANGEROUS_SENTENCE.test(sentence)) continue
      if (input.removeRevenue && /\brevenue\b/i.test(sentence)) continue
      if (input.removeUnsupportedCausal && UNSUPPORTED_CAUSAL_SENTENCE.test(sentence)) continue
      if (input.removePromotional && PROMOTIONAL_SENTENCE.test(sentence)) continue
      if (UNRESOLVED_SENTENCE.test(sentence)) continue
      if (UNNATURAL_PRONOUN_SENTENCE.test(sentence)) continue
      if (accepted.some((prior) => tooSimilar(sentence, prior))) continue
      accepted.push(sentence)
    }
  }
  return accepted
}

function productOpening(input: {
  companyName: string
  productNames: string[]
  rendering: string
  variationIndex?: number
}): string {
  const rendering = input.rendering.trim()
  // The deterministic evidence contract is byte-for-byte: terminal punctuation
  // is part of the public phrase. Keep it inside the quotation and only add a
  // sentence stop when the source phrase does not already provide one.
  const quotedRendering = `“${rendering}”${/[.!?]$/.test(rendering) ? "" : "."}`
  const productName = input.productNames.map((name) => name.trim()).find((name) => (
    name
    && name.toLowerCase() !== input.companyName.trim().toLowerCase()
    && !name.toLowerCase().includes(input.companyName.trim().toLowerCase())
    && !rendering.toLowerCase().includes(name.toLowerCase())
  ))
  const subject = productName ?? "its offering"
  const renderingIncludesCompany = rendering.toLowerCase().includes(input.companyName.toLowerCase())
  const variants = renderingIncludesCompany
    ? [
        `The public product description uses the phrase ${quotedRendering} For Japan, the open product question concerns the customer path around that documented capability.`,
        `The checked product page describes the offering as ${quotedRendering} The Japan-specific issue is whether its current customer path has a localized evaluation route.`,
        `The product page defines the offering with ${quotedRendering} The relevant Japan question concerns the customer path for that existing proposition.`,
        `The public description centers on ${quotedRendering} For Japan, the open question is how that proposition maps to a Japanese customer path.`,
      ]
    : [
        `${input.companyName} publicly describes ${subject} with the phrase ${quotedRendering} The product-specific Japan question concerns the customer path around that existing proposition.`,
        `For ${subject}, ${input.companyName} documents the phrase ${quotedRendering} The Japan-specific issue is whether its current customer path has a localized evaluation route.`,
        `In its public product description, ${input.companyName} defines ${subject} around ${quotedRendering} The corresponding Japan question concerns the customer path for that existing proposition.`,
        `${input.companyName} presents ${subject} through the description ${quotedRendering} For Japan, the open question is how that proposition maps to a Japanese customer path.`,
      ]
  return variants[(stableHash(`${input.companyName}:${rendering}`) + (input.variationIndex ?? 0)) % variants.length]!
}

function selectedFacts(candidate: RecoverableCandidate, facts: JapanEntryPersonalizationFact[]): JapanEntryPersonalizationFact[] {
  const ids = new Set(candidate.fact_ids)
  return facts.filter((fact) => ids.has(fact.id))
}

function includesFactAnchor(value: string, fact: JapanEntryPersonalizationFact): boolean {
  const normalized = value.toLowerCase()
  return fact.anchors.some((anchor) => anchor.trim().length >= 4 && normalized.includes(anchor.trim().toLowerCase()))
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

  const currentBody = bodyBlocks(input.candidate.message)
  const originalMiddle = input.similarityPassed ? currentBody.slice(1, -1) : []
  const rebuildOpening = !input.similarityPassed || input.issues.some((issue) => /(?:opening|product evidence|product-context|promotional|causal inference|attached-material|Revenue wording|numeric claims|Repeated|template placeholder|pronoun bridge)/i.test(issue))
  const opening = rebuildOpening || !currentBody[0]
    ? productOpening({
        companyName: input.companyName,
        productNames: input.productNames ?? [],
        rendering: input.candidate.product_evidence_rendering,
        variationIndex: input.variationIndex,
      })
    : currentBody[0]
  const facts = selectedFacts(input.candidate, input.facts)
  const positioningConceptSelected = facts.some((fact) => fact.id === "prepared-positioning-concept")
  const positioningSourcePhrases = facts
    .filter((fact) => fact.id === "prepared-positioning-concept")
    .flatMap((fact) => fact.anchors.slice(1))
    .map((anchor) => anchor.trim().toLowerCase())
    .filter(Boolean)
  const middleSentences = safeSentences(originalMiddle, {
    removeRevenue: input.issues.some((issue) => /Revenue wording is not tied/i.test(issue)),
    removeUnsupportedCausal: input.issues.some((issue) => /Unsupported causal inference/i.test(issue)),
    removePromotional: input.issues.some((issue) => /Generic, promotional/i.test(issue)),
  }).filter((sentence) => (
    !EARLY_SENDER_ANALYSIS_SENTENCE.test(sentence)
    &&
    !positioningSourcePhrases.some((phrase) => sentence.toLowerCase().includes(phrase))
    && (positioningConceptSelected || !/(?:draft|unpublished) Japanese positioning concept|positioning concept.{0,80}remains unpublished/i.test(sentence))
  ))
  const supplemental = input.supplementalProductEvidence?.trim()
  if (
    supplemental
    && !opening.toLowerCase().includes(supplemental.toLowerCase())
    && !supplemental.toLowerCase().includes(input.companyName.trim().toLowerCase())
    && !(input.productNames ?? []).some((name) => supplemental.toLowerCase().includes(name.trim().toLowerCase()))
    && !tooSimilar(supplemental, input.candidate.product_evidence_rendering)
    && !middleSentences.join(" ").toLowerCase().includes(supplemental.toLowerCase())
  ) {
    const renderedSupplemental = /[.!?]$/.test(supplemental) ? supplemental : `${supplemental}.`
    const supplementalVariants = [
      `The same public material also documents “${renderedSupplemental}”`,
      `A separate public capability is “${renderedSupplemental}”`,
      `The public description also includes “${renderedSupplemental}”`,
      `Another documented product point is “${renderedSupplemental}”`,
    ]
    middleSentences.unshift(supplementalVariants[stableHash(`${input.companyName}:${supplemental}`) % supplementalVariants.length]!)
  }
  for (const fact of facts) {
    if (includesFactAnchor(middleSentences.join(" "), fact)) continue
    middleSentences.push(fact.id === "prepared-positioning-concept"
      ? "A draft Japanese positioning concept has been prepared from the documented product wording and remains unpublished."
      : fact.statement)
  }

  const uniqueMiddleSentences: string[] = []
  const openingSentences = paragraphSentences([opening])
  for (const sentence of middleSentences) {
    if (openingSentences.some((openingSentence) => tooSimilar(sentence, openingSentence))) continue
    if (uniqueMiddleSentences.some((prior) => tooSimilar(sentence, prior))) continue
    uniqueMiddleSentences.push(sentence)
  }
  if (uniqueMiddleSentences.length === 0) {
    uniqueMiddleSentences.push(`The public-page review leaves the ${input.customerPathAnchor} decision unverified.`)
  }

  const recovered = applyManualCtaContract({
    ...input.candidate,
    message: [
      manualFormGreeting(input.companyName),
      opening,
      uniqueMiddleSentences.join(" "),
      input.contract.paragraph,
      MANUAL_FORM_SIGNATURE,
    ].join("\n\n"),
  }, input.companyName, input.contract)

  const recoveredBody = bodyBlocks(recovered.message)
  const subject = manualProductDecisionSubject({
    rendering: input.candidate.product_evidence_rendering,
    companyName: input.companyName,
    productNames: input.productNames ?? [],
  })
  const paddingPool = [
    `For the ${subject}, the page review establishes the observed ${input.customerPathAnchor} condition, while its commercial importance still requires validation.`,
    `A practical first decision for the ${subject} is whether to test that customer-path observation before choosing a wider localization scope.`,
    `Any Japan assessment of the ${subject} should keep the documented page condition separate from assumptions that still need direct evidence.`,
    `The ${subject} review can define a focused validation step without presuming Japanese demand, audience response, or a commercial result.`,
    `For this ${subject} decision, the current public material supports a page-level finding, not a forecast about demand or performance.`,
    `A focused check would test the observed ${input.customerPathAnchor} condition before any broader market commitment.`,
    `The immediate question is narrow: whether the documented customer path merits further localization work.`,
    `The evidence can be organized into what the pages establish, what remains unknown, and what a bounded test should resolve.`,
    `That validation choice stays separate from unsupported claims about buyers, conversion, or commercial outcomes.`,
    `The first test can keep the verified product wording separate from Japan assumptions that remain unconfirmed.`,
    `The next decision is not a full launch; it is whether the observed customer-path condition deserves direct validation.`,
  ]
  const offset = (stableHash(`${input.companyName}:${subject}:${input.customerPathAnchor}:padding`) + (input.variationIndex ?? 0)) % paddingPool.length
  const padding = [...paddingPool.slice(offset), ...paddingPool.slice(0, offset)]
  const existingSentences = paragraphSentences(recoveredBody)
  for (const sentence of padding) {
    if (wordCount(recoveredBody) >= BODY_MIN_WORDS) break
    if (existingSentences.some((existing) => tooSimilar(sentence, existing))) continue
    recoveredBody[1] = `${recoveredBody[1] ?? ""} ${sentence}`.trim()
    existingSentences.push(sentence)
  }

  const requiredAnchor = input.productNames?.map((name) => name.trim()).find(Boolean) ?? input.companyName
  const ctaIndex = recoveredBody.length - 1
  recoveredBody[ctaIndex] = `I can prepare a Japan opportunity analysis for ${requiredAnchor}, focused on a bounded test of the ${subject} using the ${input.customerPathAnchor} finding. ${input.contract.question}`
  let boundedBody = limitAnchorOccurrences(recoveredBody, input.companyName, "it")
  for (const productName of input.productNames ?? []) {
    if (productName.trim().toLowerCase() === input.companyName.trim().toLowerCase()) continue
    boundedBody = limitAnchorOccurrences(boundedBody, productName, "the product")
  }
  const faithfulRendering = input.candidate.product_evidence_rendering.trim()
  if (faithfulRendering && !boundedBody.join(" ").toLowerCase().includes(faithfulRendering.toLowerCase())) {
    boundedBody[0] = productOpening({
      companyName: input.companyName,
      productNames: input.productNames ?? [],
      rendering: faithfulRendering,
      variationIndex: input.variationIndex,
    })
  }
  boundedBody = limitAnchorOccurrences(boundedBody, faithfulRendering, "the documented offering")
  return {
    ...recovered,
    message: [manualFormGreeting(input.companyName), ...boundedBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

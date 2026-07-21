import { applyManualCtaContract, type ManualCtaContract } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const BODY_MIN_WORDS = 120
const DANGEROUS_SENTENCE = /(?:https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:attached|attachment|downloadable|download)\b|\bunlock\b|\b(?:guarantee(?:d|s|ing)?|ROI|return on investment)\b)/i
const UNSUPPORTED_CAUSAL_SENTENCE = /(?:\bpotentially\b|may (?:cause|limit|affect)|might overlook|could (?:cause|be (?:a )?barrier)|caus(?:e|es|ing)|early exit|drop[- ]?off|abandon(?:ment|ed|ing)?|creates? friction|affects? conversion|lost (?:sale|sales|revenue)|buyer support|Japanese-language touchpoints|(?:details|gaps|options|features).{0,80}(?:decide|determine|influence).{0,80}(?:purchas|buy|checkout|convert|complete))/i
const PROMOTIONAL_SENTENCE = /(?:logical next step|given that reach|i noticed your site|untapped|huge opportunity|game.changer|revolutionary|impressive|interesting detail|well presented|global potential|missed opportunity|emerging applications|\b(?:is|provides?|offers?) (?:a )?clear value\b|\bis valuable\b|position(?:s|ed|ing)? .{0,40} uniquely|uniquely position(?:s|ed|ing)?|stands? out|stood out|aligns well|real need|many japanese|critical to (?:building|build)|capture (?:part of|the|that traffic)|tailored roadmap|data-driven approach|based in Tokyo|lead Japan market entry|consultancy|optimi[sz]e stock|reduce waste|with confidence|likely bounce|creates uncertainty)/i
const UNRESOLVED_SENTENCE = /(?:\[[^\]\n]{1,80}\]|\{[^{}\n]{1,80}\}|<[^<>\n]{1,80}>|&(?:hellip|nbsp|amp);)/i
const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "with"])

interface RecoverableCandidate {
  message: string
  fact_ids: string[]
  product_evidence_rendering: string
  cta_type: string
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
}): string {
  const rendering = input.rendering.trim()
  const renderedSentence = /[.!?]$/.test(rendering) ? rendering : `${rendering}.`
  const productName = input.productNames.map((name) => name.trim()).find((name) => (
    name
    && name.toLowerCase() !== input.companyName.trim().toLowerCase()
    && !rendering.toLowerCase().includes(name.toLowerCase())
  ))
  const subject = productName ?? "its offering"
  const renderingIncludesCompany = rendering.toLowerCase().includes(input.companyName.toLowerCase())
  const variants = renderingIncludesCompany
    ? [
        `The public product description states: ${renderedSentence} I kept this review within that documented capability rather than treating it as evidence of a customer outcome.`,
        `The concrete public capability is stated as follows: ${renderedSentence} I used that wording as the boundary of this review, without adding a claim about results.`,
        `The checked product page defines the offering this way: ${renderedSentence} This review stays with that documented capability and does not infer market performance.`,
        `The public wording for the offering is: ${renderedSentence} I treated that exact capability as the product evidence and left customer outcomes unverified.`,
      ]
    : [
        `${input.companyName} publicly describes ${subject} this way: ${renderedSentence} I kept this review within that stated capability rather than treating it as evidence of a customer outcome.`,
        `The concrete capability ${input.companyName} documents publicly for ${subject} is: ${renderedSentence} I used that wording as the boundary of this review, without adding a claim about results.`,
        `In its public product description, ${input.companyName} defines ${subject} around this capability: ${renderedSentence} This review stays with that documented capability and does not infer market performance.`,
        `${input.companyName}'s public wording for ${subject} is: ${renderedSentence} I treated that capability as the product evidence and left customer outcomes unverified.`,
      ]
  return variants[stableHash(`${input.companyName}:${rendering}`) % variants.length]!
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
}): T {
  if (input.issues.length === 0 && input.similarityPassed) return input.candidate

  const currentBody = bodyBlocks(input.candidate.message)
  const originalMiddle = input.similarityPassed ? currentBody.slice(1, -1) : []
  const rebuildOpening = input.issues.some((issue) => /(?:opening|product evidence|product-context|promotional|causal inference|attached-material|Revenue wording|numeric claims|Repeated|template placeholder)/i.test(issue))
  const opening = rebuildOpening || !currentBody[0]
    ? productOpening({
        companyName: input.companyName,
        productNames: input.productNames ?? [],
        rendering: input.candidate.product_evidence_rendering,
      })
    : currentBody[0]
  const middleSentences = safeSentences(originalMiddle, {
    removeRevenue: input.issues.some((issue) => /Revenue wording is not tied/i.test(issue)),
    removeUnsupportedCausal: input.issues.some((issue) => /Unsupported causal inference/i.test(issue)),
    removePromotional: input.issues.some((issue) => /Generic, promotional/i.test(issue)),
  })
  const facts = selectedFacts(input.candidate, input.facts)
  const supplemental = input.supplementalProductEvidence?.trim()
  if (
    supplemental
    && !opening.toLowerCase().includes(supplemental.toLowerCase())
    && !tooSimilar(supplemental, input.candidate.product_evidence_rendering)
    && !middleSentences.join(" ").toLowerCase().includes(supplemental.toLowerCase())
  ) {
    const renderedSupplemental = /[.!?]$/.test(supplemental) ? supplemental : `${supplemental}.`
    const supplementalVariants = [
      `The same public material also documents “${renderedSupplemental}” I treated that as a second product detail, not evidence of Japan demand.`,
      `A separate public capability is “${renderedSupplemental}” That detail narrows the product reading without implying a market outcome.`,
      `The public description also includes “${renderedSupplemental}” I kept it as supporting product context rather than a claim about Japanese buyers.`,
      `Another documented product point is “${renderedSupplemental}” It informs the scope of the review but does not establish performance in Japan.`,
    ]
    middleSentences.unshift(supplementalVariants[stableHash(`${input.companyName}:${supplemental}`) % supplementalVariants.length]!)
  }
  for (const fact of facts) {
    if (!includesFactAnchor(middleSentences.join(" "), fact)) middleSentences.push(fact.statement)
  }

  const uniqueMiddleSentences: string[] = []
  const openingSentences = paragraphSentences([opening])
  for (const sentence of middleSentences) {
    if (openingSentences.some((openingSentence) => tooSimilar(sentence, openingSentence))) continue
    if (uniqueMiddleSentences.some((prior) => tooSimilar(sentence, prior))) continue
    uniqueMiddleSentences.push(sentence)
  }
  if (uniqueMiddleSentences.length === 0) {
    uniqueMiddleSentences.push(`The public-page review leaves ${input.companyName}'s ${input.customerPathAnchor} decision unverified.`)
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
  const paddingPool = [
    `For ${input.companyName}, the page check establishes only the observed ${input.customerPathAnchor} condition; it is not evidence of demand, buyer behavior, or results in Japan.`,
    `The open question for ${input.companyName} is whether that ${input.customerPathAnchor} observation deserves a focused customer-path test before a broader market commitment.`,
    `Nothing in the public evidence resolves that decision, and this review keeps it separate from assumptions about commercial outcomes.`,
    `This is deliberately a page-level finding for ${input.companyName}, not a conclusion about Japanese buyers or product-market fit.`,
    `${input.companyName} can therefore treat the ${input.customerPathAnchor} point as a validation question while leaving demand and performance unclaimed.`,
    `A bounded test would determine whether the observed customer-path condition merits further work, without presuming a market result.`,
    `The checked material supports a narrow ${input.customerPathAnchor} observation for ${input.companyName}; it does not establish how a Japanese audience would respond.`,
    `That leaves one practical decision open for ${input.companyName}: whether to validate the observed path before committing to wider localization.`,
  ]
  const offset = stableHash(`${input.companyName}:${input.customerPathAnchor}:padding`) % paddingPool.length
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
  const ctaParagraph = recoveredBody[ctaIndex] ?? ""
  const finalQuestion = ctaParagraph.match(/[^.!?]*\?\s*$/)?.[0] ?? ""
  if (!finalQuestion.toLowerCase().includes(requiredAnchor.toLowerCase())) {
    const offer = ctaParagraph.replace(/[^.!?]*\?\s*$/, "").trim()
    recoveredBody[ctaIndex] = `${offer} Would you like to receive the ${requiredAnchor} Japan opportunity analysis?`.trim()
  }
  return {
    ...recovered,
    message: [manualFormGreeting(input.companyName), ...recoveredBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

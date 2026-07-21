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
    && !name.toLowerCase().includes(input.companyName.trim().toLowerCase())
    && !rendering.toLowerCase().includes(name.toLowerCase())
  ))
  const subject = productName ?? "its offering"
  const renderingIncludesCompany = rendering.toLowerCase().includes(input.companyName.toLowerCase())
  const variants = renderingIncludesCompany
    ? [
        `The public product description states: ${renderedSentence} That specific capability is the starting point for this Japan review.`,
        `The checked product page describes the offering this way: ${renderedSentence} I used that concrete wording to frame the Japan review.`,
        `The product page defines the offering as follows: ${renderedSentence} That is the product basis used here.`,
        `The public description is specific: ${renderedSentence} I used that capability to keep the Japan review focused.`,
      ]
    : [
        `${input.companyName} publicly describes ${subject} this way: ${renderedSentence} That specific capability is the starting point for this Japan review.`,
        `The concrete capability documented by ${input.companyName} for ${subject} is: ${renderedSentence} I used that wording to frame the Japan review.`,
        `In its public product description, ${input.companyName} defines ${subject} around this capability: ${renderedSentence} That is the product basis used here.`,
        `The public wording from ${input.companyName} for ${subject} is: ${renderedSentence} I used that capability to keep the Japan review focused.`,
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

function limitAnchorOccurrences(paragraphs: string[], anchor: string, replacement: string): string[] {
  const normalized = anchor.trim()
  if (!normalized) return paragraphs
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(['’]s)?(?=$|[^\\p{L}\\p{N}])`, "giu")
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
}): T {
  if (input.issues.length === 0 && input.similarityPassed) return input.candidate

  const currentBody = bodyBlocks(input.candidate.message)
  const originalMiddle = input.similarityPassed ? currentBody.slice(1, -1) : []
  const rebuildOpening = !input.similarityPassed || input.issues.some((issue) => /(?:opening|product evidence|product-context|company name|product name|promotional|causal inference|attached-material|Revenue wording|numeric claims|Repeated|template placeholder)/i.test(issue))
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
      `The same public material also documents “${renderedSupplemental}” That gives the review a second concrete product detail.`,
      `A separate public capability is “${renderedSupplemental}” This helps narrow the scope of the analysis.`,
      `The public description also includes “${renderedSupplemental}” I used it as supporting product context.`,
      `Another documented product point is “${renderedSupplemental}” It helps define what the analysis should cover.`,
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
  const paddingPool = [
    `The page check establishes only the observed ${input.customerPathAnchor} condition; whether it matters commercially remains unverified.`,
    `The practical question is whether the ${input.customerPathAnchor} observation deserves a focused test before a broader market commitment.`,
    `The public evidence does not resolve that decision, so the analysis keeps assumptions separate from observed facts.`,
    `This is a page-level finding, not a conclusion about Japanese demand or product-market fit.`,
    `The ${input.customerPathAnchor} point is therefore a validation question rather than a forecast.`,
    `A bounded test could determine whether the observed customer-path condition merits further work without presuming a result.`,
    `The checked material supports a narrow ${input.customerPathAnchor} observation and no claim about audience response.`,
    `That leaves one decision open: whether to validate the observed path before committing to wider localization.`,
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
  if (!ctaParagraph.toLowerCase().includes(requiredAnchor.toLowerCase())) {
    const question = ctaParagraph.match(/[^.!?]*\?\s*$/)?.[0]?.trim() || "Would you like me to send it?"
    recoveredBody[ctaIndex] = `I can send a short Japan opportunity analysis for ${requiredAnchor}, focused on the ${input.customerPathAnchor} question. ${question}`
  }
  let boundedBody = limitAnchorOccurrences(recoveredBody, input.companyName, "the company")
  for (const productName of input.productNames ?? []) {
    if (productName.trim().toLowerCase() === input.companyName.trim().toLowerCase()) continue
    boundedBody = limitAnchorOccurrences(boundedBody, productName, "the product")
  }
  return {
    ...recovered,
    message: [manualFormGreeting(input.companyName), ...boundedBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

import { applyManualCtaContract, type ManualCtaContract } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const BODY_MIN_WORDS = 120
const DANGEROUS_SENTENCE = /(?:https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:attached|attachment|downloadable|download)\b|\bunlock\b|\b(?:guarantee(?:d|s|ing)?|ROI|return on investment)\b)/i
const UNSUPPORTED_CAUSAL_SENTENCE = /(?:\bpotentially\b|may (?:cause|limit|affect)|might overlook|could (?:cause|be (?:a )?barrier)|caus(?:e|es|ing)|early exit|drop[- ]?off|abandon(?:ment|ed|ing)?|creates? friction|affects? conversion|lost (?:sale|sales|revenue)|buyer support|Japanese-language touchpoints|(?:details|gaps|options|features).{0,80}(?:decide|determine|influence).{0,80}(?:purchas|buy|checkout|convert|complete))/i
const PROMOTIONAL_SENTENCE = /(?:logical next step|given that reach|i noticed your site|untapped|huge opportunity|game.changer|revolutionary|impressive|interesting detail|well presented|global potential|missed opportunity|emerging applications|\b(?:is|provides?|offers?) (?:a )?clear value\b|\bis valuable\b|position(?:s|ed|ing)? .{0,40} uniquely|uniquely position(?:s|ed|ing)?|stands? out|stood out|aligns well|real need|many japanese|critical to (?:building|build)|capture (?:part of|the|that traffic)|tailored roadmap|data-driven approach|based in Tokyo|lead Japan market entry|consultancy|optimi[sz]e stock|reduce waste|with confidence|likely bounce|creates uncertainty)/i
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
  const productName = input.productNames.map((name) => name.trim()).find((name) => name && !rendering.toLowerCase().includes(name.toLowerCase()))
  return productName
    ? `${input.companyName} presents ${productName} in its public product description as “${renderedSentence}” That exact capability is the product scope I reviewed, without extending the wording to an unverified customer outcome.`
    : `${input.companyName} describes its offering as “${renderedSentence}” That exact capability is the product scope I reviewed, without extending the wording to an unverified customer outcome.`
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
  customerPathAnchor: string
  contract: ManualCtaContract
  issues: string[]
  similarityPassed: boolean
}): T {
  if (input.issues.length === 0 && input.similarityPassed) return input.candidate

  const currentBody = bodyBlocks(input.candidate.message)
  const originalMiddle = currentBody.slice(1, -1)
  const rebuildOpening = input.issues.some((issue) => /(?:opening|product evidence|product-context|promotional|causal inference|attached-material|Revenue wording|numeric claims)/i.test(issue))
  const middleSentences = safeSentences(originalMiddle, {
    removeRevenue: input.issues.some((issue) => /Revenue wording is not tied/i.test(issue)),
    removeUnsupportedCausal: input.issues.some((issue) => /Unsupported causal inference/i.test(issue)),
    removePromotional: input.issues.some((issue) => /Generic, promotional/i.test(issue)),
  })
  const facts = selectedFacts(input.candidate, input.facts)
  const middleText = middleSentences.join(" ")
  for (const fact of facts) {
    if (!includesFactAnchor(middleText, fact)) middleSentences.push(fact.statement)
  }
  if (middleSentences.length === 0) {
    middleSentences.push(`The public-page review leaves ${input.companyName}'s ${input.customerPathAnchor} decision unverified.`)
  }

  const recovered = applyManualCtaContract({
    ...input.candidate,
    message: [
      manualFormGreeting(input.companyName),
      rebuildOpening || !currentBody[0]
        ? productOpening({
            companyName: input.companyName,
            productNames: input.productNames ?? [],
            rendering: input.candidate.product_evidence_rendering,
          })
        : currentBody[0],
      middleSentences.join(" "),
      input.contract.paragraph,
      MANUAL_FORM_SIGNATURE,
    ].join("\n\n"),
  }, input.companyName, input.contract)

  const recoveredBody = bodyBlocks(recovered.message)
  const padding = [
    "This is a bounded observation about the pages checked, not a finding about demand, buyer behavior, or performance in Japan.",
    `${input.companyName}'s open decision is whether to test the observed ${input.customerPathAnchor} point within its Japan customer path before making a broader market commitment.`,
    "That decision remains unverified from the public evidence alone and is separate from any assumption about commercial results.",
  ]
  for (const sentence of padding) {
    if (wordCount(recoveredBody) >= BODY_MIN_WORDS) break
    recoveredBody[1] = `${recoveredBody[1] ?? ""} ${sentence}`.trim()
  }
  return {
    ...recovered,
    message: [manualFormGreeting(input.companyName), ...recoveredBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

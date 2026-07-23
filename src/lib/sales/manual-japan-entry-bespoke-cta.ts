import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"

function blocks(message: string): string[] {
  return message.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
}

function replaceMiddleCompanyMentions(body: string[], companyName: string): string[] {
  const escaped = companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (!escaped) return body
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "giu")
  return body.map((paragraph, index) => index === 0 || index === body.length - 1
    ? paragraph
    : paragraph.replace(pattern, (_match, prefix: string) => `${prefix}the product`))
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (const character of value.toLowerCase()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function wordCount(paragraphs: string[]): number {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length
}

function phraseOccurrences(value: string, phrase: string): number {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (!escaped) return 0
  return value.match(new RegExp(escaped, "giu"))?.length ?? 0
}

function compactProductAnchor(value: string): string {
  const lastNaturalClause = value.trim().split(/,\s+(?:and|or)\s+/i).at(-1)?.trim() ?? value.trim()
  const source = lastNaturalClause.split(/\s+/).filter(Boolean).length >= 3 ? lastNaturalClause : value.trim()
  const words = source.split(/\s+/).filter(Boolean)
  let start = Math.max(0, words.length - 6)
  if (/^(?:and|or|to|with|for|from|of|the)$/i.test(words[start] ?? "") && start > 0) start -= 1
  return words.slice(start).join(" ").replace(/^(?:and|or)\s+/i, "").replace(/[.!?]+$/, "")
}

function repeatsProductEvidenceWindow(opening: string, productEvidence: string): boolean {
  const words = productEvidence.match(/[A-Za-z0-9-]+/g) ?? []
  return words.slice(0, -2).some((_, index) => {
    const window = words.slice(index, index + 3)
    if (window.filter((word) => word.length >= 5).length < 2) return false
    return phraseOccurrences(opening, window.join(" ")) > 1
  })
}

const DEDUPE_STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "with"])

function sentenceTokens(sentence: string): Set<string> {
  return new Set((sentence.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => word.length >= 3 && !DEDUPE_STOP_WORDS.has(word)))
}

function nearDuplicate(left: Set<string>, right: Set<string>): boolean {
  if (left.size < 6 || right.size < 6) return false
  let overlap = 0
  for (const token of left) if (right.has(token)) overlap += 1
  return overlap / Math.min(left.size, right.size) >= 0.78 || overlap / (left.size + right.size - overlap) >= 0.68
}

function dedupeModelSentences(body: string[]): string[] {
  const keptTokens: Set<string>[] = []
  return body.map((paragraph, paragraphIndex) => {
    if (paragraphIndex === body.length - 1) return paragraph
    return paragraph.split(/(?<=[.!?])\s+/).filter((sentence) => {
      const tokens = sentenceTokens(sentence)
      if (keptTokens.some((prior) => nearDuplicate(prior, tokens))) return false
      keptTokens.push(tokens)
      return true
    }).join(" ")
  }).filter(Boolean)
}

function limitCustomerPathRepetition(body: string[], customerPathAnchor: string): string[] {
  let seen = 0
  return body.map((paragraph, paragraphIndex) => {
    if (paragraphIndex === body.length - 1) return paragraph
    return paragraph.split(/(?<=[.!?])\s+/).filter((sentence) => {
      const occurrences = phraseOccurrences(sentence, customerPathAnchor)
      if (seen + occurrences > 2) return false
      seen += occurrences
      return true
    }).join(" ")
  }).filter(Boolean)
}

const UNSUPPORTED_MODEL_SENTENCE = /(?:\bthis means\b|\badoption depends\b|\bwithout friction\b|\bstrengthen(?:s|ing)? (?:its|their|the) reach\b|\btypical (?:discovery|evaluation|buying|purchase|adoption) behavio(?:u)?r\b|\bso your team can assess that step with evidence\b|\bthe surfaces an evaluator would use .{0,120} are not present\b|\bleaves (?:one|a) concrete (?:question|decision) open\b|\bthe output would be a clear basis for\b|\b(?:(?:could|may|might)\s+(?:help|enable|support|accelerate|serve|improve|reduce|hinder|limit|affect|address|reach|capture|appeal)|likely|appears? to|seems? to)\b|\b(?:intuitive and personal|broad technical surface|seamless experience|compelling experience|best-in-class|world-class)\b|\b(?:guide(?:s|d|ing)? shoppers? to (?:a )?purchase|driv(?:e|es|ing|en) conversion|boost(?:s|ed|ing)? (?:sales|revenue|conversion)|increas(?:e|es|ed|ing) (?:sales|revenue|conversion)|remov(?:e|es|ed|ing) manual [^.]{0,40} steps|giv(?:e|es|ing) [^.]{0,50} (?:a )?unified view)\b|\b(?:did not show|did not find|lacked|showed no|absence of|no)\s+(?:a\s+)?(?:Japanese documentation|localized onboarding(?: flow)?|Japanese checkout|localized checkout|Japanese support desk|localized payment flow)\b|\bJapanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,120}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b.{0,100}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|\b(?:discover(?:ed|ing)?|evaluat(?:e|ed|ing)|assess(?:ed|ing)?|adopt(?:ed|ing)?|trial(?:ed|ing)?|cho(?:ose|sen|osing)|prefer(?:red|ring)?|expect(?:ed|ing)?|need(?:ed|ing)?|rely|behav(?:e|ed|ing))\b.{0,120}\b(?:by\s+)?(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b|\bwould change how\b.{0,120}\b(?:in Japan|Japanese)\b|\bwhether this gap matters for .{0,100} remains unverified\b)/i

function sanitizeModelBody(body: string[], customerPathAnchor: string): string[] {
  const escapedPath = customerPathAnchor.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const auditInOpening = escapedPath
    ? new RegExp(`\\b(?:did not|does not|not shown|missing|absence|gap|unverified|Japan)\\b[^.!?]{0,120}${escapedPath}|${escapedPath}[^.!?]{0,120}\\b(?:did not|does not|not shown|missing|absence|gap|unverified|Japan)\\b`, "i")
    : null
  let removedOpeningAudit = false
  const cleaned = body.map((paragraph, index) => {
    if (index === 0) {
      const withoutOutcome = paragraph.replace(/,\s*(?:giving|allowing|helping|enabling|thereby|so that)\b[^.!?]*(?=[.!?])/gi, "")
      const sentences = withoutOutcome.split(/(?<=[.!?])\s+/)
      const kept = sentences.filter((sentence) => {
        const isAuditSentence = auditInOpening?.test(sentence) === true
        if (isAuditSentence) removedOpeningAudit = true
        return !isAuditSentence
      })
      return kept.join(" ") || sentences[0] || withoutOutcome
    }
    return paragraph.split(/(?<=[.!?])\s+/).filter((sentence) => !UNSUPPORTED_MODEL_SENTENCE.test(sentence)).join(" ")
  }).filter(Boolean)
  if (removedOpeningAudit && !cleaned.slice(1, -1).some((paragraph) => phraseOccurrences(paragraph, customerPathAnchor) > 0)) {
    cleaned.splice(1, 0, `The checked public pages did not show the ${customerPathAnchor} customer-path signal.`)
  }
  const middle = cleaned.slice(1, -1).join(" ")
  if (!/(?:decision|validat|what to test|customer path|evaluation path|purchase path|readiness|locali[sz]ation)/i.test(middle)) {
    const insertAt = Math.max(1, cleaned.length - 1)
    cleaned.splice(insertAt, 0, `For the documented ${customerPathAnchor} condition, the open decision is whether to run a bounded test before selecting a broader localization scope.`)
  }
  return cleaned
}

export function finalizeManualBespokeCta<T extends { message: string; cta_type: string }>(input: {
  candidate: T
  companyName: string
  customerPathAnchor: string
  questionDecisionAnchor: string
  solutionFocus: string
  founderForwardCta: boolean
  productEvidenceRendering?: string
}): T {
  const messageBlocks = blocks(input.candidate.message)
  if (/^hello\b/i.test(messageBlocks[0] ?? "")) messageBlocks.shift()
  if (/(?:best|kind|warm) regards/i.test(messageBlocks.at(-1) ?? "")) messageBlocks.pop()
  if (messageBlocks.length === 0) return input.candidate

  const productScope = input.productEvidenceRendering?.trim()
  const productClause = productScope ? `the documented product scope — ${compactProductAnchor(productScope)} —` : "the documented product scope"
  const offers = [
    `I can send a Japan opportunity analysis for ${input.companyName} that tests ${productClause} against the ${input.customerPathAnchor} finding and frames ${input.solutionFocus}.`,
    `For ${input.companyName}, a Japan opportunity analysis can use ${productClause} as the baseline for the ${input.customerPathAnchor} question and structure ${input.solutionFocus}.`,
    `A focused Japan opportunity analysis for ${input.companyName} would connect ${productClause} to the ${input.customerPathAnchor} finding and define ${input.solutionFocus}.`,
    `I can prepare a Japan opportunity analysis for ${input.companyName} around ${productClause} and the ${input.customerPathAnchor} observation, with ${input.solutionFocus} as the decision scope.`,
    `The Japan opportunity analysis I can provide for ${input.companyName} would evaluate ${productClause} against the ${input.customerPathAnchor} observation through ${input.solutionFocus}.`,
    `For ${input.companyName}, I can use ${productClause} and the ${input.customerPathAnchor} observation to build a Japan opportunity analysis focused on ${input.solutionFocus}.`,
  ]
  const variant = stableHash(`${input.companyName}:${input.questionDecisionAnchor}:${input.solutionFocus}`) % offers.length
  const offer = offers[variant]!
  const decisionLabel = input.questionDecisionAnchor.toLowerCase().startsWith(input.customerPathAnchor.toLowerCase())
    ? input.questionDecisionAnchor.slice(input.customerPathAnchor.length).trim() || "customer-path decision"
    : input.questionDecisionAnchor
  const founderQuestions = [
    `Would the founder or international-growth owner be the right person to review the ${decisionLabel}?`,
    `Who owns the ${decisionLabel}, and should the analysis be routed to that person?`,
    `Is the ${decisionLabel} best reviewed by the founder or international-growth lead?`,
    `Should I address the ${decisionLabel} brief to the founder or international-growth owner?`,
    `Would the person accountable for international growth be the right owner for the ${decisionLabel}?`,
    `Who should receive the analysis to decide how to handle the ${decisionLabel}?`,
  ]
  const permissionQuestions = [
    `May I send it to the person who owns the ${decisionLabel}?`,
    `Would you like the analysis for the ${decisionLabel}?`,
    `Should I send the analysis before the ${decisionLabel} is tested?`,
    `Who should receive it to evaluate the ${decisionLabel}?`,
    `May I provide it for the ${decisionLabel} review?`,
    `Would it be useful to receive the analysis for the ${decisionLabel}?`,
  ]
  const question = (input.founderForwardCta ? founderQuestions : permissionQuestions)[variant]!
  messageBlocks[messageBlocks.length - 1] = `${offer} ${question}`
  let boundedBody = limitCustomerPathRepetition(replaceMiddleCompanyMentions(
    sanitizeModelBody(messageBlocks, input.customerPathAnchor),
    input.companyName,
  ), input.customerPathAnchor)
  if (productScope && (!boundedBody[0]?.includes(input.companyName) || !boundedBody[0]?.includes(productScope) || repeatsProductEvidenceWindow(boundedBody[0], productScope))) {
    boundedBody[0] = `${input.companyName} documents this product scope: ${productScope}${/[.!?]$/.test(productScope) ? "" : "."}`
  }
  boundedBody = dedupeModelSentences(boundedBody)
  const padding = [
    `The scope would compare the current product explanation, onboarding route, and documentation sequence before any wider localization choice is made.`,
    `That review would turn the open customer-path question into a bounded test plan with explicit assumptions and decision criteria.`,
    `The review would separate page-level observations, operating assumptions, and the threshold for moving from validation to a broader localization choice.`,
    `A useful first screen would compare the documented workflow with the ${input.customerPathAnchor} route before a broader market commitment.`,
    `The review can identify which parts of the customer journey can be tested through the current product surface and which require direct evidence.`,
    `The decision brief would keep product facts, page-level observations, and the assumptions for a first validation step in separate layers.`,
    `Before a wider launch choice, the analysis can define a narrow evidence threshold for the ${input.customerPathAnchor} path.`,
    `That scope keeps the first recommendation tied to the documented product journey instead of a generic localization checklist.`,
    `The first validation choice can be framed around the current customer path without presuming demand, conversion, or a commercial result.`,
  ]
  const offset = stableHash(`${input.companyName}:${input.solutionFocus}:padding`) % padding.length
  const orderedPadding = [...padding.slice(offset), ...padding.slice(0, offset)]
  for (const sentence of orderedPadding) {
    if (wordCount(boundedBody) >= 120) break
    const analysisIndex = Math.max(0, boundedBody.length - 2)
    boundedBody[analysisIndex] = `${boundedBody[analysisIndex] ?? ""} ${sentence}`.trim()
  }

  return {
    ...input.candidate,
    cta_type: input.founderForwardCta ? "founder_forward" : "permission_to_send",
    message: [manualFormGreeting(input.companyName), ...boundedBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

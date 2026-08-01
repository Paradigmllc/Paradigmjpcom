import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import { manualProductDecisionSubject } from "./manual-japan-entry-product-subject"

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

function phraseOccurrences(value: string, phrase: string): number {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (!escaped) return 0
  return value.match(new RegExp(escaped, "giu"))?.length ?? 0
}

function normalizedSolutionFocus(value: string): string {
  const withoutGenericFinding = value
    .replace(/\s+using\s+(?:only\s+)?the\s+(?:observed customer-path finding|observed public-page finding|exact public-page observation)\b/gi, "")
    .replace(/[.!?]+$/g, "")
    .replace(/,\s*$/g, "")
    .trim()
  const whetherToTest = withoutGenericFinding.match(/^whether\s+to\s+test\s+(.+)$/i)
  if (whetherToTest?.[1]) return `a single test of ${whetherToTest[1]}`
  const testedClause = withoutGenericFinding.match(/^whether\s+(.+?)\s+should be tested\s+(.+)$/i)
  if (testedClause?.[1] && testedClause[2]) {
    return `a single test of ${testedClause[1]} ${testedClause[2]}`
  }
  if (/^whether\b/i.test(withoutGenericFinding)) {
    return `the decision on ${withoutGenericFinding.charAt(0).toLowerCase()}${withoutGenericFinding.slice(1)}`
  }
  if (/^(?:assess|evaluate|test|validate|determine|decide|compare|define)\b/i.test(withoutGenericFinding)) {
    return `a single test to ${withoutGenericFinding.charAt(0).toLowerCase()}${withoutGenericFinding.slice(1)}`
  }
  if (/^bounded\s+(?:test|validation|evaluation)\b/i.test(withoutGenericFinding)) {
    return `a ${withoutGenericFinding.replace(/^bounded\s+/i, "single ")}`
  }
  return withoutGenericFinding || "a single Japan customer-path test"
}

function withProductArticle(subject: string): string {
  return /^(?:analysis|automation|conversion|generation|integration|management|tracking|use)\b/i.test(subject)
    ? `the ${subject}`
    : subject
}

function inferredOpeningSubject(opening: string, companyName: string): string {
  const escapedCompany = companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return opening
    .replace(new RegExp(escapedCompany, "giu"), " ")
    .replace(/^(?:on its public pages,?\s*)?(?:publicly\s+)?(?:describes?|documents?|provides?|offers?|publishes?)\s+/i, "")
    .replace(/[.!?]+$/g, "")
    .trim()
}

function removeRepeatedLocalizationBoundary(focus: string, earlierBody: string): string {
  const boundaryAtEnd = /\s+before\s+(?:wider|broader)\s+localization(?:\s+is\s+considered)?\s*$/i
  const boundaryAnywhere = /\bbefore\s+(?:wider|broader)\s+localization(?:\s+is\s+considered)?\b/i
  return boundaryAnywhere.test(earlierBody) ? focus.replace(boundaryAtEnd, "").trim() : focus
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

const UNSUPPORTED_MODEL_SENTENCE = /(?:\bthis means\b|\bwhich makes? [^.]{0,90}\b(?:necessary|important|urgent|essential|immediate)\b|\bfor the documented [^.]{0,60} condition, the open decision\b|\badoption depends\b|\bwithout friction\b|\bstrengthen(?:s|ing)? (?:its|their|the) reach\b|\btypical (?:discovery|evaluation|buying|purchase|adoption) behavio(?:u)?r\b|\bso your team can assess that step with evidence\b|\bthe surfaces an evaluator would use .{0,120} are not present\b|\bleaves (?:one|a) concrete (?:question|decision) open\b|\bthe output would be a clear basis for\b|\bkeep the focus on what the public pages establish\b|\bwould evaluate the documented product scope\b|\b(?:analysis|brief) (?:stays?|remains?) within the verified product scope\b|\bmarks? every Japan assumption as unconfirmed\b|\bwould scope that decision\b|\b(?:(?:could|may|might)\s+(?:help|enable|support|accelerate|serve|improve|reduce|hinder|limit|affect|address|reach|capture|appeal)|likely|appears? to|seems? to)\b|\b(?:intuitive and personal|broad technical surface|seamless experience|compelling experience|best-in-class|world-class)\b|\b(?:guide(?:s|d|ing)? shoppers? to (?:a )?purchase|driv(?:e|es|ing|en) conversion|boost(?:s|ed|ing)? (?:sales|revenue|conversion)|increas(?:e|es|ed|ing) (?:sales|revenue|conversion)|remov(?:e|es|ed|ing) manual [^.]{0,40} steps|giv(?:e|es|ing) [^.]{0,50} (?:a )?unified view)\b|\b(?:did not show|did not find|lacked|showed no|absence of|no)\s+(?:a\s+)?(?:Japanese documentation|localized onboarding(?: flow)?|Japanese checkout|localized checkout|Japanese support desk|localized payment flow)\b|\bJapanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,120}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b.{0,100}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|\b(?:discover(?:ed|ing)?|evaluat(?:e|ed|ing)|assess(?:ed|ing)?|adopt(?:ed|ing)?|trial(?:ed|ing)?|cho(?:ose|sen|osing)|prefer(?:red|ring)?|expect(?:ed|ing)?|need(?:ed|ing)?|rely|behav(?:e|ed|ing))\b.{0,120}\b(?:by\s+)?(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b|\bwould change how\b.{0,120}\b(?:in Japan|Japanese)\b|\bwhether this gap matters for .{0,100} remains unverified\b)/i
const UNVERIFIED_MODEL_SEGMENT_OR_EFFECT = /(?:\b(?:this|which) means\b|\b(?:the|that) gap suggests\b|\bJapanese lens\b|\bvalue proposition holds\b|\buser['’]s context is Japanese\b|\bthe analysis (?:would|can|could)\b|\bJapanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:developers?|evaluators?|users?|buyers?|customers?|teams?)\b(?!\s+paths?\b)|\b(?:lift|raise|increase|improve|affect|change|drive|strengthen)(?:s|d|ing)? .{0,70}(?:trial|completion|conversion|adoption|readiness|revenue|sales)\b)/i
const INVENTED_UNTESTED_SURFACE = /\b(?:product explanation|onboarding(?: experience| flow)?|documentation|user interface|UI|checkout|support)\b(?:.{0,60}\b(?:remain(?:s)?|is|are)\s+)?(?:untested|unverified|not tested)\b/i
const VAGUE_AUDIENCE = /\b(?:that|this|such|the) audience\b/i
const GENERIC_PRODUCT_REFERENCE = /\b(?:(?:the|its|your) product['’]s documented capability|the documented capability(?: itself)?)\b/i
const SPECULATIVE_PRODUCT_PATH = /(?:\b(?:(?:the|that|this)\s+)?(?:(?:core|current|existing|documented)\s+)?(?:capability|workflow|surface|offering|product)\b[^.!?]{0,120}\b(?:remains?|is|are|has not been|have not been)\s+(?:untested|unverified|verified)\b|\b(?:workflow|product|capability|offering|experience)\b[^.!?]{0,80}\b(?:currently\s+)?(?:lacks|has no|does not have)\b[^.!?]{0,60}\bJapanese-language\s+(?:customer\s+)?path\b|\b(?:current|existing|documented)\s+surface\b[^.!?]{0,100}\bleaves?\b[^.!?]{0,60}\bunverified\b|\bfrom\s+(?:an?\s+)?(?:initial|first)\s+(?:interaction|touchpoint|step)\s+to\b|\bwhat adjustments?\s+(?:might|may|would|could)\s+be needed\b|\bthrough that lens\b)/i
const VAGUE_WORKFLOW_REFERENCE = /\b(?:this|that|the)\s+workflow\b/i
const UNSUPPORTED_TEST_OUTCOME = /\b(?:technical|market|commercial|product|user|customer)\s+fit\b|\bfirst impressions?\b|\bmarket reception\b/i
const MECHANICAL_AUDIT_BRIDGE = /\bthis decision is grounded in (?:a|the) (?:specific|public-page|audited) finding\b/i
const UNVERIFIED_JAPAN_AUDIENCE = /\b(?:audiences?|developers?|evaluators?|users?|buyers?|customers?|teams?)\s+in Japan\b/i
const GENERIC_ANALYSIS_FOCUS = /\bproduct evaluation and Japanese positioning\b/i
const REUSABLE_VALIDATION_SCAFFOLD = /\bsurface(?:s|d)? a practical choice about where to place the next validation step\b/i
const AUDIT_CAUSAL_EXTENSION = /\b(?:did not show|did not find|showed no|found no)\b[^.!?]{0,160},?\s+(?:so|therefore|which)\b/i

function sanitizeModelBody(body: string[], customerPathAnchor: string, productEvidenceRendering?: string): string[] {
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
      const evidenceSentence = productEvidenceRendering
        ? kept.find((sentence) => sentence.toLowerCase().includes(productEvidenceRendering.toLowerCase()))
        : kept[0]
      return evidenceSentence || kept[0] || sentences[0] || withoutOutcome
    }
    return paragraph.split(/(?<=[.!?])\s+/).filter((sentence) => (
      !UNSUPPORTED_MODEL_SENTENCE.test(sentence)
      && !UNVERIFIED_MODEL_SEGMENT_OR_EFFECT.test(sentence)
      && !INVENTED_UNTESTED_SURFACE.test(sentence)
      && !VAGUE_AUDIENCE.test(sentence)
      && !GENERIC_PRODUCT_REFERENCE.test(sentence)
      && !SPECULATIVE_PRODUCT_PATH.test(sentence)
      && !VAGUE_WORKFLOW_REFERENCE.test(sentence)
      && !UNSUPPORTED_TEST_OUTCOME.test(sentence)
      && !MECHANICAL_AUDIT_BRIDGE.test(sentence)
      && !UNVERIFIED_JAPAN_AUDIENCE.test(sentence)
      && !GENERIC_ANALYSIS_FOCUS.test(sentence)
      && !REUSABLE_VALIDATION_SCAFFOLD.test(sentence)
      && !AUDIT_CAUSAL_EXTENSION.test(sentence)
    )).join(" ")
  }).filter(Boolean)
  if (removedOpeningAudit && !cleaned.slice(1, -1).some((paragraph) => phraseOccurrences(paragraph, customerPathAnchor) > 0)) {
    cleaned.splice(1, 0, `The checked public pages did not show a ${customerPathAnchor} customer path.`)
  }
  return cleaned
}

function ensurePublicPathObservation(body: string[], customerPathAnchor: string): string[] {
  const auditSentence = `The checked public pages did not show a ${customerPathAnchor} customer path.`
  for (let paragraphIndex = 1; paragraphIndex < body.length - 1; paragraphIndex += 1) {
    const sentences = body[paragraphIndex]?.split(/(?<=[.!?])\s+/) ?? []
    const auditIndex = sentences.findIndex((sentence) => (
      phraseOccurrences(sentence, customerPathAnchor) > 0
      && /\b(?:did not|does not|not shown|missing|absence|gap|found no|showed no)\b/i.test(sentence)
    ))
    if (auditIndex < 0) continue
    if (/\bpublic(?:ly|-page| pages?)?\b/i.test(sentences[auditIndex] ?? "")) return body
    sentences[auditIndex] = auditSentence
    body[paragraphIndex] = sentences.join(" ")
    return body
  }
  body.splice(1, 0, auditSentence)
  return body
}

function separateAuditAndProductDecision(
  body: string[],
  customerPathAnchor: string,
  productSubject: string,
): string[] {
  let auditIndex = -1
  for (let paragraphIndex = 1; paragraphIndex < body.length - 1; paragraphIndex += 1) {
    const sentences = body[paragraphIndex]?.split(/(?<=[.!?])\s+/).filter(Boolean) ?? []
    const sentenceIndex = sentences.findIndex((sentence) => (
      phraseOccurrences(sentence, customerPathAnchor) > 0
      && /\b(?:did not|did not find|showed no|found no|not shown|missing|absence)\b/i.test(sentence)
    ))
    if (sentenceIndex < 0) continue
    const auditSentence = sentences[sentenceIndex]!
    const remaining = sentences.filter((_sentence, index) => index !== sentenceIndex).join(" ").trim()
    body.splice(paragraphIndex, 1, auditSentence, ...(remaining ? [remaining] : []))
    auditIndex = paragraphIndex
    break
  }
  if (auditIndex < 0) return body

  const subjectWords = sentenceTokens(productSubject)
  const hasSeparateDecision = body.slice(auditIndex + 1, -1).some((paragraph) => {
    const tokens = sentenceTokens(paragraph)
    const overlap = [...subjectWords].filter((word) => tokens.has(word)).length
    return /\b(?:decision|whether|what to test|which .{0,50} test|evaluate|evaluation|validate|validation|locali[sz])\b/i.test(paragraph)
      && (subjectWords.size < 2 || overlap >= 2)
  })
  if (hasSeparateDecision) return body

  const localizationBoundaryAlreadyUsed = /\bbefore (?:wider|broader) localization(?: is considered)?\b/i.test(body.join(" "))
  const boundary = localizationBoundaryAlreadyUsed ? "" : " before broader localization is considered"
  body.splice(
    auditIndex + 1,
    0,
    `The open question is which Japanese-language customer-path test should cover ${withProductArticle(productSubject)}${boundary}. The audit does not establish demand or commercial impact; both remain open to direct evidence.`,
  )
  return body
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
  const productSubjectSource = productScope || inferredOpeningSubject(messageBlocks[0] ?? "", input.companyName)
  const productSubject = productSubjectSource
    ? manualProductDecisionSubject({ rendering: productSubjectSource, companyName: input.companyName, productNames: [] })
    : "documented offering"
  let normalizedFocus = removeRepeatedLocalizationBoundary(
    normalizedSolutionFocus(input.solutionFocus),
    messageBlocks.slice(0, -1).join(" "),
  )
  if (productScope) {
    const subjectWords = productSubject.toLowerCase().split(/\s+/).filter((word) => word.length >= 4)
    const focusSubjectOverlap = subjectWords.filter((word) => normalizedFocus.toLowerCase().includes(word)).length
    const requiredOverlap = Math.min(2, subjectWords.length)
    if (
      requiredOverlap > 0 && focusSubjectOverlap < requiredOverlap
      || /\b(?:bounded\s+)?test\s+of\s+whether\s+to\s+validate\s+(?:a\s+)?Japanese-language\s+(?:customer\s+)?path\b|\bwhether\s+to\s+validate\s+(?:a\s+)?Japanese-language\s+(?:customer\s+)?path\b/i.test(normalizedFocus)
    ) {
      normalizedFocus = `the first evaluation of ${withProductArticle(productSubject)} through a ${input.customerPathAnchor} customer path`
    }
  }
  const anchoredFocus = normalizedFocus.toLowerCase().includes(input.customerPathAnchor.toLowerCase())
    ? normalizedFocus
    : `${normalizedFocus} using the ${input.customerPathAnchor} finding`
  const offers = [
    `I can send a Japan opportunity analysis focused on ${anchoredFocus}.`,
    `I can prepare a Japan opportunity analysis built around ${anchoredFocus}.`,
    `I can prepare a focused Japan opportunity analysis that sets out ${anchoredFocus}.`,
    `I can send a Japan opportunity analysis that examines ${anchoredFocus}.`,
    `I can provide a Japan opportunity analysis focused on ${anchoredFocus}.`,
    `I can prepare a Japan opportunity analysis around ${anchoredFocus}.`,
  ]
  const variant = stableHash(`${input.companyName}:${input.questionDecisionAnchor}:${input.solutionFocus}`) % offers.length
  const offer = offers[variant]!
  const decisionLabel = input.questionDecisionAnchor.toLowerCase().startsWith(input.customerPathAnchor.toLowerCase())
    ? input.questionDecisionAnchor.slice(input.customerPathAnchor.length).trim() || "customer-path decision"
    : input.questionDecisionAnchor
  const founderQuestions = [
    `Would the founder or international-growth owner at ${input.companyName} be the right person to review that Japan customer-path decision?`,
    `Who at ${input.companyName} owns that Japan customer-path decision?`,
    `Is the founder or international-growth lead at ${input.companyName} responsible for that first Japan test?`,
    `Should I address the ${decisionLabel} brief to the person responsible for Japan validation at ${input.companyName}?`,
    `Would the international-growth owner at ${input.companyName} be the right person to review that customer-path test?`,
    `Who at ${input.companyName} owns the first Japan evaluation decision?`,
  ]
  const permissionQuestions = [
    `May I send it to the person who owns that Japan customer-path decision at ${input.companyName}?`,
    `Would the team at ${input.companyName} like the analysis before that first Japan evaluation?`,
    `Should I send the analysis to the person handling that customer-path test at ${input.companyName}?`,
    `Who at ${input.companyName} should receive it for the Japan-path evaluation?`,
    `May I provide it to the person reviewing that customer path at ${input.companyName}?`,
    `Would ${input.companyName} like to receive the analysis before deciding on that first Japan test?`,
  ]
  const question = (input.founderForwardCta ? founderQuestions : permissionQuestions)[variant]!
  messageBlocks[messageBlocks.length - 1] = `${offer} ${question}`
  let boundedBody = limitCustomerPathRepetition(replaceMiddleCompanyMentions(
    separateAuditAndProductDecision(
      ensurePublicPathObservation(
        sanitizeModelBody(messageBlocks, input.customerPathAnchor, productScope),
        input.customerPathAnchor,
      ),
      input.customerPathAnchor,
      productSubject,
    ),
    input.companyName,
  ), input.customerPathAnchor)
  if (productScope && (!boundedBody[0]?.includes(input.companyName) || !boundedBody[0]?.includes(productScope) || repeatsProductEvidenceWindow(boundedBody[0], productScope))) {
    boundedBody[0] = `On its public pages, ${input.companyName} describes ${productScope}${/[.!?]$/.test(productScope) ? "" : "."}`
  }
  boundedBody = dedupeModelSentences(boundedBody)
  return {
    ...input.candidate,
    cta_type: input.founderForwardCta ? "founder_forward" : "permission_to_send",
    message: [manualFormGreeting(input.companyName), ...boundedBody, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

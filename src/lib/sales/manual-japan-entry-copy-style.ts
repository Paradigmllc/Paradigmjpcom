import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const TEMPLATE_OPENING_PATTERN = /\b(?:I(?:'|’)m reaching out|I am reaching out|I wanted to reach out|I came across|I noticed|I was impressed by|hope this message finds you well|touch base|quick introduction)\b/i
const PARTNERSHIP_PITCH_PATTERN = /\b(?:explore (?:a |the )?(?:partnership|collaboration)|potential partnership|partner with (?:you|your team)|collaborate with (?:you|your team)|work together|mutually beneficial|strategic fit|synerg(?:y|ies)|explore how we can)\b/i
const JAPANESE_BEHAVIOR_PATTERN = /\b(?:for\s+)?Japanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:customers?|buyers?|consumers?|users?|companies|teams?|developers?|designers?|retailers?|businesses)\b.{0,140}\b(?:often|typically|generally|tend to|prefer|expect|need|rely on|evaluate|assess|adopt|trial|select|choose|look for|care about|value|influence(?:s|d)?\s+(?:trial|purchase|buying|evaluation|decision)|overlook)\b/i
const STOCK_ROUTING_CTA_PATTERN = /\b(?:I can share a detailed Japan opportunity analysis based on this public evidence|Could you forward (?:this|it) to (?:the )?founder or (?:the )?person responsible for international growth)\b/i
const AMBIGUOUS_DECISION_PATTERN = /\bwhether this gap matters for (?:its|your product(?:['’]s)?|the company(?:['’]s)?|the product(?:['’]s)?) .{3,100}\bremains unverified\b/i
const OPENING_OUTCOME_BRIDGE_PATTERN = /,\s*(?:giving|allowing|helping|enabling|thereby|so that)\b/i
const UNSUPPORTED_GAP_INFERENCE_PATTERN = /(?:\bthis means\b|\badoption depends\b|\bwithout friction\b|\bstrengthen(?:s|ing)? (?:its|their|the) reach\b|\btypical (?:discovery|evaluation|buying|purchase|adoption) behavio(?:u)?r\b|\bJapanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,120}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b.{0,100}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|\b(?:discover(?:ed|ing)?|evaluat(?:e|ed|ing)|assess(?:ed|ing)?|adopt(?:ed|ing)?|trial(?:ed|ing)?|cho(?:ose|sen|osing)|prefer(?:red|ring)?|expect(?:ed|ing)?|need(?:ed|ing)?|rely|behav(?:e|ed|ing))\b.{0,120}\b(?:by\s+)?(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b|\bwould change how\b.{0,120}\b(?:in Japan|Japanese)\b)/i
const BROKEN_POSSESSIVE_PATTERN = /\b(?:the company|the product|it)['’](?!s\b)/i
const AWKWARD_PRONOUN_BRIDGE_PATTERN = /\b(?:for|from|around|within) it,\s+(?:the|an?|that|this|one)\b/i
const MECHANICAL_BRIDGE_PATTERN = /\b(?:I used (?:that capability|that wording|it) to (?:keep|frame|support)|That specific capability is the starting point|That is the product basis used here|This helps narrow the scope|It helps define what the analysis should cover)\b/gi
const MECHANICAL_CTA_PATTERN = /\baround the exact [^.?!]{2,80} evidence\b/i
const UNSUPPORTED_PRAISE_PATTERN = /\b(?:intuitive and personal|broad technical surface|seamless experience|compelling experience|impressive(?:ly)?|best-in-class|world-class)\b/i
const UNSUPPORTED_PRODUCT_OUTCOME_PATTERN = /\b(?:guide(?:s|d|ing)? shoppers? to (?:a )?purchase|driv(?:e|es|ing|en) conversion|boost(?:s|ed|ing)? (?:sales|revenue|conversion)|increas(?:e|es|ed|ing) (?:sales|revenue|conversion)|help(?:s|ed|ing)? [^.]{0,60} (?:buy|purchase|convert)|remov(?:e|es|ed|ing) manual [^.]{0,40} steps|giv(?:e|es|ing) [^.]{0,50} (?:a )?unified view)\b/i
const EXPANDED_GAP_SURFACE_PATTERN = /\b(?:did not show|did not find|lacked|showed no|absence of|no)\s+(?:a\s+)?(Japanese documentation|localized onboarding(?: flow)?|Japanese checkout|localized checkout|Japanese support desk|localized payment flow)\b/i

function containsAnchor(text: string, anchors: string[], minimumLength = 4): boolean {
  const normalized = text.toLowerCase()
  return anchors.some((anchor) => anchor.trim().length >= minimumLength && normalized.includes(anchor.trim().toLowerCase()))
}

function exactOccurrences(text: string, value: string): number {
  const normalized = value.trim()
  if (!normalized) return 0
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const boundaryPattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "giu")
  return text.match(boundaryPattern)?.length ?? 0
}

const EVIDENCE_BOUNDARY_PATTERN = /\b(?:not evidence|not proof|does not establish|remains? unverified|left [^.]{0,80} unverified|not a conclusion|without (?:adding|treating|implying)|does not infer)\b/gi

export function reviewManualFormBespokeStyle(input: {
  body: string
  openingParagraph: string
  finalParagraph: string
  companyName: string
  productEvidence: string
  productNames: string[]
  selectedFacts: JapanEntryPersonalizationFact[]
  includeEstimate: boolean
}): string[] {
  const issues: string[] = []
  const templateOpening = input.openingParagraph.match(TEMPLATE_OPENING_PATTERN)?.[0]
  if (templateOpening) issues.push(`Template-like outreach opening is prohibited: ${templateOpening}`)
  if (PARTNERSHIP_PITCH_PATTERN.test(input.body)) {
    issues.push("Partnership or collaboration pitch language is prohibited in first-touch form copy")
  }
  const stockCta = input.finalParagraph.match(STOCK_ROUTING_CTA_PATTERN)?.[0]
  if (stockCta) issues.push(`Reusable stock routing CTA is prohibited: ${stockCta}`)
  if (AMBIGUOUS_DECISION_PATTERN.test(input.body)) {
    issues.push("The message uses an ambiguous stock decision sentence; name the documented product and one concrete validation decision")
  }
  if (BROKEN_POSSESSIVE_PATTERN.test(input.body)) {
    issues.push("The message contains a broken possessive created by anchor reduction")
  }
  if (AWKWARD_PRONOUN_BRIDGE_PATTERN.test(input.body)) {
    issues.push("The message contains an unnatural pronoun bridge; name the documented capability or rewrite the sentence directly")
  }
  if ((input.body.match(MECHANICAL_BRIDGE_PATTERN) ?? []).length > 0) {
    issues.push("Mechanical evidence-to-analysis bridge language is prohibited; state the company-specific observation directly")
  }
  if (MECHANICAL_CTA_PATTERN.test(input.finalParagraph)) {
    issues.push("Mechanical exact-evidence CTA language is prohibited; offer a concrete decision brief in natural language")
  }
  if (OPENING_OUTCOME_BRIDGE_PATTERN.test(input.openingParagraph) && !OPENING_OUTCOME_BRIDGE_PATTERN.test(input.productEvidence)) {
    issues.push("The opening adds an inferred user outcome after the grounded product evidence")
  }
  if (UNSUPPORTED_GAP_INFERENCE_PATTERN.test(input.body)) {
    issues.push("The message turns a public-page gap into unsupported audience behaviour, adoption, reach, or friction")
  }
  const unsupportedPraise = input.body.match(UNSUPPORTED_PRAISE_PATTERN)?.[0]
  if (unsupportedPraise && !input.productEvidence.toLowerCase().includes(unsupportedPraise.toLowerCase())) {
    issues.push(`Unsupported praise or product outcome is prohibited: ${unsupportedPraise}`)
  }
  const unsupportedOutcome = input.body.match(UNSUPPORTED_PRODUCT_OUTCOME_PATTERN)?.[0]
  if (unsupportedOutcome && !input.productEvidence.toLowerCase().includes(unsupportedOutcome.toLowerCase())) {
    issues.push(`Unsupported product or commercial outcome is prohibited: ${unsupportedOutcome}`)
  }
  const expandedGapSurface = input.body.match(EXPANDED_GAP_SURFACE_PATTERN)?.[1]
  if (expandedGapSurface && !input.selectedFacts.some((fact) => fact.statement.toLowerCase().includes(expandedGapSurface.toLowerCase()))) {
    issues.push(`The message expands a verified page gap into an unsupported missing surface: ${expandedGapSurface}`)
  }
  const evidenceWords = input.productEvidence.match(/[A-Za-z0-9-]+/g) ?? []
  const repeatedEvidenceWindow = evidenceWords.slice(0, -2).map((_, index) => evidenceWords.slice(index, index + 3).join(" "))
    .find((window) => window.split(" ").filter((word) => word.length >= 5).length >= 2 && exactOccurrences(input.openingParagraph, window) > 1)
  if (repeatedEvidenceWindow) {
    issues.push(`The opening repeats a product-evidence phrase instead of stating it once naturally: ${repeatedEvidenceWindow}`)
  }

  const selectedFacts = [...new Map(input.selectedFacts.map((fact) => [fact.id, fact])).values()]
  const auditFacts = selectedFacts.filter((fact) => fact.id.startsWith("japan-audit-"))
  if (selectedFacts.length > 4) issues.push("Initial-interest copy must use no more than four evidence facts")
  if (input.includeEstimate && auditFacts.length !== 1) {
    issues.push("The estimate variant must use exactly one audited customer-path fact")
  } else if (!input.includeEstimate && auditFacts.length > 2) {
    issues.push("The no-estimate variant must use no more than two audited customer-path facts")
  }
  if (auditFacts.some((fact) => containsAnchor(input.openingParagraph, fact.anchors))) {
    issues.push("The opening paragraph must focus on the product observation, not merge in the Japan audit gap")
  }

  const genericJapaneseBehavior = JAPANESE_BEHAVIOR_PATTERN.test(input.body)
  const groundedJapaneseBehavior = selectedFacts.some((fact) => JAPANESE_BEHAVIOR_PATTERN.test(fact.statement))
  if (genericJapaneseBehavior && !groundedJapaneseBehavior) {
    issues.push("Generalized Japanese audience behavior is not grounded in a selected fact; delete the entire behavior sentence and state only that whether the observed gap matters for this company's Japan customer path remains unverified")
  }

  const unavoidableEvidenceCompanyMentions = Math.min(1, exactOccurrences(input.productEvidence, input.companyName))
  if (exactOccurrences(input.body, input.companyName) > 2 + unavoidableEvidenceCompanyMentions) {
    issues.push("The company name must appear no more than twice in the personalized body; use natural pronouns after the grounded introduction")
  }
  for (const productName of input.productNames) {
    if (productName.toLowerCase() === input.companyName.toLowerCase()) continue
    const unavoidableEvidenceProductMentions = Math.min(1, exactOccurrences(input.productEvidence, productName))
    if (exactOccurrences(input.body, productName) > 2 + unavoidableEvidenceProductMentions) {
      issues.push(`The product name must appear no more than twice in the personalized body: ${productName}`)
    }
  }
  if (input.productEvidence.trim().length >= 4 && exactOccurrences(input.body, input.productEvidence) > 2) {
    issues.push("The exact product-evidence phrase must appear no more than twice in the personalized body")
  }
  const evidenceBoundaries = input.body.match(EVIDENCE_BOUNDARY_PATTERN)?.length ?? 0
  if (evidenceBoundaries > 2) {
    issues.push("The message repeats evidence disclaimers; keep one concise boundary statement and use the remaining space for decision relevance")
  }
  for (const auditAnchor of [...new Set(auditFacts.flatMap((fact) => fact.anchors))]) {
    if (auditAnchor.trim().length >= 4 && exactOccurrences(input.body, auditAnchor) > 3) {
      issues.push(`The audited customer-path anchor is repeated too often; use '${auditAnchor}' no more than three times and vary the reasoning naturally`)
    }
  }

  const companyOrProductAnchors = [input.companyName, ...input.productNames]
  if (!containsAnchor(input.finalParagraph, companyOrProductAnchors, 2)) {
    issues.push(`The final CTA paragraph must include the exact company or product anchor: ${input.productNames[0] ?? input.companyName}`)
  }
  return issues
}

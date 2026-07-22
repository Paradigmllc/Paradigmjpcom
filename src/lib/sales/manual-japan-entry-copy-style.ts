import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const TEMPLATE_OPENING_PATTERN = /\b(?:I(?:'|’)m reaching out|I am reaching out|I wanted to reach out|I came across|I noticed|I was impressed by|hope this message finds you well|touch base|quick introduction)\b/i
const PARTNERSHIP_PITCH_PATTERN = /\b(?:explore (?:a |the )?(?:partnership|collaboration)|potential partnership|partner with (?:you|your team)|collaborate with (?:you|your team)|work together|mutually beneficial|strategic fit|synerg(?:y|ies)|explore how we can)\b/i
const JAPANESE_BEHAVIOR_PATTERN = /\b(?:for\s+)?Japanese(?:\s+[a-z-]+){0,3}\s+(?:customers?|buyers?|consumers?|users?|companies|teams?|developers?|designers?|retailers?|businesses)\b.{0,140}\b(?:often|typically|generally|tend to|prefer|expect|need|rely on|evaluate|look for|care about|value|influence(?:s|d)?\s+(?:trial|purchase|buying|evaluation|decision)|overlook)\b/i
const STOCK_ROUTING_CTA_PATTERN = /\b(?:I can share a detailed Japan opportunity analysis based on this public evidence|Could you forward (?:this|it) to the founder or person responsible for international growth)\b/i
const AMBIGUOUS_DECISION_PATTERN = /\bwhether this gap matters for (?:its|the company(?:['’]s)?|the product(?:['’]s)?) [a-z-]+ decision remains unverified\b/i
const BROKEN_POSSESSIVE_PATTERN = /\b(?:the company|the product|it)['’](?!s\b)/i
const AWKWARD_PRONOUN_BRIDGE_PATTERN = /\b(?:for|from|around|within) it,\s+(?:the|an?)\b/i
const MECHANICAL_BRIDGE_PATTERN = /\b(?:I used (?:that capability|that wording|it) to (?:keep|frame|support)|That specific capability is the starting point|That is the product basis used here|This helps narrow the scope|It helps define what the analysis should cover)\b/gi

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
  if ((input.body.match(MECHANICAL_BRIDGE_PATTERN) ?? []).length > 1) {
    issues.push("The message repeats mechanical evidence-to-analysis bridge language; keep only the strongest bridge")
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
  const evidenceBoundaries = input.body.match(EVIDENCE_BOUNDARY_PATTERN)?.length ?? 0
  if (evidenceBoundaries > 2) {
    issues.push("The message repeats evidence disclaimers; keep one concise boundary statement and use the remaining space for decision relevance")
  }

  const companyOrProductAnchors = [input.companyName, ...input.productNames]
  if (!containsAnchor(input.finalParagraph, companyOrProductAnchors, 2)) {
    issues.push(`The final CTA paragraph must include the exact company or product anchor: ${input.productNames[0] ?? input.companyName}`)
  }
  return issues
}

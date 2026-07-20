import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const TEMPLATE_OPENING_PATTERN = /\b(?:I(?:'|’)m reaching out|I am reaching out|I wanted to reach out|I came across|I noticed|I was impressed by|hope this message finds you well|touch base|quick introduction)\b/i
const PARTNERSHIP_PITCH_PATTERN = /\b(?:explore (?:a |the )?(?:partnership|collaboration)|potential partnership|partner with (?:you|your team)|collaborate with (?:you|your team)|work together|mutually beneficial|strategic fit|synerg(?:y|ies)|explore how we can)\b/i
const JAPANESE_BEHAVIOR_PATTERN = /\bJapanese (?:customers?|buyers?|consumers?|users?|companies|teams?|developers?|designers?|retailers?|businesses)\b.{0,100}\b(?:often|typically|generally|tend to|prefer|expect|need|rely on|evaluate|look for|care about|value)\b/i

function containsAnchor(text: string, anchors: string[]): boolean {
  const normalized = text.toLowerCase()
  return anchors.some((anchor) => anchor.trim().length >= 4 && normalized.includes(anchor.trim().toLowerCase()))
}

export function reviewManualFormBespokeStyle(input: {
  body: string
  openingParagraph: string
  finalParagraph: string
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

  const selectedFacts = [...new Map(input.selectedFacts.map((fact) => [fact.id, fact])).values()]
  const auditFacts = selectedFacts.filter((fact) => fact.id.startsWith("japan-audit-"))
  if (selectedFacts.length > 4) issues.push("Initial-interest copy must use no more than four evidence facts")
  if (input.includeEstimate && auditFacts.length !== 1) {
    issues.push("The estimate variant must use exactly one audited customer-path fact")
  } else if (!input.includeEstimate && auditFacts.length > 2) {
    issues.push("The no-estimate variant must use no more than two audited customer-path facts")
  }

  const genericJapaneseBehavior = JAPANESE_BEHAVIOR_PATTERN.test(input.body)
  const groundedJapaneseBehavior = selectedFacts.some((fact) => JAPANESE_BEHAVIOR_PATTERN.test(fact.statement))
  if (genericJapaneseBehavior && !groundedJapaneseBehavior) {
    issues.push("Generalized Japanese audience behavior is not grounded in a selected fact")
  }

  const ctaFocusAnchors = [
    input.productEvidence,
    ...input.productNames,
    ...auditFacts.flatMap((fact) => fact.anchors),
  ]
  if (!containsAnchor(input.finalParagraph, ctaFocusAnchors)) {
    issues.push("The CTA must name the selected product or customer-path focus")
  }
  return issues
}

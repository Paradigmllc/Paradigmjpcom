import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import {
  MANUAL_COPY_ARCHITECTURES,
  type ManualCopyArchitecture,
} from "./manual-japan-entry-copy-plan"

export interface ManualPersonalizationReview {
  passed: boolean
  score: number
  issues: string[]
  dimensions: {
    companySpecificity: number
    narrativeOriginality: number
    commercialRelevance: number
    languageIntegrity: number
  }
  coverage: {
    companyObservation: boolean
    japanSignal: boolean
    decisionBarrier: boolean
    opportunity: boolean
    solution: boolean
    routingCta: boolean
  }
  architecture: ManualCopyArchitecture | "invalid"
  reusableTemplateRisk: boolean
}

const FOREIGN_OR_HIDDEN_COPY = /(?:\bteks ini\b|\bakan tersembunyi\b|\bketika ukuran\b|\baccept all cookies\b|\bcookie settings\b|\bskip to (?:main )?content\b|\ben savoir plus\b|\bpolitique de confidentialit[ée]\b|\bpol[ií]tica de privacidad\b|\balle rechte vorbehalten\b|\bdatenschutz(?:erkl[aä]rung)?\b)/i
const DOM_OR_UI_COPY = /(?:display\s*:\s*none|visibility\s*:\s*hidden|aria-hidden|data-testid|className=|window\.innerWidth|screen size|hidden (?:text|when|on)|navigation menu|javascript (?:is|required|disabled))/i
const MALFORMED_ENGLISH = /(?:\bFor the (?:Enable|Build|Create|Get|Make|Allows?|Lets?)\b|\bthe (?:enable|allows?|lets?) (?:long|lower|better|faster)\b|\b(?:a|an) [A-Z]{2,}\s+(?:are|were)\b|\b(?:it|this|that) (?:are|were)\b|\b(?:that|where|because|as) (?:Customers|Users|Teams|Developers|Merchants|Buyers)\b|\b(?:can|may(?:\s+also)?|to)\s+(?:Explore|Book|Integrate|Identify|Leverage|Convert|Build|Create|Use|Get|Make|Start|Try|Schedule|Request)\b|\b(?:focused on|frames?|into|around)\s+(?:Assess|Evaluate|Test|Validate|Determine|Decide|Compare|Define|Whether|assess|evaluate|test|validate|determine|decide|compare|define)\b|\ba bounded test of whether\s+to\s+test\b|\ba bounded test of whether\b[^.!?]{0,140}\bshould be tested\b|\b(?:integrate|explore|identify|leverage|convert|build|create|use|get|make|start|try|schedule|request)-and-(?:integrate|explore|identify|leverage|convert|build|create|use|get|make|start|try|schedule|request)(?:-and-(?:integrate|explore|identify|leverage|convert|build|create|use|get|make|start|try|schedule|request))*\s+(?:workflow|path|process)\b|\.{2,})/
const STOCK_BODY = /(?:the public-page review leaves the .{0,80} decision unverified|the next decision is not a full launch|the next concrete step is not a launch assumption|a concise brief can stay within the verified product scope|the evidence can be organized into what the pages establish|so your team can assess that step with evidence|the surfaces an evaluator would use .{0,120} are not present|leaves (?:one|a) concrete (?:question|decision) open|the output would be a clear basis for|keep the focus on what the public pages establish and what requires direct market input|(?:current|documented|verified) product scope|(?:the|its|your) product['’]s documented capability|the documented capability(?: itself)?|(?:analysis|brief) (?:stays?|remains?) within the verified product scope|marks? every Japan assumption as unconfirmed|would scope that decision)/i
const STOCK_CTA = /(?:I can share a detailed Japan opportunity analysis based on this public evidence|Could you forward (?:this|it) to (?:the )?founder or (?:the )?person responsible for international growth|current market-readiness question|testable entry decision|market-entry question|entry-readiness decision|\b(?:for|around|about|of) (?:this|that|the) workflow\b)/i
const DECISION_LANGUAGE = /(?:decision|validate|validation|test|customer path|evaluation path|purchase path|onboarding|locali[sz]ation|positioning|readiness|unverified|not yet establish)/i
const SOLUTION_LANGUAGE = /(?:Japan opportunity (?:analysis|brief|snapshot)|Japan (?:entry|launch) (?:analysis|brief)|bounded Japan validation|analysis (?:would|can|could) (?:test|compare|define|separate|show|map|assess|frame))/i
const CTA_LANGUAGE = /(?:would\b|may I\b|could\b|who\b|should I\b|are you\b).+\?$/i
const CTA_DECISION_LANGUAGE = /(?:decision|customer path|evaluation|purchase|onboarding|locali[sz]ation|positioning|readiness|validation|what to test|who owns|right owner)/i

function blocks(message: string): string[] {
  const values = message.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean)
  if (/^hello\b/i.test(values[0] ?? "")) values.shift()
  if (/(?:best|kind|warm) regards/i.test(values.at(-1) ?? "")) values.pop()
  return values
}

function containsAnchor(value: string, anchors: string[]): boolean {
  const normalized = value.toLowerCase()
  return anchors.some((anchor) => anchor.trim().length >= 3 && normalized.includes(anchor.trim().toLowerCase()))
}

function selectedFactAppears(message: string, fact: JapanEntryPersonalizationFact): boolean {
  return containsAnchor(message, fact.anchors)
}

function clamp(value: number): number {
  return Math.max(0, Math.min(25, value))
}

export function reviewManualMessagePersonalization(input: {
  message: string
  companyName: string
  productNames?: string[]
  productEvidenceRendering: string
  selectedFacts: JapanEntryPersonalizationFact[]
  architecture: string
  personalizationAnchors: string[]
  solutionFocus: string
  questionDecisionAnchor: string
  maxPriorSimilarity: number
  includeEstimate: boolean
}): ManualPersonalizationReview {
  const bodyBlocks = blocks(input.message)
  const body = bodyBlocks.join(" ")
  const opening = bodyBlocks[0] ?? ""
  const final = bodyBlocks.at(-1) ?? ""
  const finalQuestion = final.match(/[^.!?]*\?\s*$/)?.[0] ?? ""
  const productAnchors = [input.companyName, ...(input.productNames ?? [])]
  const auditFacts = input.selectedFacts.filter((fact) => fact.id.startsWith("japan-audit-"))
  const modeledFacts = input.selectedFacts.filter((fact) => fact.id.startsWith("modeled-"))
  const architecture = MANUAL_COPY_ARCHITECTURES.includes(input.architecture as ManualCopyArchitecture)
    ? input.architecture as ManualCopyArchitecture
    : "invalid"
  const coverage = {
    companyObservation: containsAnchor(opening, productAnchors) && opening.toLowerCase().includes(input.productEvidenceRendering.toLowerCase()),
    japanSignal: auditFacts.some((fact) => selectedFactAppears(body, fact)),
    decisionBarrier: DECISION_LANGUAGE.test(body),
    opportunity: !input.includeEstimate || modeledFacts.length >= 2 && modeledFacts.every((fact) => selectedFactAppears(body, fact)),
    solution: SOLUTION_LANGUAGE.test(final) && /\bJapan\b/i.test(final),
    routingCta: containsAnchor(final, productAnchors)
      && CTA_LANGUAGE.test(finalQuestion)
      && (containsAnchor(finalQuestion, [input.questionDecisionAnchor]) || CTA_DECISION_LANGUAGE.test(finalQuestion)),
  }
  const unsafeLanguage = FOREIGN_OR_HIDDEN_COPY.test(body) || DOM_OR_UI_COPY.test(body) || MALFORMED_ENGLISH.test(body)
  const repeatedAnalysisOffer = bodyBlocks.filter((paragraph) => /\b(?:Japan opportunity analysis|Japan (?:entry|launch) brief|opportunity snapshot)\b/i.test(paragraph)).length > 1
  const templatePattern = STOCK_BODY.test(body) || STOCK_CTA.test(final) || repeatedAnalysisOffer
  const anchors = [...new Set(input.personalizationAnchors.map((value) => value.trim()).filter((value) => value.length >= 3))]
  const anchorCoverage = anchors.filter((anchor) => body.toLowerCase().includes(anchor.toLowerCase())).length
  const reusableTemplateRisk = templatePattern
    || input.maxPriorSimilarity >= 0.35
    || architecture === "invalid"
    || anchors.length < 2
    || anchorCoverage < Math.min(2, anchors.length)

  const dimensions = {
    companySpecificity: clamp(25
      - (coverage.companyObservation ? 0 : 10)
      - (coverage.japanSignal ? 0 : 8)
      - (anchorCoverage >= Math.min(2, anchors.length) ? 0 : 7)),
    narrativeOriginality: clamp(25
      - (templatePattern ? 14 : 0)
      - (input.maxPriorSimilarity >= 0.35 ? 10 : 0)
      - (architecture === "invalid" ? 8 : 0)),
    commercialRelevance: clamp(25
      - (coverage.decisionBarrier ? 0 : 8)
      - (coverage.solution ? 0 : 9)
      - (coverage.routingCta ? 0 : 8)),
    languageIntegrity: clamp(25 - (unsafeLanguage ? 25 : 0)),
  }
  const issues = [
    ...(!coverage.companyObservation ? ["The opening does not combine the company or product name with faithful product evidence"] : []),
    ...(!coverage.japanSignal ? ["The message does not use a verified company-specific Japan customer-path observation"] : []),
    ...(!coverage.decisionBarrier ? ["The message does not frame a concrete company-specific Japan decision or barrier"] : []),
    ...(!coverage.opportunity ? ["The estimate variant does not carry its selected modeled opportunity evidence"] : []),
    ...(!coverage.solution ? ["The final paragraph does not explain the tailored Japan analysis focus"] : []),
    ...(!coverage.routingCta ? [`The final CTA must contain one company or product anchor and name the '${input.questionDecisionAnchor}' meaning inside a single routing or permission question`] : []),
    ...(unsafeLanguage ? ["The form copy contains hidden-page text, non-English UI copy, or malformed English"] : []),
    ...(templatePattern ? ["The body contains a reusable stock sentence instead of company-specific reasoning"] : []),
    ...(input.maxPriorSimilarity >= 0.35 ? ["The body is too similar to a previously generated company message"] : []),
    ...(architecture === "invalid" ? ["The candidate did not follow a declared company-specific narrative architecture"] : []),
    ...(anchors.length < 2 || anchorCoverage < Math.min(2, anchors.length)
      ? ["The candidate lacks at least two grounded personalization anchors used in the body"]
      : []),
    ...(!input.solutionFocus.trim() ? ["The candidate did not retain a company-specific solution focus"] : []),
  ]
  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0)
  return {
    passed: issues.length === 0 && score >= 92 && Object.values(dimensions).every((value) => value >= 23),
    score,
    issues,
    dimensions,
    coverage,
    architecture,
    reusableTemplateRisk,
  }
}

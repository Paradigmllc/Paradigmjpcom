import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { isGroundedProductEvidence } from "./japan-entry-personalized-message-contract"

const TEMPLATE_OPENING_PATTERN = /\b(?:I(?:'|’)m reaching out|I am reaching out|I wanted to reach out|I came across|I noticed|I was impressed by|hope this message finds you well|touch base|quick introduction)\b/i
const PARTNERSHIP_PITCH_PATTERN = /\b(?:explore (?:a |the )?(?:partnership|collaboration)|potential partnership|partner with (?:you|your team)|collaborate with (?:you|your team)|work together|mutually beneficial|strategic fit|synerg(?:y|ies)|explore how we can)\b/i
const JAPANESE_BEHAVIOR_PATTERN = /\b(?:for\s+)?Japanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:customers?|buyers?|consumers?|users?|companies|teams?|developers?|designers?|retailers?|businesses)\b.{0,140}\b(?:often|typically|generally|tend to|prefer|expect|need|rely on|evaluate|assess|adopt|trial|select|choose|look for|care about|value|influence(?:s|d)?\s+(?:trial|purchase|buying|evaluation|decision)|overlook)\b/i
const UNVERIFIED_JAPANESE_SEGMENT_PATTERN = /(?:\bJapanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:customers?|buyers?|consumers?|users?|companies|teams?|developers?|designers?|retailers?|businesses|evaluators?)\b(?!\s+paths?\b)|\b(?:customers?|buyers?|consumers?|users?|companies|teams?|developers?|designers?|retailers?|businesses|evaluators?)\s+in Japan\b)/i
const STOCK_ROUTING_CTA_PATTERN = /\b(?:I can share a detailed Japan opportunity analysis based on this public evidence|Could you forward (?:this|it) to (?:the )?founder or (?:the )?person responsible for international growth)\b/i
const AMBIGUOUS_DECISION_PATTERN = /\bwhether this gap matters for (?:its|your product(?:['’]s)?|the company(?:['’]s)?|the product(?:['’]s)?) .{3,100}\bremains unverified\b/i
const OPENING_OUTCOME_BRIDGE_PATTERN = /,\s*(?:giving|allowing|helping|enabling|thereby|so that|which\s+(?:makes?|lets?|allows?|enables?|helps?))\b/i
const UNSUPPORTED_GAP_INFERENCE_PATTERN = /(?:\b(?:this|which) means\b|\bwhich makes? [^.]{0,90}\b(?:necessary|important|urgent|essential|immediate)\b|\b(?:the|that) gap suggests\b|\bJapanese lens\b|\bvalue proposition holds\b|\buser['’]s context is Japanese\b|\badoption depends\b|\bwithout friction\b|\bstrengthen(?:s|ing)? (?:its|their|the) reach\b|\btypical (?:discovery|evaluation|buying|purchase|adoption) behavio(?:u)?r\b|\bnon-English evaluators?\b|\bevaluators? progress\b|\b(?:developers?|evaluators?|users?)\b.{0,80}\b(?:encounter|access|understand|assess|evaluate)\w*\b.{0,35}\b(?:in Japanese|Japanese-language)\b|\bJapanese(?:[-\s]+speaking)?(?:\s+[a-z-]+){0,3}\s+(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,120}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b.{0,100}\b(?:discover|evaluate|assess|adopt|trial|choose|prefer|expect|need|rely|behav)|\b(?:discover(?:ed|ing)?|evaluat(?:e|ed|ing)|assess(?:ed|ing)?|adopt(?:ed|ing)?|trial(?:ed|ing)?|cho(?:ose|sen|osing)|prefer(?:red|ring)?|expect(?:ed|ing)?|need(?:ed|ing)?|rely|behav(?:e|ed|ing))\b.{0,120}\b(?:by\s+)?(?:audiences?|developers?|teams?|users?|buyers?|customers?)\b.{0,50}\bin Japan\b|\bwould change how\b.{0,120}\b(?:in Japan|Japanese)\b)/i
const BROKEN_POSSESSIVE_PATTERN = /\b(?:the company|the product|it)['’](?!s\b)/i
const AWKWARD_PRONOUN_BRIDGE_PATTERN = /\b(?:for|from|around|within) it,\s+(?:the|an?|that|this|one)\b/i
const MECHANICAL_BRIDGE_PATTERN = /\b(?:I used (?:that capability|that wording|it) to (?:keep|frame|support)|That specific capability is the starting point|That is the product basis used here|This helps narrow the scope|It helps define what the analysis should cover|This decision is grounded in (?:a|the) (?:specific|public-page|audited) finding)\b/gi
const MECHANICAL_CTA_PATTERN = /\baround the exact [^.?!]{2,80} evidence\b/i
const UNSUPPORTED_PRAISE_PATTERN = /\b(?:intuitive and personal|broad technical surface|seamless experience|compelling experience|impressive(?:ly)?|best-in-class|world-class)\b/i
const UNSUPPORTED_PRODUCT_OUTCOME_PATTERN = /\b(?:guide(?:s|d|ing)? shoppers? to (?:a )?purchase|driv(?:e|es|ing|en) conversion|boost(?:s|ed|ing)? (?:sales|revenue|conversion)|increas(?:e|es|ed|ing) (?:sales|revenue|conversion)|(?:lift|raise|increase|improve|affect|change|drive|strengthen)(?:s|d|ing)? [^.]{0,70}(?:trial|completion|conversion|adoption|readiness|revenue|sales)|help(?:s|ed|ing)? [^.]{0,60} (?:buy|purchase|convert)|remov(?:e|es|ed|ing) manual [^.]{0,40} steps|skip(?:s|ped|ping)? manual [^.]{0,50}(?:steps?|translation)|giv(?:e|es|ing) [^.]{0,50} (?:a )?unified view|test [^.]{0,60} in (?:their|a) native (?:context|language)|\bin one step\b|\brapid prototyping\b|\bunusually direct\b)\b/i
const EXPANDED_GAP_SURFACE_PATTERN = /\b(?:(?:did not show|did not find|lacked|showed no|absence of|no)\s+(?:a\s+)?|(?:verified|observed)\s+)(Japanese documentation|localized onboarding(?: flow)?|Japanese checkout|localized checkout|Japanese support desk|localized payment flow|onboarding or documentation gap)\b/i
const INVENTED_ENGLISH_ONLY_SURFACE_PATTERN = /\b(?:onboarding|documentation|user interface|UI)(?:\s*,\s*(?:onboarding|documentation|user interface|UI)|\s+(?:and|or)\s+(?:onboarding|documentation|user interface|UI)){0,3}\s+(?:remain(?:s)?|is|are)\s+English-only\b/i
const PRODUCT_CLAIM_SENTENCE_PATTERN = /\b(?:workflow|platform|product|tool|software|offering|capabilit\w*|generates?|converts?|supports?|integrates?|takes?|provides?|offers?|lets?|allows?|enables?|outputs?|inputs?|interface)\b/i
const PRODUCT_DECISION_SENTENCE_PATTERN = /\b(?:Japan(?:ese)?|decision|question|unverified|customer path|evaluation path|locali[sz])\b/i
const MALFORMED_ANALYSIS_FOCUS_PATTERN = /(?:\b(?:focused on|frames?|into|around)\s+(?:Assess|Evaluate|Test|Validate|Determine|Decide|Compare|Define|Whether|assess|evaluate|test|validate|determine|decide|compare|define)\b|\ba bounded test of whether\s+to\s+test\b|\ba bounded test of whether\b[^.!?]{0,140}\bshould be tested\b|\.{2,})/
const PUBLIC_ACTION_CTA_RESIDUE_PATTERN = /\b(?:(?:book|schedule|request)\s+(?:a|an|your)?\s*(?:demo|consultation|call|meeting)|get started|start (?:a )?(?:free )?trial|sign up|contact sales|talk to sales|learn more|shop now|buy now|order now)\b/i
const AWKWARD_CAPITALIZED_VERB_PATTERN = /\b(?:can|may(?:\s+also)?|to)\s+(?:Explore|Book|Integrate|Identify|Leverage|Convert|Build|Create|Use|Get|Make|Start|Try|Schedule|Request)\b/
const GENERIC_USER_SCENARIO_OPENING_PATTERN = /^(?:A|An)\s+[^.!?]{2,70}\s+using\s+[A-Z][^.!?]{1,80}\b(?:can|may|will)\b/i
const REUSABLE_ANALYSIS_REASONING_PATTERN = /(?:\bthe next concrete step is not a launch assumption\b|\bfor the documented [^.]{0,60} condition, the open decision\b|\bkeep the focus on what the public pages establish and what requires direct market input\b|\b(?:current|documented|verified) product scope\b|\b(?:analysis|brief) (?:stays?|remains?) within the verified product scope\b|\bmarks? every Japan assumption as unconfirmed\b|\bwould scope that decision\b|\bsurface(?:s|d)? a practical choice about where to place the next validation step\b)/i
const INVENTED_UNTESTED_SURFACE_PATTERN = /\b(?:product explanation|onboarding(?: experience| flow)?|documentation|user interface|UI|checkout|support)\b(?:.{0,60}\b(?:remain(?:s)?|is|are)\s+)?(?:untested|unverified|not tested)\b/i
const VAGUE_AUDIENCE_PATTERN = /\b(?:that|this|such|the) audience\b/i
const GENERIC_PRODUCT_REFERENCE_PATTERN = /\b(?:(?:the|its|your) product['’]s documented capability|the documented capability(?: itself)?)\b/i
const GENERIC_CTA_DECISION_PATTERN = /\b(?:current market-readiness question|testable entry decision|market-entry question|entry-readiness decision)\b/i
const CONTRIVED_WORKFLOW_LABEL_PATTERN = /\b(?:integrate|explore|identify|leverage|convert|build|create|use|get|make|start|try|schedule|request)-and-(?:integrate|explore|identify|leverage|convert|build|create|use|get|make|start|try|schedule|request)(?:-and-(?:integrate|explore|identify|leverage|convert|build|create|use|get|make|start|try|schedule|request))*\s+(?:workflow|path|process)\b/i
const EARLY_SENDER_ANALYSIS_PATTERN = /\b(?:Japan opportunity analysis|Japan (?:entry|launch) brief|opportunity snapshot|(?:an?|the|this|that|our) (?:analysis|brief|snapshot)|(?:analysis|brief|snapshot) (?:would|can|could|will|stays?|remains?|covers?|focuses?))\b/i
const VAGUE_CTA_WORKFLOW_PATTERN = /\b(?:for|around|about|of) (?:this|that|the) workflow\b/i
const LOCALIZATION_BOUNDARY_PATTERN = /\bbefore (?:wider|broader) localization(?: is considered)?\b/gi
const SPECULATIVE_PRODUCT_PATH_PATTERN = /(?:\b(?:(?:the|that|this)\s+)?(?:(?:core|current|existing|documented)\s+)?(?:capability|workflow|surface|offering|product)\b[^.!?]{0,120}\b(?:remains?|is|are|has not been|have not been)\s+(?:untested|unverified|verified)\b|\b(?:workflow|product|capability|offering|experience)\b[^.!?]{0,80}\b(?:currently\s+)?(?:lacks|has no|does not have)\b[^.!?]{0,60}\bJapanese-language\s+(?:customer\s+)?path\b|\b(?:current|existing|documented)\s+surface\b[^.!?]{0,100}\bleaves?\b[^.!?]{0,60}\bunverified\b|\bfrom\s+(?:an?\s+)?(?:initial|first)\s+(?:interaction|touchpoint|step)\s+to\b|\bwhat adjustments?\s+(?:might|may|would|could)\s+be needed\b|\bthrough that lens\b)/i
const LOCALIZED_SURFACE_PATTERN = /(?:\bJapanese-language\s+(?:interface|UI|experience|onboarding|documentation|checkout|support(?:\s+desk)?|payment(?:\s+flow)?)\b|\b(?:[a-z-]+\s+){0,2}(?:interface|UI|experience|onboarding|documentation|checkout|support)\s+in Japanese\b)/i
const VAGUE_WORKFLOW_REFERENCE_PATTERN = /\b(?:this|that|the)\s+workflow\b/i
const TEST_OUTCOME_PATTERN = /\b(?:technical|market|commercial|product|user|customer)\s+fit\b|\bfirst impressions?\b|\bmarket reception\b/i
const GENERIC_ANALYSIS_FOCUS_PATTERN = /\bproduct evaluation and Japanese positioning\b/i
const AUDIT_CAUSAL_EXTENSION_PATTERN = /\b(?:did not show|did not find|showed no|found no)\b[^.!?]{0,160},?\s+(?:so|therefore|which)\b/i

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
const CTA_SUBJECT_STOP_WORDS = new Set([
  "analysis", "and", "any", "clean", "collective", "conversion", "existing", "individual",
  "offering", "platform", "powered", "product", "production", "ready", "service", "software", "the", "this",
  "that", "with", "workflow",
])

function subjectToken(value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (token === "behavioural" || token === "behavioral") return "behaviour"
  if (token.endsWith("ies") && token.length > 5) return `${token.slice(0, -3)}y`
  if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3)
  if (token.endsWith("es") && token.length > 5) return token.slice(0, -2)
  if (token.endsWith("s") && token.length > 4) return token.slice(0, -1)
  return token
}

function subjectTokens(value: string): Set<string> {
  return new Set(value.split(/[^a-z0-9]+/i)
    .map(subjectToken)
    .filter((token) => token.length >= 3 && !CTA_SUBJECT_STOP_WORDS.has(token)))
}

export function reviewManualFormBespokeStyle(input: {
  body: string
  openingParagraph: string
  finalParagraph: string
  companyName: string
  productEvidence: string
  productNames: string[]
  selectedFacts: JapanEntryPersonalizationFact[]
  includeEstimate: boolean
  productContext?: string
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
  if (PUBLIC_ACTION_CTA_RESIDUE_PATTERN.test(input.body)) {
    issues.push("Public-site conversion CTA text is prohibited in the personalized message")
  }
  if (AWKWARD_CAPITALIZED_VERB_PATTERN.test(input.body)) {
    issues.push("A copied marketing imperative is embedded with invalid English capitalization")
  }
  if (GENERIC_USER_SCENARIO_OPENING_PATTERN.test(input.openingParagraph)) {
    issues.push("The opening invents a generic user scenario instead of stating the company's documented capability")
  }
  if (REUSABLE_ANALYSIS_REASONING_PATTERN.test(input.body)) {
    issues.push("Reusable analysis-process wording is prohibited; connect the product fact directly to one company-specific decision")
  }
  if (INVENTED_UNTESTED_SURFACE_PATTERN.test(input.body)) {
    issues.push("The message invents an untested product, onboarding, documentation, UI, checkout, or support surface")
  }
  if (VAGUE_AUDIENCE_PATTERN.test(input.body)) {
    issues.push("The message uses an undefined audience reference instead of naming the verified product path")
  }
  if (GENERIC_PRODUCT_REFERENCE_PATTERN.test(input.body)) {
    issues.push("The message uses a generic product-capability reference instead of naming the grounded workflow")
  }
  if (GENERIC_CTA_DECISION_PATTERN.test(input.finalParagraph)) {
    issues.push("The final CTA uses a generic market-entry label instead of naming the company-specific validation")
  }
  if (CONTRIVED_WORKFLOW_LABEL_PATTERN.test(input.body)) {
    issues.push("The message invents a hyphen-chained workflow label instead of using a natural grounded noun phrase")
  }
  if (VAGUE_CTA_WORKFLOW_PATTERN.test(input.finalParagraph)) {
    issues.push("The final CTA refers to a generic workflow instead of naming the grounded product subject")
  }
  if (SPECULATIVE_PRODUCT_PATH_PATTERN.test(input.body)) {
    issues.push("The message invents an unverified product surface, process span, or required adjustment beyond the audited public-page fact")
  }
  const localizedSurface = input.body.match(LOCALIZED_SURFACE_PATTERN)?.[0]
  const groundedSurface = localizedSurface
    ? [...input.selectedFacts.map((fact) => fact.statement), input.productContext ?? "", input.productEvidence]
        .some((source) => source.toLowerCase().includes(localizedSurface.toLowerCase()))
    : true
  if (!groundedSurface) {
    issues.push("The message invents a Japanese-language product surface not present in selected facts or product context")
  }
  if (VAGUE_WORKFLOW_REFERENCE_PATTERN.test(input.body)) {
    issues.push("The message uses a reusable workflow pronoun instead of repeating the grounded company-specific subject")
  }
  const testOutcome = input.body.match(TEST_OUTCOME_PATTERN)?.[0]
  const groundedTestOutcome = testOutcome
    ? [...input.selectedFacts.map((fact) => fact.statement), input.productContext ?? "", input.productEvidence]
        .some((source) => source.toLowerCase().includes(testOutcome.toLowerCase()))
    : true
  if (!groundedTestOutcome) {
    issues.push("The message invents a test outcome not present in selected facts or product context")
  }
  if (GENERIC_ANALYSIS_FOCUS_PATTERN.test(input.finalParagraph)) {
    issues.push("The final CTA uses a generic product-evaluation and positioning focus instead of the grounded company-specific decision")
  }
  if (AUDIT_CAUSAL_EXTENSION_PATTERN.test(input.body)) {
    issues.push("The audited public-page absence must be a standalone sentence and may not be extended into a causal inference")
  }
  const evidenceSubjectTokens = subjectTokens(input.productEvidence)
  const finalSubjectTokens = subjectTokens(input.finalParagraph)
  const subjectOverlap = [...evidenceSubjectTokens].filter((token) => finalSubjectTokens.has(token)).length
  if (evidenceSubjectTokens.size >= 2 && subjectOverlap < 2) {
    issues.push("The final CTA does not repeat enough of the grounded product subject to be company-specific")
  }
  if ((input.body.match(LOCALIZATION_BOUNDARY_PATTERN) ?? []).length > 1) {
    issues.push("The same wider-localization boundary is repeated in the decision paragraph and CTA")
  }
  const analysisOfferParagraphs = input.body.split(/\n\s*\n/).filter((paragraph) => /\b(?:Japan opportunity analysis|Japan (?:entry|launch) brief|opportunity snapshot)\b/i.test(paragraph)).length
  if (analysisOfferParagraphs > 1) {
    issues.push("The analysis offer is repeated across paragraphs; make it once in the final CTA")
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
  if (INVENTED_ENGLISH_ONLY_SURFACE_PATTERN.test(input.body)) {
    issues.push("The message invents specific English-only onboarding, documentation, or UI surfaces that were not audited")
  }
  if (MALFORMED_ANALYSIS_FOCUS_PATTERN.test(input.body)) {
    issues.push("The analysis focus contains an ungrammatical verb form and is not copy-ready English")
  }
  const bodyParagraphs = input.body.split(/\n\s*\n/)
  if (bodyParagraphs.slice(0, -1).some((paragraph) => EARLY_SENDER_ANALYSIS_PATTERN.test(paragraph))) {
    issues.push("The analysis is offered or described before the final CTA; state only the product-specific decision in earlier paragraphs")
  }
  const ungroundedProductClaim = input.productContext
    ? bodyParagraphs.slice(0, -1).flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/)).find((sentence) => (
        !sentence.toLowerCase().includes(input.productEvidence.toLowerCase())
        && PRODUCT_CLAIM_SENTENCE_PATTERN.test(sentence)
        && !PRODUCT_DECISION_SENTENCE_PATTERN.test(sentence)
        && !isGroundedProductEvidence(input.productContext ?? "", sentence)
      ))
    : null
  if (ungroundedProductClaim) {
    issues.push("An additional product claim is not grounded in the supplied public product context")
  }
  const evidenceWords = input.productEvidence.match(/[A-Za-z0-9-]+/g) ?? []
  const repeatedEvidenceWindow = evidenceWords.slice(0, -2).map((_, index) => evidenceWords.slice(index, index + 3).join(" "))
    .find((window) => window.split(" ").filter((word) => word.length >= 5).length >= 2 && exactOccurrences(input.openingParagraph, window) > 1)
  if (repeatedEvidenceWindow) {
    issues.push(`The opening repeats a product-evidence phrase instead of stating it once naturally: ${repeatedEvidenceWindow}`)
  }

  const selectedFacts = [...new Map(input.selectedFacts.map((fact) => [fact.id, fact])).values()]
  const auditFacts = selectedFacts.filter((fact) => fact.id.startsWith("japan-audit-"))
  const hasExplicitPublicAudit = input.body.split(/(?<=[.!?])\s+|\n+/).some((sentence) => (
    /\bpublic(?:ly|-page| pages?)?\b/i.test(sentence)
    && /\b(?:did not|does not|not shown|missing|absence|gap|found no|showed no)\b/i.test(sentence)
    && auditFacts.some((fact) => containsAnchor(sentence, fact.anchors))
  ))
  if (auditFacts.length > 0 && !hasExplicitPublicAudit) {
    issues.push("The verified Japan gap must retain public-page provenance and the audited absence in the same sentence")
  }
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
  const unverifiedJapaneseSegment = input.body.match(UNVERIFIED_JAPANESE_SEGMENT_PATTERN)?.[0]
  if (unverifiedJapaneseSegment && !selectedFacts.some((fact) => fact.statement.toLowerCase().includes(unverifiedJapaneseSegment.toLowerCase()))) {
    issues.push(`The message invents an unverified Japanese target segment: ${unverifiedJapaneseSegment}`)
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
  if (input.productEvidence.trim().length >= 4 && exactOccurrences(input.body, input.productEvidence) > 1) {
    issues.push("The exact product-evidence phrase must appear once in the opening and must not be repeated later")
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

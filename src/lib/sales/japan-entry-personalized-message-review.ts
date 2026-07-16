import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts";
import type { JapanEntryMessagePurpose } from "./japan-entry-personalized-message-prompts";
import {
  DEFAULT_INITIAL_INTEREST_OPTIONS,
  initialInterestClose,
  type JapanEntryInitialInterestOptions,
} from "./japan-entry-message-options";
import type { ManualMessageAngle } from "./manual-japan-entry-angle";

const BASE_MIN_WORDS = 100;
const BASE_MAX_WORDS = 160;
const ENHANCED_MIN_WORDS = 140;
const ENHANCED_MAX_WORDS = 215;

export type JapanEntryMessageMode = "quantified" | "audit";

export interface JapanEntryMessageReview {
  score: number;
  safetyScore: number;
  passed: boolean;
  issues: string[];
  wordCount: number;
  observedFactIds: string[];
  model: "deepseek-v4-pro";
  attempts: number;
  editorialScores: { specificity: number; naturalness: number; credibility: number; executiveRelevance: number };
  rationale: string;
  riskFlags: string[];
}

function numericTokens(value: string): string[] {
  return value.match(/(?:[$€£¥]\s*)?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
}

function normalizeNumber(value: string): string {
  return value.replace(/^[$€£¥]\s*/, "").replaceAll(",", "").replace(/%$/, "");
}

function containsUnresolvedPlaceholder(value: string): boolean {
  return [
    /\[[^\]\n]{1,80}\]/,
    /［[^］\n]{1,80}］/,
    /【[^】\n]{1,80}】/,
    /\{[^{}\n]{1,80}\}/,
    /｛[^｛｝\n]{1,80}｝/,
    /\$\{[^{}\n]{1,80}\}/,
    /<[^<>\n]{1,80}>/,
    /＜[^＜＞\n]{1,80}＞/,
    /__[A-Z0-9][A-Z0-9_ -]{0,78}__/i,
    /%[A-Z][A-Z0-9_]{1,78}%/,
    /\b(?:COMPANY_NAME|MONTHLY_VISITS|OPPORTUNITY_GAP|INSERT_[A-Z0-9_]+)\b/,
    /\b(?:TBD|TO\s+BE\s+(?:FILLED|CONFIRMED)|INSERT\s+(?:COMPANY|NUMBER|VALUE|METRIC)|PLACEHOLDER)\b/i,
  ].some((pattern) => pattern.test(value));
}

function includesAny(value: string, candidates: string[]): boolean {
  const lower = value.toLowerCase();
  return candidates.some((candidate) => candidate.length >= 3 && lower.includes(candidate.toLowerCase()));
}

export function getJapanEntryMessageMode(facts: JapanEntryPersonalizationFact[]): JapanEntryMessageMode {
  const ids = new Set(facts.map((fact) => fact.id));
  return ids.has("modeled-annual-opportunity-range")
    || (ids.has("modeled-japan-monthly-visits") && ids.has("modeled-monthly-opportunity-gap"))
    ? "quantified"
    : "audit";
}

export function reviewPersonalizedJapanEntryMessage(input: {
  message: string;
  companyName: string;
  productContext: string;
  productEvidence: string;
  factIds: string[];
  facts: JapanEntryPersonalizationFact[];
  purpose?: JapanEntryMessagePurpose;
  initialInterestOptions?: JapanEntryInitialInterestOptions;
  messageAngle?: ManualMessageAngle;
  candidateAngle?: string;
}): { passed: boolean; score: number; issues: string[]; wordCount: number; factIds: string[] } {
  const message = input.message.trim();
  const words = message.split(/\s+/).filter(Boolean);
  const paragraphs = message.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const issues: string[] = [];
  let score = 100;
  const factMap = new Map(input.facts.map((fact) => [fact.id, fact]));
  const selected = input.factIds.map((id) => factMap.get(id)).filter((fact): fact is JapanEntryPersonalizationFact => Boolean(fact));
  const productEvidence = input.productEvidence.trim();
  const purpose = input.purpose ?? "commercial_offer";
  const initialInterestOptions = input.initialInterestOptions ?? DEFAULT_INITIAL_INTEREST_OPTIONS;
  const customInitialInterest = purpose === "initial_interest" && Boolean(input.initialInterestOptions);
  const messageAngle = input.messageAngle;
  const enhanced = (!messageAngle || messageAngle === "competitor")
    && input.facts.some((fact) => fact.id.startsWith("verified-competitor-"));
  const minWords = customInitialInterest && initialInterestOptions.includePrice ? 110 : enhanced ? ENHANCED_MIN_WORDS : BASE_MIN_WORDS;
  const maxWords = customInitialInterest ? initialInterestOptions.includePrice ? 175 : 165 : enhanced ? ENHANCED_MAX_WORDS : BASE_MAX_WORDS;

  if (containsUnresolvedPlaceholder(message)) {
    issues.push("Unresolved template placeholder is prohibited");
    score = 0;
  }
  if (messageAngle && input.candidateAngle !== messageAngle) {
    issues.push(`Candidate angle must be exactly ${messageAngle}`);
    score -= 35;
  }

  if (!message.toLowerCase().includes(input.companyName.toLowerCase())) { issues.push("Company name is missing"); score -= 20; }
  if (!/Sato/i.test(message) || !/Paradigm LLC in Japan/i.test(message)) { issues.push("Sato and Paradigm LLC introduction is incomplete"); score -= 20; }
  if (purpose === "commercial_offer" && !/Japan Entry Package/i.test(message)) { issues.push("Japan Entry Package name is missing"); score -= 15; }
  if (productEvidence.length < 3 || !input.productContext.toLowerCase().includes(productEvidence.toLowerCase())) { issues.push("Product evidence is not grounded in the supplied product context"); score -= 30; }
  else if (!message.toLowerCase().includes(productEvidence.toLowerCase())) { issues.push("Grounded product evidence is missing from the message"); score -= 25; }
  if (selected.length === 0) { issues.push("No valid Japan-specific fact was selected"); score -= 40; }
  else if (!selected.some((fact) => includesAny(message, fact.anchors))) { issues.push("Selected Japan-specific fact is not reflected in the message"); score -= 30; }
  if (!selected.some((fact) => fact.id.startsWith("japan-audit-"))) { issues.push("No audited Japan-specific page observation was selected"); score -= 35; }
  const availableCompetitors = input.facts.filter((fact) => fact.id.startsWith("verified-competitor-"));
  const selectedCompetitor = selected.find((fact) => fact.id.startsWith("verified-competitor-"));
  if ((messageAngle === "competitor" || (!messageAngle && availableCompetitors.length > 0)) && !selectedCompetitor) { issues.push("The competitor angle requires a verified competitor fact"); score -= 35; }
  else if (selectedCompetitor && !includesAny(message, selectedCompetitor.anchors)) { issues.push("The exact verified competitor name is missing"); score -= 35; }
  const demandAvailable = input.facts.some((fact) => fact.id.startsWith("verified-japan-demand-"));
  const officialMarketAvailable = input.facts.some((fact) => fact.id === "official-japan-ecommerce-market");
  const requireCompetitivePressure = !messageAngle || messageAngle === "competitor";
  if (requireCompetitivePressure && demandAvailable && !selected.some((fact) => fact.id.startsWith("verified-japan-demand-"))) { issues.push("Verified product-specific Japan demand is available but was not selected"); score -= 35; }
  else if (requireCompetitivePressure && !demandAvailable && officialMarketAvailable && !selected.some((fact) => fact.id === "official-japan-ecommerce-market")) { issues.push("Official Japan market context is available but was not selected"); score -= 30; }
  const regulatoryAvailable = input.facts.some((fact) => fact.id.startsWith("regulatory-"));
  if (requireCompetitivePressure && regulatoryAvailable && !selected.some((fact) => fact.id.startsWith("regulatory-"))) { issues.push("Available regulatory pressure evidence was not selected"); score -= 35; }
  if (selected.some((fact) => fact.id.startsWith("regulatory-")) && !/(?:does not|doesn't|not a finding).{0,80}(?:establish|determine|show|mean).{0,60}(?:applicability|breach|obligation)/i.test(message)) {
    issues.push("Regulatory pressure must state that the screen does not establish applicability or breach"); score -= 40;
  }
  if (messageAngle === "opportunity" && !selected.some((fact) => fact.id === "modeled-annual-opportunity-range")) {
    issues.push("The opportunity angle requires the modeled annual opportunity range"); score -= 45;
  }
  const selectedPositioning = selected.find((fact) => fact.id === "prepared-positioning-concept");
  if (messageAngle === "mockup" && !selectedPositioning) {
    issues.push("The mockup angle requires a stored positioning concept"); score -= 45;
  } else if (messageAngle === "mockup" && (!/draft Japanese positioning concept/i.test(message) || !/unpublished/i.test(message))) {
    issues.push("The mockup angle must identify the positioning concept as an unpublished draft"); score -= 40;
  }

  if (paragraphs.length !== 4) { issues.push("Message must contain exactly four short paragraphs separated by blank lines"); score -= 25; }
  else {
    const expectedIntro = "Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.";
    const productParagraph = paragraphs[1] ?? "";
    if ((paragraphs[0] ?? "").replace("I'm", "I’m") !== expectedIntro) { issues.push("Paragraph 1 must use the approved Sato introduction exactly"); score -= 20; }
    if (
      !productParagraph.startsWith("I reviewed")
      || !productParagraph.toLowerCase().includes(input.companyName.toLowerCase())
      || !productParagraph.toLowerCase().includes(productEvidence.toLowerCase())
    ) { issues.push("Company name and grounded product understanding must be in paragraph 2"); score -= 15; }
    if (/\b(?:could|may|might|likely|appears? to|seems? to)\b/i.test(productParagraph)) { issues.push("Speculative product applicability is prohibited in paragraph 2"); score -= 40; }
    if (/\bJapan(?:ese)?\b/i.test(productParagraph) && !/\bJapan(?:ese)?\b/i.test(input.productContext)) { issues.push("Japan-specific product claims must come from the supplied product context"); score -= 40; }
    const unsupportedProductTerms = ["need", "needs", "pain point", "pain points", "challenge", "challenges", "demand"];
    const unsupportedTerms = unsupportedProductTerms.filter(
      (term) => productParagraph.toLowerCase().includes(term) && !input.productContext.toLowerCase().includes(term),
    );
    if (unsupportedTerms.length > 0) { issues.push(`Unsupported product-context terms in paragraph 2: ${unsupportedTerms.join(", ")}`); score -= 35; }
    if (!selected.some((fact) => includesAny(paragraphs[2] ?? "", fact.anchors))) { issues.push("Japan-specific diagnosis must be in paragraph 3"); score -= 20; }
    if (purpose === "initial_interest") {
      const approvedClose = initialInterestClose(initialInterestOptions);
      if (paragraphs[3] !== approvedClose) { issues.push("Initial-interest CTA must use the approved permission-based close exactly"); score -= 25; }
    } else {
      const approvedOfferLead = "Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap.";
      if (!paragraphs[3]?.startsWith(approvedOfferLead) || !/\$\s?12,?000|12,?000\s?(?:USD|dollars)/i.test(paragraphs[3] ?? "")) { issues.push("Offer and CTA must use the approved non-invented transition in paragraph 4"); score -= 20; }
    }
  }

  if (words.length < minWords || words.length > maxWords) { issues.push(`Message must be ${minWords}-${maxWords} words`); score -= 15; }
  if (purpose === "commercial_offer") {
    if (!/\$\s?12,?000|12,?000\s?(?:USD|dollars)/i.test(message)) { issues.push("$12,000 price is missing"); score -= 15; }
    if (!/(?:paid\s+upfront|upfront\s+payment)/i.test(message)) { issues.push("Upfront payment condition is missing"); score -= 10; }
    if (!/(?:first\s+)?six\s+months/i.test(message)) { issues.push("First six months inclusion is missing"); score -= 10; }
  } else if (initialInterestOptions.includePrice) {
    if (!/\$\s?12,?000|12,?000\s?(?:USD|dollars)/i.test(message)) { issues.push("The selected initial-interest variant requires the $12,000 price"); score -= 30; }
    if (!/(?:first\s+)?six\s+months/i.test(message)) { issues.push("The selected initial-interest variant requires the included first six months"); score -= 25; }
    if (/(?:founding compan|normally\s+\$|after\s+(?:the\s+)?first\s+six\s+months|month\s*7|continuation\s+(?:fee|price)|paid\s+upfront)/i.test(message)) {
      issues.push("Unsupported scarcity, continuation pricing, or payment terms are prohibited"); score -= 45;
    }
  } else if (/\$\s?\d|paid\s+upfront|upfront\s+payment|first\s+six\s+months|Japan Entry Package|15-minute|book(?:ing)?\s+(?:link|a call)/i.test(message)) {
    issues.push(customInitialInterest
      ? "This initial-interest variant must not include commercial terms, package scope, or a call offer"
      : "Initial-interest message must not include commercial terms, package scope, or a call offer"); score -= 45;
  }
  if (!/\?\s*$/.test(message)) { issues.push("Message must end with a yes/no question"); score -= 10; }
  if (!/public(?:ly)?/i.test(message)) { issues.push("Public-page provenance is missing"); score -= 10; }
  const hasAnalysisCta = /(?:detailed(?: Japan opportunity)? (?:analysis|report)|one-page Japan Opportunity Snapshot)/i.test(message);
  const hasCallCta = /15-minute (?:call|conversation|meeting)/i.test(message);
  if (!hasAnalysisCta && !hasCallCta) { issues.push("Low-pressure report or 15-minute CTA is missing"); score -= 10; }
  if (hasAnalysisCta && hasCallCta) { issues.push("CTA must offer either a detailed analysis or a 15-minute call, not both"); score -= 10; }
  if (/(?:https?:\/\/|www\.|\[[^\]]+\]\([^)]+\)|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i.test(message)) { issues.push("URL, link, or email is prohibited"); score = 0; }
  const messageWithoutNegatedGuarantees = message.replace(
    /(?:\bnot|\bno|\bdoes not|\bdo not|\bcannot|\bnever)\s+(?:be\s+)?guarantee(?:d|s|ing)?/gi,
    "",
  );
  if (
    /(?:\bROI\b|return on investment|gross profit|attachment|download|document)/i.test(message)
    || /\bguarantee(?:d|s|ing)?\b/i.test(messageWithoutNegatedGuarantees)
  ) { issues.push("Unsupported performance or attached-material claim is prohibited"); score -= 40; }
  if (/(?:local entity|entity setup|incorporat(?:e|ion)|legal advice|tax advice|regulatory approval|licen[cs]e approval|visa support|non-?compliant|violat(?:e|es|ion)|illegal)/i.test(message)) { issues.push("Unsupported legal, entity, or violation claim is prohibited"); score -= 45; }
  const promotionalMatch = message.match(/(?:logical next step|given that reach|i noticed your site|unlock|untapped|huge opportunity|game.changer|revolutionary|stands? out|stood out|aligns well|real need|many japanese|critical to (?:building|build)|capture (?:part of|the|that traffic)|tailored roadmap|data-driven approach|based in Tokyo|lead Japan market entry|consultancy|rel(?:y|ies) on|optimi[sz]e stock|reduce waste|with confidence|likely bounce|creates uncertainty)/i);
  if (promotionalMatch) {
    issues.push("Generic, promotional, invented, or unsupported market phrasing is prohibited");
    issues.push(`Remove prohibited phrase exactly: ${promotionalMatch[0]}`);
    score -= 35;
  }
  if (/(?:\bpotentially\b|may cause|could cause|caus(?:e|es|ing)|early exit|drop[- ]?off|abandon(?:ment|ed|ing)?|creates? friction|affects? conversion|lost (?:sale|sales|revenue)|buyer support|Japanese-language touchpoints)/i.test(message)) { issues.push("Unsupported causal inference or invented package deliverable is prohibited"); score -= 45; }

  const selectedModeled = selected.some((fact) => fact.id.startsWith("modeled-"));
  const mode = getJapanEntryMessageMode(input.facts);
  if (mode === "quantified") {
    const selectedIds = new Set(selected.map((fact) => fact.id));
    const annualAvailable = input.facts.some((fact) => fact.id === "modeled-annual-opportunity-range");
    const useAnnual = purpose === "initial_interest" && initialInterestOptions.includeEstimate && annualAvailable;
    if (useAnnual && !selectedIds.has("modeled-annual-opportunity-range")) { issues.push("The selected estimate variant requires the modeled annual opportunity range"); score -= 45; }
    if (!useAnnual && (!selectedIds.has("modeled-japan-monthly-visits") || !selectedIds.has("modeled-monthly-opportunity-gap"))) { issues.push("Quantified mode requires both Japan visits and opportunity-gap facts"); score -= 45; }
    if (useAnnual && !/(?:public signals?|public-signal)/i.test(message)) { issues.push("The annual estimate must state its public-signal basis"); score -= 35; }
    if (useAnnual && !/(?:not observed revenue|not measured revenue)/i.test(message)) { issues.push("The annual estimate must state that it is not observed revenue"); score -= 35; }
    if (useAnnual && !/(?:not guaranteed|no guarantee|not.*guaranteed performance)/i.test(message)) { issues.push("The annual estimate must state that performance is not guaranteed"); score -= 35; }
    if (!useAnnual && (!/public-signal/i.test(message) || !/not measured (?:analytics|traffic|revenue|sales)/i.test(message))) { issues.push("Quantified mode must identify public-signal estimates as not measured analytics"); score -= 35; }
    const diagnosisNumbers = new Set(numericTokens(paragraphs[2] ?? "").map(normalizeNumber));
    const missingModeledValues = selected
      .filter((fact) => fact.id.startsWith("modeled-"))
      .flatMap((fact) => numericTokens(fact.statement).map(normalizeNumber))
      .filter((token) => !diagnosisNumbers.has(token));
    if (missingModeledValues.length > 0) {
      issues.push(`Required modeled values are missing from paragraph 3: ${[...new Set(missingModeledValues)].join(", ")}`);
      score -= 45;
    }
    const opportunityFact = selected.find((fact) => fact.id === (useAnnual ? "modeled-annual-opportunity-range" : "modeled-monthly-opportunity-gap"));
    const requiredCurrencyValue = opportunityFact?.anchors.find((anchor) => /^\$\d/.test(anchor));
    if (requiredCurrencyValue && !(paragraphs[2] ?? "").includes(requiredCurrencyValue)) {
      issues.push("The modeled opportunity value must retain its exact USD currency label in paragraph 3");
      score -= 35;
    }
  } else if (selectedModeled || (purpose === "initial_interest" && initialInterestOptions.includeEstimate)) { issues.push("Audit mode must not use incomplete modeled metrics"); score -= 45; }
  if (purpose === "initial_interest" && !initialInterestOptions.includeEstimate && selectedModeled) { issues.push("The selected no-estimate variant must not use modeled metrics"); score -= 45; }
  if (selectedModeled && !/(?:model(?:ed)?|estimate[sd]?|planning assumption)/i.test(message)) { issues.push("Modeled metrics are not clearly labeled as estimates"); score -= 40; }
  if (/\brevenue\b/i.test(message) && !selected.some((fact) => fact.id === "modeled-monthly-opportunity-gap" || fact.id === "modeled-annual-opportunity-range")) { issues.push("Revenue wording is not tied to the modeled opportunity fact"); score -= 40; }

  const allowed = new Set(purpose === "commercial_offer" || (purpose === "initial_interest" && initialInterestOptions.includePrice) ? ["12000", "6", "15"] : []);
  for (const fact of selected) for (const token of numericTokens(fact.statement)) allowed.add(normalizeNumber(token));
  const unsupported = numericTokens(message).map(normalizeNumber).filter((token) => !allowed.has(token));
  if (unsupported.length > 0) { issues.push(`Unsupported numeric claims: ${[...new Set(unsupported)].join(", ")}`); score -= 35; }
  return { passed: issues.length === 0, score: Math.max(0, score), issues, wordCount: words.length, factIds: selected.map((fact) => fact.id) };
}

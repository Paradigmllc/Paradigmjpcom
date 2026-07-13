import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts";

const MIN_WORDS = 100;
const MAX_WORDS = 160;

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
  return ids.has("modeled-japan-monthly-visits") && ids.has("modeled-monthly-opportunity-gap") ? "quantified" : "audit";
}

export function reviewPersonalizedJapanEntryMessage(input: {
  message: string;
  companyName: string;
  productContext: string;
  productEvidence: string;
  factIds: string[];
  facts: JapanEntryPersonalizationFact[];
}): { passed: boolean; score: number; issues: string[]; wordCount: number; factIds: string[] } {
  const message = input.message.trim();
  const words = message.split(/\s+/).filter(Boolean);
  const paragraphs = message.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const issues: string[] = [];
  let score = 100;
  const factMap = new Map(input.facts.map((fact) => [fact.id, fact]));
  const selected = input.factIds.map((id) => factMap.get(id)).filter((fact): fact is JapanEntryPersonalizationFact => Boolean(fact));
  const productEvidence = input.productEvidence.trim();

  if (containsUnresolvedPlaceholder(message)) {
    issues.push("Unresolved template placeholder is prohibited");
    score = 0;
  }

  if (!message.toLowerCase().includes(input.companyName.toLowerCase())) { issues.push("Company name is missing"); score -= 20; }
  if (!/Sato/i.test(message) || !/Paradigm LLC in Japan/i.test(message)) { issues.push("Sato and Paradigm LLC introduction is incomplete"); score -= 20; }
  if (!/Japan Entry Package/i.test(message)) { issues.push("Japan Entry Package name is missing"); score -= 15; }
  if (productEvidence.length < 3 || !input.productContext.toLowerCase().includes(productEvidence.toLowerCase())) { issues.push("Product evidence is not grounded in the supplied product context"); score -= 30; }
  else if (!message.toLowerCase().includes(productEvidence.toLowerCase())) { issues.push("Grounded product evidence is missing from the message"); score -= 25; }
  if (selected.length === 0) { issues.push("No valid Japan-specific fact was selected"); score -= 40; }
  else if (!selected.some((fact) => includesAny(message, fact.anchors))) { issues.push("Selected Japan-specific fact is not reflected in the message"); score -= 30; }
  if (!selected.some((fact) => fact.id.startsWith("japan-audit-"))) { issues.push("No audited Japan-specific page observation was selected"); score -= 35; }

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
    const approvedOfferLead = "Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap.";
    if (!paragraphs[3]?.startsWith(approvedOfferLead) || !/\$\s?12,?000|12,?000\s?(?:USD|dollars)/i.test(paragraphs[3] ?? "")) { issues.push("Offer and CTA must use the approved non-invented transition in paragraph 4"); score -= 20; }
  }

  if (words.length < MIN_WORDS || words.length > MAX_WORDS) { issues.push(`Message must be ${MIN_WORDS}-${MAX_WORDS} words`); score -= 15; }
  if (!/\$\s?12,?000|12,?000\s?(?:USD|dollars)/i.test(message)) { issues.push("$12,000 price is missing"); score -= 15; }
  if (!/(?:paid\s+upfront|upfront\s+payment)/i.test(message)) { issues.push("Upfront payment condition is missing"); score -= 10; }
  if (!/(?:first\s+)?six\s+months/i.test(message)) { issues.push("First six months inclusion is missing"); score -= 10; }
  if (!/\?\s*$/.test(message)) { issues.push("Message must end with a yes/no question"); score -= 10; }
  if (!/public(?:ly)?/i.test(message)) { issues.push("Public-page provenance is missing"); score -= 10; }
  const hasAnalysisCta = /detailed(?: Japan opportunity)? (?:analysis|report)/i.test(message);
  const hasCallCta = /15-minute (?:call|conversation|meeting)/i.test(message);
  if (!hasAnalysisCta && !hasCallCta) { issues.push("Low-pressure report or 15-minute CTA is missing"); score -= 10; }
  if (hasAnalysisCta && hasCallCta) { issues.push("CTA must offer either a detailed analysis or a 15-minute call, not both"); score -= 10; }
  if (/(?:https?:\/\/|www\.|\[[^\]]+\]\([^)]+\)|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i.test(message)) { issues.push("URL, link, or email is prohibited"); score = 0; }
  if (/(?:\bROI\b|return on investment|gross profit|guarantee[sd]?|attachment|download|document)/i.test(message)) { issues.push("Unsupported performance or attached-material claim is prohibited"); score -= 40; }
  if (/(?:local entity|entity setup|incorporat(?:e|ion)|legal advice|tax advice|regulatory approval|licen[cs]e approval|visa support|non-?compliant|violat(?:e|es|ion)|illegal)/i.test(message)) { issues.push("Unsupported legal, entity, or violation claim is prohibited"); score -= 45; }
  if (/(?:logical next step|given that reach|i noticed your site|unlock|untapped|huge opportunity|game.changer|revolutionary|stood out|aligns well|real need|many japanese|critical to (?:building|build)|capture (?:part of|the|that traffic)|tailored roadmap|data-driven approach|based in Tokyo|lead Japan market entry|consultancy|rel(?:y|ies) on|optimi[sz]e stock|reduce waste|with confidence|likely bounce|creates uncertainty)/i.test(message)) { issues.push("Generic, promotional, invented, or unsupported market phrasing is prohibited"); score -= 35; }
  if (/(?:\bpotentially\b|may cause|could cause|caus(?:e|es|ing)|early exit|drop[- ]?off|abandon(?:ment|ed|ing)?|creates? friction|affects? conversion|lost (?:sale|sales|revenue)|buyer support|Japanese-language touchpoints)/i.test(message)) { issues.push("Unsupported causal inference or invented package deliverable is prohibited"); score -= 45; }

  const selectedModeled = selected.some((fact) => fact.id.startsWith("modeled-"));
  const mode = getJapanEntryMessageMode(input.facts);
  if (mode === "quantified") {
    const selectedIds = new Set(selected.map((fact) => fact.id));
    if (!selectedIds.has("modeled-japan-monthly-visits") || !selectedIds.has("modeled-monthly-opportunity-gap")) { issues.push("Quantified mode requires both Japan visits and opportunity-gap facts"); score -= 45; }
    if (!/public-signal/i.test(message) || !/not measured (?:analytics|traffic|revenue|sales)/i.test(message)) { issues.push("Quantified mode must identify public-signal estimates as not measured analytics"); score -= 35; }
    const diagnosisNumbers = new Set(numericTokens(paragraphs[2] ?? "").map(normalizeNumber));
    const missingModeledValues = selected
      .filter((fact) => fact.id.startsWith("modeled-"))
      .flatMap((fact) => numericTokens(fact.statement).map(normalizeNumber))
      .filter((token) => !diagnosisNumbers.has(token));
    if (missingModeledValues.length > 0) {
      issues.push(`Required modeled values are missing from paragraph 3: ${[...new Set(missingModeledValues)].join(", ")}`);
      score -= 45;
    }
    const opportunityFact = selected.find((fact) => fact.id === "modeled-monthly-opportunity-gap");
    const requiredCurrencyValue = opportunityFact?.anchors.find((anchor) => /^\$\d/.test(anchor));
    if (requiredCurrencyValue && !(paragraphs[2] ?? "").includes(requiredCurrencyValue)) {
      issues.push("The modeled opportunity value must retain its exact USD currency label in paragraph 3");
      score -= 35;
    }
  } else if (selectedModeled) { issues.push("Audit mode must not use incomplete modeled metrics"); score -= 45; }
  if (selectedModeled && !/(?:model(?:ed)?|estimate[sd]?|planning assumption)/i.test(message)) { issues.push("Modeled metrics are not clearly labeled as estimates"); score -= 40; }
  if (/\brevenue\b/i.test(message) && !selected.some((fact) => fact.id === "modeled-monthly-opportunity-gap")) { issues.push("Revenue wording is not tied to the modeled opportunity fact"); score -= 40; }

  const allowed = new Set(["12000", "6", "15"]);
  for (const fact of selected) for (const token of numericTokens(fact.statement)) allowed.add(normalizeNumber(token));
  const unsupported = numericTokens(message).map(normalizeNumber).filter((token) => !allowed.has(token));
  if (unsupported.length > 0) { issues.push(`Unsupported numeric claims: ${[...new Set(unsupported)].join(", ")}`); score -= 35; }
  return { passed: issues.length === 0, score: Math.max(0, score), issues, wordCount: words.length, factIds: selected.map((fact) => fact.id) };
}

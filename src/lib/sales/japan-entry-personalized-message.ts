import { z } from "zod";
import { callDeepSeek, type DeepSeekResponse } from "@/lib/deepseek";
import type { BusinessModel, JapanEntryProjection } from "./japan-entry-projection";
import { criticMessages, generationMessages } from "./japan-entry-personalized-message-prompts";
import type { JapanEntryMessagePurpose } from "./japan-entry-personalized-message-prompts";
import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options";
import type { ManualMessageAngle } from "./manual-japan-entry-angle";
import type { ManualOutreachPlaybook, ManualPositioningConcept } from "./manual-japan-entry-playbook";
import { withManualFormCopyReadyEnvelope } from "./manual-japan-entry-copy-envelope";
import { buildPersonalizedMessageRepairInput } from "./japan-entry-personalized-message-repair";
import { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message-facts";
import {
  manualMessageSimilarity,
  reviewManualMessageDistinctness,
  type ManualMessageSimilarityReview,
  type PriorManualMessage,
} from "./manual-japan-entry-message-similarity";
import {
  getJapanEntryMessageMode,
  reviewPersonalizedJapanEntryMessage,
  type JapanEntryMessageReview,
} from "./japan-entry-personalized-message-review";
import {
  buildManualCtaContracts,
  resolveManualCtaAnchors,
} from "./manual-japan-entry-cta-contract";
import {
  addDeepSeekUsage,
  callDeepSeekStructured,
  type DeepSeekStructuredCaller,
} from "./japan-entry-personalized-message-structured";
import { recoverManualInitialInterestCandidate, selectBestManualCandidateInspection } from "./manual-japan-entry-candidate-recovery";
import {
  isInitialInterestProductEvidenceSafe,
  selectGroundedProductEvidence,
  selectSupplementalProductEvidence,
} from "./japan-entry-personalized-message-contract";
import { boundedGeneratedEvidence } from "./manual-generated-evidence-schema"
export { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message-facts";
export type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts";
export { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review";
export type { JapanEntryMessageReview } from "./japan-entry-personalized-message-review";
const MODEL = "deepseek-v4-pro" as const;
const EDITORIAL_PASS_SCORE = 92;
const EDITORIAL_DIMENSION_FLOOR = 23;
const INITIAL_SAFETY_REPAIR_LIMIT = 3;
export interface PersonalizedJapanEntryMessageResult {
  ok: boolean;
  message?: string;
  review?: JapanEntryMessageReview;
  usage?: DeepSeekResponse["usage"];
  error?: string;
  strategy?: ManualMessageStrategy;
  candidates?: ManualGeneratedMessageCandidate[];
  selectedIndex?: number;
  evidencePack?: ManualMessageEvidence[];
  similarity?: ManualMessageSimilarityReview;
}
export interface ManualMessageStrategy {
  primaryObservation: string;
  whyNow: string;
  japaneseSegment: string;
  japanGap: string;
  opportunityAngle: string;
  offerRelevance: string;
  tone: string;
  cta: string;
  countryAdaptation: string;
  prohibitedClaims: string[];
}
export interface ManualGeneratedMessageCandidate {
  message: string;
  factIds: string[];
  productEvidence: string;
  productEvidenceRendering: string;
  angle: string;
  openingStyle: string;
  diagnosticFocus: string;
  ctaType: string;
}
export interface ManualMessageEvidence {
  id: string;
  statement: string;
  source: string;
  confidence: number;
  classification: "observed" | "modeled" | "hypothesis";
}
interface GenerateInput {
  companyName: string;
  industry: string | null;
  productContext: string | null;
  productNames?: string[];
  targetCountry: string | null;
  businessModel: BusinessModel;
  projection?: JapanEntryProjection;
  audit: unknown;
  competitorAnalysis?: unknown;
  purpose?: JapanEntryMessagePurpose;
  initialInterestOptions?: JapanEntryInitialInterestOptions;
  messageAngle?: ManualMessageAngle;
  outreachPlaybook?: ManualOutreachPlaybook;
  positioningConcept?: ManualPositioningConcept | null;
  observedFacts?: string[];
  sourceUrl?: string | null;
  priorMessages?: PriorManualMessage[];
}

type LlmCaller = DeepSeekStructuredCaller;
const candidateSchema = z.object({
  message: z.string().min(1).max(1_800),
  fact_ids: z.array(z.string().min(1)).min(1).max(6),
  product_evidence: boundedGeneratedEvidence(180),
  product_evidence_rendering: boundedGeneratedEvidence(240),
  angle: z.string().min(1).max(300),
  opening_style: z.string().min(1).max(120).default("legacy_unspecified"),
  diagnostic_focus: z.string().min(1).max(240).default("legacy_unspecified"),
  cta_type: z.enum(["permission_to_send", "right_person", "founder_forward", "legacy_unspecified"]).default("legacy_unspecified"),
}).strict();

const prohibitedClaimsSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value
    .split(/(?:\n|;|\s+\|\s+)/)
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string().min(1).max(180)).max(12));

const strategySchema = z.object({
  primary_observation: z.string().min(1).max(400),
  why_now: z.string().min(1).max(400),
  japanese_segment: z.string().min(1).max(300),
  japan_gap: z.string().min(1).max(400),
  opportunity_angle: z.string().min(1).max(300),
  offer_relevance: z.string().min(1).max(400),
  tone: z.string().min(1).max(160),
  cta: z.string().min(1).max(240),
  country_adaptation: z.string().min(1).max(240),
  prohibited_claims: prohibitedClaimsSchema,
}).strict();

const generationSchema = z.object({
  strategy: strategySchema.optional(),
  candidates: z.array(candidateSchema).min(1).max(3),
}).strict();

const repairSchema = z.object({
  candidate: candidateSchema,
}).strict();

const riskFlagsSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return /^(?:none|no risks?|n\/a)$/i.test(normalized) ? [] : [normalized];
}, z.array(z.string().min(1).max(160)).max(5));

const criticSchema = z.object({
  selected_index: z.number().int().min(0).max(2),
  product_evidence_faithful: z.boolean(),
  scores: z.object({
    specificity: z.number().int().min(0).max(25),
    naturalness: z.number().int().min(0).max(25),
    credibility: z.number().int().min(0).max(25),
    executive_relevance: z.number().int().min(0).max(25),
  }).strict(),
  rationale: z.string().min(1).max(1_200),
  risk_flags: riskFlagsSchema,
}).strict();

function buildReview(input: {
  selected: { candidate: z.infer<typeof candidateSchema>; safety: ReturnType<typeof reviewPersonalizedJapanEntryMessage> };
  criticized: z.infer<typeof criticSchema>;
  attempts: number;
  similarity?: ManualMessageSimilarityReview;
  candidateCount: number;
}): JapanEntryMessageReview {
  const editorial = {
    specificity: input.criticized.scores.specificity,
    naturalness: input.criticized.scores.naturalness,
    credibility: input.criticized.scores.credibility,
    executiveRelevance: input.criticized.scores.executive_relevance,
  };
  const score = Object.values(editorial).reduce((sum, value) => sum + value, 0);
  const riskFlags = input.criticized.risk_flags.filter(
    (flag) => !/(?:abrupt pricing|price placement|pricing insertion|generic (?:call to action|cta)|shallow product|flow|tone|style)/i.test(flag),
  );
  const evidenceFaithful = input.criticized.product_evidence_faithful;
  const passed = score >= EDITORIAL_PASS_SCORE
    && Object.values(editorial).every((value) => value >= EDITORIAL_DIMENSION_FLOOR)
    && riskFlags.length === 0
    && evidenceFaithful;
  const issues = [
    ...(score < EDITORIAL_PASS_SCORE || Object.values(editorial).some((value) => value < EDITORIAL_DIMENSION_FLOOR) || riskFlags.length > 0
      ? [`DeepSeek V4 Pro editorial score did not meet the ${EDITORIAL_PASS_SCORE}/100 production quality bar`]
      : []),
    ...(!evidenceFaithful
      ? ["DeepSeek V4 Pro did not verify the English product-evidence rendering as faithful to the public source phrase"]
      : []),
  ];
  return {
    score,
    safetyScore: input.selected.safety.score,
    passed,
    issues: passed ? [] : issues,
    wordCount: input.selected.safety.wordCount,
    observedFactIds: input.selected.safety.factIds,
    model: MODEL,
    attempts: input.attempts,
    editorialScores: editorial,
    rationale: input.criticized.rationale,
    riskFlags,
    uniquenessScore: Math.round((1 - (input.similarity?.maxSimilarity ?? 0)) * 100),
    maxSimilarity: input.similarity?.maxSimilarity ?? 0,
    matchedMessageId: input.similarity?.matchedMessageId ?? null,
    candidateCount: input.candidateCount,
  };
}

function publicStrategy(value: z.infer<typeof strategySchema> | undefined, input: GenerateInput): ManualMessageStrategy {
  return {
    primaryObservation: value?.primary_observation ?? input.productContext ?? "Public product evidence",
    whyNow: value?.why_now ?? "Japan applicability remains unverified",
    japaneseSegment: value?.japanese_segment ?? "Relevant Japanese buyers require validation",
    japanGap: value?.japan_gap ?? "The checked public pages do not yet establish a Japan customer path",
    opportunityAngle: value?.opportunity_angle ?? "Evidence-led Japan validation",
    offerRelevance: value?.offer_relevance ?? "A public-evidence opportunity analysis can test the hypothesis",
    tone: value?.tone ?? "Direct, respectful, and low pressure",
    cta: value?.cta ?? "Permission to share the analysis",
    countryAdaptation: value?.country_adaptation ?? "Business-formal without nationality assumptions",
    prohibitedClaims: value?.prohibited_claims ?? ["Measured demand", "Guaranteed revenue", "Legal conclusions"],
  };
}

function publicCandidate(candidate: z.infer<typeof candidateSchema>): ManualGeneratedMessageCandidate {
  return {
    message: candidate.message.trim(),
    factIds: candidate.fact_ids,
    productEvidence: candidate.product_evidence,
    productEvidenceRendering: candidate.product_evidence_rendering,
    angle: candidate.angle,
    openingStyle: candidate.opening_style,
    diagnosticFocus: candidate.diagnostic_focus,
    ctaType: candidate.cta_type,
  };
}

function hasDifferentiationMetadata(candidate: z.infer<typeof candidateSchema>): boolean {
  return candidate.opening_style !== "legacy_unspecified"
    && candidate.diagnostic_focus !== "legacy_unspecified"
    && candidate.cta_type !== "legacy_unspecified";
}

export async function generatePersonalizedJapanEntryMessage(
  input: GenerateInput,
  caller: LlmCaller = callDeepSeek,
): Promise<PersonalizedJapanEntryMessageResult> {
  const productContext = input.productContext?.trim() ?? "";
  if (productContext.length < 12) {
    return { ok: false, error: "A grounded public product description is required for personalized copy" };
  }
  const facts = buildJapanEntryPersonalizationFacts(input.audit, input.businessModel, input.projection, {
    competitorAnalysis: input.competitorAnalysis,
    positioningConcept: input.positioningConcept,
    companyFacts: input.observedFacts,
    companySourceUrl: input.sourceUrl,
  });
  if (facts.length === 0) {
    return { ok: false, error: "No high-signal Japan-specific public fact is available for personalized copy" };
  }

  const purpose = input.purpose ?? "commercial_offer";
  const mode = purpose === "initial_interest" && input.initialInterestOptions?.includeEstimate !== true
    ? "audit"
    : getJapanEntryMessageMode(facts);
  let totalAttempts = 0;
  let totalUsage: DeepSeekResponse["usage"];

  const ctaAnchors = resolveManualCtaAnchors({ companyName: input.companyName, productNames: input.productNames, facts });
  const requiredInitialProductEvidence = purpose === "initial_interest"
    ? selectGroundedProductEvidence({ companyName: input.companyName, productContext, productNames: input.productNames })
    : null;
  const supplementalInitialProductEvidence = purpose === "initial_interest"
    ? selectSupplementalProductEvidence({ companyName: input.companyName, productContext, productNames: input.productNames })
    : null;
  const ctaContracts = purpose === "initial_interest"
    ? buildManualCtaContracts({
        companyName: input.companyName,
        ...ctaAnchors,
        priorMessages: input.priorMessages ?? [],
      })
    : [];

  const deterministicInspection = (candidate: z.infer<typeof candidateSchema>) => ({
    safety: reviewPersonalizedJapanEntryMessage({
      message: candidate.message,
      companyName: input.companyName,
      productContext,
      productNames: input.productNames,
      productEvidence: candidate.product_evidence,
      productEvidenceRendering: candidate.product_evidence_rendering,
      factIds: candidate.fact_ids,
      facts,
      purpose,
      initialInterestOptions: input.initialInterestOptions,
      messageAngle: input.messageAngle,
      candidateAngle: candidate.angle,
    }),
    similarity: purpose === "initial_interest"
      ? reviewManualMessageDistinctness({ message: candidate.message, companyName: input.companyName, priorMessages: input.priorMessages ?? [] })
      : { passed: true, maxSimilarity: 0, matchedMessageId: null, matchedCompany: null, reasons: [] },
  });

  const inspectCandidate = (rawCandidate: z.infer<typeof candidateSchema>, candidateIndex = 0) => {
    const evidenceLocked = purpose === "initial_interest"
      && requiredInitialProductEvidence
      && isInitialInterestProductEvidenceSafe(requiredInitialProductEvidence)
      && (!isInitialInterestProductEvidenceSafe(rawCandidate.product_evidence) || !isInitialInterestProductEvidenceSafe(rawCandidate.product_evidence_rendering))
      ? {
          ...rawCandidate,
          product_evidence: requiredInitialProductEvidence,
          product_evidence_rendering: requiredInitialProductEvidence,
        }
      : rawCandidate;
    const enveloped = purpose === "initial_interest" ? withManualFormCopyReadyEnvelope(evidenceLocked, input.companyName) : evidenceLocked;
    const initial = deterministicInspection(enveloped);
    if (purpose !== "initial_interest" || ctaContracts.length === 0 || (initial.safety.passed && initial.similarity.passed)) {
      return { candidate: enveloped, safety: initial.safety, similarity: initial.similarity };
    }
    const recoverAndInspect = (variationIndex: number) => {
      const candidate = recoverManualInitialInterestCandidate({
          candidate: enveloped,
          companyName: input.companyName,
          productNames: input.productNames,
          facts,
          supplementalProductEvidence: supplementalInitialProductEvidence,
          customerPathAnchor: ctaAnchors.customerPathAnchor,
          contract: ctaContracts[(candidateIndex + variationIndex) % ctaContracts.length] ?? ctaContracts[0]!,
          issues: initial.safety.issues,
          similarityPassed: initial.similarity.passed,
          variationIndex,
        });
      return { candidate, ...deterministicInspection(candidate) };
    };
    return selectBestManualCandidateInspection(recoverAndInspect);
  };

  const generated = await callDeepSeekStructured({
    stage: "generation",
    messages: generationMessages(input, facts, mode),
    schema: purpose === "initial_interest" ? generationSchema.extend({ strategy: strategySchema }) : generationSchema,
    caller,
  });
  totalAttempts += generated.attempts;
  totalUsage = addDeepSeekUsage(totalUsage, generated.usage);
  if (!generated.ok) {
    return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro candidate generation failed: ${generated.error}` };
  }
  if (purpose === "initial_interest" && !generated.data.strategy) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro did not return the required company-specific message strategy" };
  }
  if (purpose === "initial_interest" && generated.data.candidates.some((candidate) => !hasDifferentiationMetadata(candidate))) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro did not return complete candidate differentiation metadata" };
  }

  const reviewedCandidates = generated.data.candidates.map((candidate, index) => inspectCandidate(candidate, index));
  let valid: typeof reviewedCandidates = [];
  for (const item of reviewedCandidates) {
    if (!item.safety.passed || !item.similarity.passed) continue;
    const duplicatesPriorCandidate = purpose === "initial_interest" && valid.some((prior) =>
      prior.candidate.opening_style === item.candidate.opening_style
      || prior.candidate.diagnostic_focus === item.candidate.diagnostic_focus
      || prior.candidate.cta_type === item.candidate.cta_type
      || manualMessageSimilarity(item.candidate.message, prior.candidate.message, [input.companyName]) >= 0.45);
    if (!duplicatesPriorCandidate) valid.push(item);
  }
  if (valid.length === 0) {
    let repairTarget = [...reviewedCandidates].sort((a, b) => b.safety.score - a.safety.score)[0];
    if (!repairTarget) return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro returned no candidate to repair" };
    for (let repairPass = 1; repairPass <= INITIAL_SAFETY_REPAIR_LIMIT; repairPass += 1) {
      const repaired = await callDeepSeekStructured({
        stage: "repair",
        messages: generationMessages(input, facts, mode, buildPersonalizedMessageRepairInput({
          candidate: repairTarget.candidate,
          issues: [...repairTarget.safety.issues, ...repairTarget.similarity.reasons],
          wordCount: repairTarget.safety.wordCount,
          purpose,
          includePrice: input.initialInterestOptions?.includePrice === true,
        })),
        schema: repairSchema,
        caller,
      });
      totalAttempts += repaired.attempts;
      totalUsage = addDeepSeekUsage(totalUsage, repaired.usage);
      if (!repaired.ok) return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro candidate repair failed: ${repaired.error}` };
      const inspected = inspectCandidate(repaired.data.candidate);
      const passed = inspected.safety.passed && inspected.similarity.passed
        && (purpose !== "initial_interest" || hasDifferentiationMetadata(inspected.candidate));
      if (passed) {
        valid = [inspected];
        break;
      }
      repairTarget = inspected;
      if (repairPass === INITIAL_SAFETY_REPAIR_LIMIT) return {
        ok: false,
        usage: totalUsage,
        error: `The strongest DeepSeek V4 Pro candidate failed the deterministic safety or uniqueness gate after ${INITIAL_SAFETY_REPAIR_LIMIT} targeted repairs: ${[...inspected.safety.issues, ...inspected.similarity.reasons].join("; ")}`,
      };
    }
  }

  const criticize = async (candidates: typeof valid) => {
    const criticized = await callDeepSeekStructured({
      stage: "critic",
      messages: criticMessages(
        input.companyName,
        facts,
        candidates.map((item) => item.candidate),
        mode,
        purpose,
        input.initialInterestOptions,
        input.messageAngle,
        input.productNames,
        true,
      ),
      schema: criticSchema,
      caller,
    });
    totalAttempts += criticized.attempts;
    totalUsage = addDeepSeekUsage(totalUsage, criticized.usage);
    return criticized;
  };

  const criticized = await criticize(valid);
  if (!criticized.ok) {
    return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro editorial review failed: ${criticized.error}` };
  }
  const selected = valid[criticized.data.selected_index];
  if (!selected) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro critic selected an invalid candidate" };
  }

  const strategy = publicStrategy(generated.data.strategy, input);
  const evidencePack = facts.map((fact): ManualMessageEvidence => ({
    id: fact.id,
    statement: fact.statement,
    source: fact.source,
    confidence: fact.confidence,
    classification: fact.id.startsWith("modeled-") ? "modeled" : fact.id.startsWith("company-observed-") || fact.id.startsWith("japan-audit-") ? "observed" : "hypothesis",
  }));
  let finalCandidate = selected;
  let finalReview = buildReview({ selected, criticized: criticized.data, attempts: totalAttempts, similarity: selected.similarity, candidateCount: valid.length });
  let repairIssues = finalReview.issues;
  for (let repairPass = 1; !finalReview.passed && repairPass <= 2; repairPass += 1) {
    const exactCtaAnchor = input.productNames?.map((name) => name.trim()).find(Boolean) ?? input.companyName;
    const editorialFeedback = `Score ${finalReview.score}/100. ${finalReview.rationale}. Material risks: ${finalReview.riskFlags.join(", ") || "none"}. Rewrite substantially: make paragraph 1 a concrete product observation using the required and supplemental product evidence; connect only the verified Japan audit gap to a decision question without claiming buyer behaviour, product-market fit, demand, impact, or causation; mention the exact company or product anchor '${exactCtaAnchor}' no more than twice in the body and exactly once in the final CTA paragraph; let the final question use a natural pronoun instead of repeating the anchor; keep only one concise evidence-boundary statement; and make the final paragraph contain the exact audited customer-path anchor supplied in required_cta_contract while saying what Japan customer-path decision the analysis informs. Add no facts, URLs, sources, unsupported modals, or unchanged sentences. Raise every dimension to at least ${EDITORIAL_DIMENSION_FLOOR}.`;
    const repaired = await callDeepSeekStructured({
      stage: "repair",
      messages: generationMessages(input, facts, mode, buildPersonalizedMessageRepairInput({
        candidate: finalCandidate.candidate,
        issues: repairIssues,
        wordCount: finalCandidate.safety.wordCount,
        purpose,
        includePrice: input.initialInterestOptions?.includePrice === true,
        editorialFeedback,
      })),
      schema: repairSchema,
      caller,
    });
    totalAttempts += repaired.attempts;
    totalUsage = addDeepSeekUsage(totalUsage, repaired.usage);
    if (!repaired.ok) return { ok: false, review: finalReview, usage: totalUsage, error: `DeepSeek V4 Pro candidate repair failed: ${repaired.error}` };
    const inspected = inspectCandidate(repaired.data.candidate);
    if (!inspected.safety.passed || !inspected.similarity.passed || (purpose === "initial_interest" && !hasDifferentiationMetadata(inspected.candidate))) {
      repairIssues = [...inspected.safety.issues, ...inspected.similarity.reasons];
      if (repairPass === 2) return { ok: false, review: finalReview, usage: totalUsage, error: `DeepSeek V4 Pro targeted repair failed the deterministic safety or uniqueness gate: ${repairIssues.join("; ")}` };
      finalCandidate = inspected;
      continue;
    }
    const repairedCritic = await criticize([inspected]);
    if (!repairedCritic.ok) return { ok: false, review: finalReview, usage: totalUsage, error: `DeepSeek V4 Pro repaired-draft review failed: ${repairedCritic.error}` };
    finalCandidate = inspected;
    finalReview = buildReview({ selected: inspected, criticized: repairedCritic.data, attempts: totalAttempts, similarity: inspected.similarity, candidateCount: 1 });
    repairIssues = finalReview.issues;
  }
  if (!finalReview.passed) return { ok: false, review: finalReview, usage: totalUsage, error: finalReview.issues[0] };
  return {
    ok: true,
    message: finalCandidate.candidate.message.trim(),
    review: finalReview,
    usage: totalUsage,
    strategy,
    candidates: finalCandidate === selected ? valid.map((item) => publicCandidate(item.candidate)) : [publicCandidate(finalCandidate.candidate)],
    selectedIndex: finalCandidate === selected ? criticized.data.selected_index : 0,
    evidencePack,
    similarity: finalCandidate.similarity,
  };
}

import { z } from "zod";
import { callDeepSeek, type DeepSeekMessage, type DeepSeekResponse } from "@/lib/deepseek";
import type { BusinessModel, JapanEntryProjection } from "./japan-entry-projection";
import { criticMessages, generationMessages } from "./japan-entry-personalized-message-prompts";
import type { JapanEntryMessagePurpose } from "./japan-entry-personalized-message-prompts";
import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options";
import type { ManualMessageAngle } from "./manual-japan-entry-angle";
import type { ManualOutreachPlaybook, ManualPositioningConcept } from "./manual-japan-entry-playbook";
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

export { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message-facts";
export type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts";
export { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review";
export type { JapanEntryMessageReview } from "./japan-entry-personalized-message-review";

const MODEL = "deepseek-v4-pro" as const;
const EDITORIAL_PASS_SCORE = 92;
const EDITORIAL_DIMENSION_FLOOR = 22;
const STAGE_MAX_TOKENS = {
  generation: 4_000,
  repair: 2_400,
  critic: 1_200,
} as const;

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

type LlmCaller = typeof callDeepSeek;

const candidateSchema = z.object({
  message: z.string().min(1).max(1_800),
  fact_ids: z.array(z.string().min(1)).min(1).max(6),
  product_evidence: z.string().min(3).max(180),
  angle: z.string().min(1).max(300),
  opening_style: z.string().min(1).max(120).default("legacy_unspecified"),
  diagnostic_focus: z.string().min(1).max(240).default("legacy_unspecified"),
  cta_type: z.enum(["permission_to_send", "right_person", "founder_forward", "legacy_unspecified"]).default("legacy_unspecified"),
}).strict();

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
  prohibited_claims: z.array(z.string().min(1).max(180)).max(12),
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
  scores: z.object({
    specificity: z.number().int().min(0).max(25),
    naturalness: z.number().int().min(0).max(25),
    credibility: z.number().int().min(0).max(25),
    executive_relevance: z.number().int().min(0).max(25),
  }).strict(),
  rationale: z.string().min(1).max(1_200),
  risk_flags: riskFlagsSchema,
}).strict();

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

function addUsage(
  current?: DeepSeekResponse["usage"],
  next?: DeepSeekResponse["usage"],
): DeepSeekResponse["usage"] {
  if (!current && !next) return undefined;
  return {
    prompt_tokens: (current?.prompt_tokens ?? 0) + (next?.prompt_tokens ?? 0),
    completion_tokens: (current?.completion_tokens ?? 0) + (next?.completion_tokens ?? 0),
    cache_hit_tokens: (current?.cache_hit_tokens ?? 0) + (next?.cache_hit_tokens ?? 0),
    cache_miss_tokens: (current?.cache_miss_tokens ?? 0) + (next?.cache_miss_tokens ?? 0),
  };
}

async function callStructured<T>(input: {
  stage: keyof typeof STAGE_MAX_TOKENS;
  messages: DeepSeekMessage[];
  schema: z.ZodType<T>;
  caller: LlmCaller;
}): Promise<
  | { ok: true; data: T; attempts: number; usage?: DeepSeekResponse["usage"] }
  | { ok: false; attempts: number; error: string; usage?: DeepSeekResponse["usage"] }
> {
  let lastError = `${input.stage} failed`;
  let usage: DeepSeekResponse["usage"];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: DeepSeekResponse;
    try {
      response = await input.caller(input.messages, {
        model: MODEL,
        modelPolicy: "strict",
        responseFormat: "json_object",
        temperature: input.stage === "generation" ? 0.55 : input.stage === "repair" ? 0.35 : 0.1,
        maxTokens: STAGE_MAX_TOKENS[input.stage],
        thinking: "disabled",
        timeoutMs: 120_000,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${input.stage} call failed`;
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} threw:`, error);
      continue;
    }
    usage = addUsage(usage, response?.usage);
    if (!response?.ok || !response.text) {
      lastError = response?.error ?? `${input.stage} returned an empty response`;
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} failed:`, lastError);
      continue;
    }
    try {
      return { ok: true, data: input.schema.parse(parseJson(response.text)), attempts: attempt, usage };
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${input.stage} returned invalid JSON`;
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} JSON invalid:`, lastError);
    }
  }
  return { ok: false, attempts: 3, error: lastError, usage };
}

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
  const passed = score >= EDITORIAL_PASS_SCORE
    && Object.values(editorial).every((value) => value >= EDITORIAL_DIMENSION_FLOOR)
    && riskFlags.length === 0;
  return {
    score,
    safetyScore: input.selected.safety.score,
    passed,
    issues: passed ? [] : [`DeepSeek V4 Pro editorial score did not meet the ${EDITORIAL_PASS_SCORE}/100 production quality bar`],
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

  const mode = getJapanEntryMessageMode(facts);
  const purpose = input.purpose ?? "commercial_offer";
  let totalAttempts = 0;
  let totalUsage: DeepSeekResponse["usage"];
  let repairUsed = false;

  const inspectCandidate = (candidate: z.infer<typeof candidateSchema>) => ({
    candidate,
    safety: reviewPersonalizedJapanEntryMessage({
      message: candidate.message,
      companyName: input.companyName,
      productContext,
      productEvidence: candidate.product_evidence,
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

  const generated = await callStructured({
    stage: "generation",
    messages: generationMessages(input, facts, mode),
    schema: generationSchema,
    caller,
  });
  totalAttempts += generated.attempts;
  totalUsage = addUsage(totalUsage, generated.usage);
  if (!generated.ok) {
    return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro candidate generation failed: ${generated.error}` };
  }
  if (purpose === "initial_interest" && !generated.data.strategy) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro did not return the required company-specific message strategy" };
  }
  if (purpose === "initial_interest" && generated.data.candidates.some((candidate) => !hasDifferentiationMetadata(candidate))) {
    return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro did not return complete candidate differentiation metadata" };
  }

  const reviewedCandidates = generated.data.candidates.map(inspectCandidate);
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
    const strongest = [...reviewedCandidates].sort((a, b) => b.safety.score - a.safety.score)[0];
    if (!strongest) {
      return { ok: false, usage: totalUsage, error: "DeepSeek V4 Pro returned no candidate to repair" };
    }
    const repaired = await callStructured({
      stage: "repair",
      messages: generationMessages(input, facts, mode, {
        candidate: strongest.candidate,
        issues: [...strongest.safety.issues, ...strongest.similarity.reasons],
      }),
      schema: repairSchema,
      caller,
    });
    repairUsed = true;
    totalAttempts += repaired.attempts;
    totalUsage = addUsage(totalUsage, repaired.usage);
    if (!repaired.ok) {
      return { ok: false, usage: totalUsage, error: `DeepSeek V4 Pro candidate repair failed: ${repaired.error}` };
    }
    const repairedCandidate = inspectCandidate(repaired.data.candidate);
    if (!repairedCandidate.safety.passed || !repairedCandidate.similarity.passed || (purpose === "initial_interest" && !hasDifferentiationMetadata(repairedCandidate.candidate))) {
      return {
        ok: false,
        usage: totalUsage,
        error: `The strongest DeepSeek V4 Pro candidate failed the deterministic safety or uniqueness gate after one targeted repair: ${[...repairedCandidate.safety.issues, ...repairedCandidate.similarity.reasons].join("; ")}`,
      };
    }
    valid = [repairedCandidate];
  }

  const criticize = async (candidates: typeof valid) => {
    const criticized = await callStructured({
      stage: "critic",
      messages: criticMessages(
        input.companyName,
        facts,
        candidates.map((item) => item.candidate),
        mode,
        purpose,
        input.initialInterestOptions,
        input.messageAngle,
      ),
      schema: criticSchema,
      caller,
    });
    totalAttempts += criticized.attempts;
    totalUsage = addUsage(totalUsage, criticized.usage);
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
  const review = buildReview({ selected, criticized: criticized.data, attempts: totalAttempts, similarity: selected.similarity, candidateCount: valid.length });
  if (review.passed) {
    return {
      ok: true,
      message: selected.candidate.message.trim(),
      review,
      usage: totalUsage,
      strategy,
      candidates: valid.map((item) => publicCandidate(item.candidate)),
      selectedIndex: criticized.data.selected_index,
      evidencePack,
      similarity: selected.similarity,
    };
  }
  if (repairUsed) {
    return { ok: false, review, usage: totalUsage, error: review.issues[0] };
  }

  const repaired = await callStructured({
    stage: "repair",
    messages: generationMessages(input, facts, mode, {
      candidate: selected.candidate,
      issues: review.issues,
      editorialFeedback: `Score ${review.score}/100. ${review.rationale}. Material risks: ${review.riskFlags.join(", ") || "none"}. Raise every dimension to at least ${EDITORIAL_DIMENSION_FLOOR}.`,
    }),
    schema: repairSchema,
    caller,
  });
  totalAttempts += repaired.attempts;
  totalUsage = addUsage(totalUsage, repaired.usage);
  if (!repaired.ok) {
    return { ok: false, review, usage: totalUsage, error: `DeepSeek V4 Pro candidate repair failed: ${repaired.error}` };
  }
  const repairedCandidate = inspectCandidate(repaired.data.candidate);
  if (!repairedCandidate.safety.passed || !repairedCandidate.similarity.passed || (purpose === "initial_interest" && !hasDifferentiationMetadata(repairedCandidate.candidate))) {
    return {
      ok: false,
      usage: totalUsage,
      error: `DeepSeek V4 Pro targeted repair failed the deterministic safety or uniqueness gate: ${[...repairedCandidate.safety.issues, ...repairedCandidate.similarity.reasons].join("; ")}`,
    };
  }

  const repairedCritic = await criticize([repairedCandidate]);
  if (!repairedCritic.ok) {
    return { ok: false, review, usage: totalUsage, error: `DeepSeek V4 Pro repaired-draft review failed: ${repairedCritic.error}` };
  }
  const repairedReview = buildReview({
    selected: repairedCandidate,
    criticized: repairedCritic.data,
    attempts: totalAttempts,
    similarity: repairedCandidate.similarity,
    candidateCount: 1,
  });
  if (!repairedReview.passed) {
    return { ok: false, review: repairedReview, usage: totalUsage, error: repairedReview.issues[0] };
  }
  return {
    ok: true,
    message: repairedCandidate.candidate.message.trim(),
    review: repairedReview,
    usage: totalUsage,
    strategy,
    candidates: [publicCandidate(repairedCandidate.candidate)],
    selectedIndex: 0,
    evidencePack,
    similarity: repairedCandidate.similarity,
  };
}

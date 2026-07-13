import { z } from "zod";
import { callDeepSeek, type DeepSeekMessage, type DeepSeekResponse } from "@/lib/deepseek";
import type { BusinessModel, JapanEntryProjection } from "./japan-entry-projection";
import { criticMessages, generationMessages } from "./japan-entry-personalized-message-prompts";
import { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message-facts";
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

export interface PersonalizedJapanEntryMessageResult {
  ok: boolean;
  message?: string;
  review?: JapanEntryMessageReview;
  usage?: DeepSeekResponse["usage"];
  error?: string;
}

interface GenerateInput {
  companyName: string;
  industry: string | null;
  productContext: string | null;
  targetCountry: string | null;
  businessModel: BusinessModel;
  projection: JapanEntryProjection;
  audit: unknown;
}

type LlmCaller = typeof callDeepSeek;

const candidateSchema = z.object({
  message: z.string().min(1).max(1_200),
  fact_ids: z.array(z.string().min(1)).min(1).max(3),
  product_evidence: z.string().min(3).max(180),
  angle: z.string().min(1).max(120),
}).strict();

const generationSchema = z.object({
  candidates: z.array(candidateSchema).length(3),
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
  rationale: z.string().min(1).max(600),
  risk_flags: riskFlagsSchema,
}).strict();

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

async function callStructured<T>(input: {
  stage: string;
  messages: DeepSeekMessage[];
  schema: z.ZodType<T>;
  caller: LlmCaller;
}): Promise<
  | { ok: true; data: T; attempts: number; usage?: DeepSeekResponse["usage"] }
  | { ok: false; attempts: number; error: string }
> {
  let lastError = `${input.stage} failed`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: DeepSeekResponse;
    try {
      response = await input.caller(input.messages, {
        model: MODEL,
        modelPolicy: "strict",
        responseFormat: "json_object",
        temperature: input.stage === "generation" ? 0.55 : 0.1,
        maxTokens: 8_000,
        timeoutMs: 120_000,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${input.stage} call failed`;
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} threw:`, error);
      continue;
    }
    if (!response?.ok || !response.text) {
      lastError = response?.error ?? `${input.stage} returned an empty response`;
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} failed:`, lastError);
      continue;
    }
    try {
      return { ok: true, data: input.schema.parse(parseJson(response.text)), attempts: attempt, usage: response.usage };
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${input.stage} returned invalid JSON`;
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} JSON invalid:`, lastError);
    }
  }
  return { ok: false, attempts: 3, error: lastError };
}

function buildReview(input: {
  selected: { candidate: z.infer<typeof candidateSchema>; safety: ReturnType<typeof reviewPersonalizedJapanEntryMessage> };
  criticized: z.infer<typeof criticSchema>;
  attempts: number;
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
  };
}

export async function generatePersonalizedJapanEntryMessage(
  input: GenerateInput,
  caller: LlmCaller = callDeepSeek,
): Promise<PersonalizedJapanEntryMessageResult> {
  const productContext = input.productContext?.trim() ?? "";
  if (productContext.length < 12) {
    return { ok: false, error: "A grounded public product description is required for personalized copy" };
  }
  const facts = buildJapanEntryPersonalizationFacts(input.audit, input.businessModel, input.projection);
  if (facts.length === 0) {
    return { ok: false, error: "No high-signal Japan-specific public fact is available for personalized copy" };
  }

  const mode = getJapanEntryMessageMode(facts);
  let feedback: string | undefined;
  let totalAttempts = 0;
  let lastReview: JapanEntryMessageReview | undefined;

  for (let round = 1; round <= 2; round += 1) {
    const generated = await callStructured({
      stage: "generation",
      messages: generationMessages(input, facts, mode, feedback),
      schema: generationSchema,
      caller,
    });
    totalAttempts += generated.attempts;
    if (!generated.ok) {
      return { ok: false, error: `DeepSeek V4 Pro candidate generation failed: ${generated.error}` };
    }

    const valid = generated.data.candidates.map((candidate) => ({
      candidate,
      safety: reviewPersonalizedJapanEntryMessage({
        message: candidate.message,
        companyName: input.companyName,
        productContext,
        productEvidence: candidate.product_evidence,
        factIds: candidate.fact_ids,
        facts,
      }),
    })).filter((item) => item.safety.passed);

    if (valid.length === 0) {
      if (round === 1) {
        feedback = "All candidates failed deterministic grounding, formatting, or evidence-mode requirements. Follow every paragraph, fact-id, number-labeling, and CTA constraint exactly.";
        continue;
      }
      return { ok: false, error: "All DeepSeek V4 Pro candidates failed the deterministic safety gate after one repair pass" };
    }

    const criticized = await callStructured({
      stage: "critic",
      messages: criticMessages(input.companyName, facts, valid.map((item) => item.candidate), mode),
      schema: criticSchema,
      caller,
    });
    totalAttempts += criticized.attempts;
    if (!criticized.ok) {
      return { ok: false, error: `DeepSeek V4 Pro editorial review failed: ${criticized.error}` };
    }
    const selected = valid[criticized.data.selected_index];
    if (!selected) return { ok: false, error: "DeepSeek V4 Pro critic selected an invalid candidate" };

    const review = buildReview({ selected, criticized: criticized.data, attempts: totalAttempts });
    if (review.passed) {
      return { ok: true, message: selected.candidate.message.trim(), review, usage: generated.usage };
    }
    lastReview = review;
    feedback = `The selected draft scored ${review.score}/100. Editor rationale: ${review.rationale}. Material risks: ${review.riskFlags.join(", ") || "none"}. Raise every dimension to at least ${EDITORIAL_DIMENSION_FLOOR} without weakening evidence labeling.`;
  }

  return { ok: false, review: lastReview, error: lastReview?.issues[0] ?? "DeepSeek V4 Pro editorial review failed" };
}

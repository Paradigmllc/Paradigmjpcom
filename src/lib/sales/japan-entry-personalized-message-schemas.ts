import { z } from "zod"
import { boundedGeneratedEvidence } from "./manual-generated-evidence-schema"
import { MANUAL_COPY_ARCHITECTURES } from "./manual-japan-entry-copy-plan"
import {
  MANUAL_GENERATED_CTA_TYPES,
  normalizeGeneratedManualCtaType,
} from "./manual-japan-entry-generated-cta-type"

export const personalizedCandidateSchema = z.object({
  message: z.string().min(1).max(1_800),
  fact_ids: z.array(z.string().min(1)).min(1).max(6),
  product_evidence: boundedGeneratedEvidence(180),
  product_evidence_rendering: boundedGeneratedEvidence(240),
  angle: z.string().min(1).max(300),
  opening_style: z.string().min(1).max(120).default("legacy_unspecified"),
  diagnostic_focus: z.string().min(1).max(240).default("legacy_unspecified"),
  cta_type: z.preprocess(
    normalizeGeneratedManualCtaType,
    z.enum(MANUAL_GENERATED_CTA_TYPES),
  ).default("legacy_unspecified"),
  architecture: z.enum([...MANUAL_COPY_ARCHITECTURES, "legacy_unspecified"]).default("legacy_unspecified"),
  personalization_anchors: z.array(boundedGeneratedEvidence(180)).min(2).max(5).default(["legacy", "unspecified"]),
  solution_focus: boundedGeneratedEvidence(300).default("legacy_unspecified"),
}).strict()

const prohibitedClaimsSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  return value.split(/(?:\n|;|\s+\|\s+)/).map((item) => item.trim()).filter(Boolean)
}, z.preprocess(
  (value) => Array.isArray(value) ? value.slice(0, 12) : value,
  z.array(z.string().min(1).max(180)).max(12),
))

export const personalizedStrategySchema = z.object({
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
}).strict()

export const personalizedGenerationSchema = z.object({
  strategy: personalizedStrategySchema.optional(),
  candidates: z.array(personalizedCandidateSchema).min(1).max(3),
}).strict()

export const personalizedRepairSchema = z.object({ candidate: personalizedCandidateSchema }).strict()
export const bespokeRewriteSchema = z.object({ message: z.string().min(1).max(1_800) }).strict()

const riskFlagsSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const normalized = value.trim()
  return /^(?:none|no risks?|n\/a)$/i.test(normalized) ? [] : [normalized]
}, z.array(z.string().min(1).max(160)).max(5))

export const personalizedCriticSchema = z.object({
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
}).strict()

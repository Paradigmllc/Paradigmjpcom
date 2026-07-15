import { z } from "zod"
import { callDeepSeek, type DeepSeekResponse } from "@/lib/deepseek"
import type { HomepageQualityProfile, LeadQualityGate } from "./lead-quality-gate"
import type { TechItem } from "./sources/wappalyzer"

const MODEL = "deepseek-v4-pro" as const
const MIN_CONFIDENCE = 0.96

const SYSTEM_PROMPT = `You are the final evidence reviewer for a Japan market-entry lead list.
Return JSON only. Never invent employee counts, revenue, offices, ownership, customers, or geography.
The candidate may pass only when the supplied public website text supports all of these:
1. It is an independent small or midsize business, reasonably within 2-249 employees.
2. It is not a listed company, enterprise group, multinational division, government body, nonprofit, university, publisher, recruiter, real-estate agency, or local professional-service agency.
3. Its primary offer is a scalable SaaS/software product, ecommerce business, or branded physical product suitable for entering Japan.
4. The evidence is specific to this company, not a footer, cookie banner, generic navigation, customer logo, or third-party quotation.
Evidence quotes must be copied exactly from the supplied website evidence. Absence of an enterprise signal is not evidence of SMB status. If size is uncertain, employee_band must be unknown and smb_fit must be false.
Use a conservative standard: false negatives are acceptable; false positives are not.
Output exactly: {"smb_fit":boolean,"enterprise":boolean,"employee_band":"2-10"|"11-50"|"51-200"|"201-249"|"250+"|"unknown","business_model":"saas"|"ecommerce"|"product_brand"|"services"|"other","japan_entry_fit":boolean,"confidence":number,"evidence_quotes":string[],"risk_flags":string[],"reason":string}.`

const ReviewSchema = z.object({
  smb_fit: z.boolean(),
  enterprise: z.boolean(),
  employee_band: z.enum(["2-10", "11-50", "51-200", "201-249", "250+", "unknown"]),
  business_model: z.enum(["saas", "ecommerce", "product_brand", "services", "other"]),
  japan_entry_fit: z.boolean(),
  confidence: z.number().min(0).max(1),
  // DeepSeek can return more evidence than requested. Accept a bounded surplus,
  // then keep only exact, grounded quotes below; format excess alone must not
  // turn an otherwise verifiable company into a false negative.
  evidence_quotes: z.array(z.string().trim().min(4).max(280)).min(2).max(20),
  risk_flags: z.array(z.string().trim().min(1).max(180)).max(20),
  reason: z.string().trim().min(1).max(600),
}).strict()

export interface AiSmbReviewResult {
  passed: boolean
  model: string
  confidence: number
  employeeBand: z.infer<typeof ReviewSchema>["employee_band"]
  businessModel: z.infer<typeof ReviewSchema>["business_model"]
  evidenceQuotes: string[]
  riskFlags: string[]
  reason: string
  usage?: DeepSeekResponse["usage"]
  error?: string
}

export function requiresAiSmbAdjudication(gate: LeadQualityGate): boolean {
  const missingOnly = gate.status === "review_required"
    && gate.reasons.length > 0
    && gate.reasons.every((reason) => reason === "smb_evidence_missing")
  const tierTwoDeterministicSmb = gate.status === "passed"
    && gate.source.trustTier < 3
    && gate.smb.passed
    && gate.smb.score < 90
  return missingOnly || tierTwoDeterministicSmb
}

type LlmCaller = typeof callDeepSeek

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))
}

function normalized(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase()
}

function failed(error: string, usage?: DeepSeekResponse["usage"]): AiSmbReviewResult {
  return {
    passed: false,
    model: MODEL,
    confidence: 0,
    employeeBand: "unknown",
    businessModel: "other",
    evidenceQuotes: [],
    riskFlags: ["review_failed"],
    reason: "DeepSeek V4 Pro review did not produce a verifiable high-confidence SMB decision.",
    usage,
    error,
  }
}

export async function reviewUnknownSmbCandidate(input: {
  companyName: string
  countryCode: string
  homepage: HomepageQualityProfile
  qualityGate: LeadQualityGate
  detections: TechItem[]
}, caller: LlmCaller = callDeepSeek): Promise<AiSmbReviewResult> {
  if (!requiresAiSmbAdjudication(input.qualityGate)) {
    return failed("candidate is not eligible for SMB-only AI adjudication")
  }
  const websiteEvidence = [input.homepage.title, input.homepage.description, input.homepage.visibleText.slice(0, 16_000)]
    .filter(Boolean)
    .join("\n")
  const response = await caller([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify({
      company_name: input.companyName,
      country_code: input.countryCode,
      page_title: input.homepage.title,
      meta_description: input.homepage.description,
      organization_types: input.homepage.organizationTypes,
      detected_technologies: input.detections.map((item) => ({ name: item.name, category: item.category })),
      deterministic_offer_evidence: input.qualityGate.offerFit.evidence,
      website_evidence: input.homepage.visibleText.slice(0, 16_000),
    }) },
  ], {
    model: MODEL,
    modelPolicy: "strict",
    responseFormat: "json_object",
    temperature: 0,
    maxTokens: 900,
    thinking: "disabled",
    timeoutMs: 120_000,
  })
  if (!response.ok || !response.text) return failed(response.error ?? "empty response", response.usage)

  try {
    const result = ReviewSchema.parse(parseJson(response.text))
    const evidence = normalized(websiteEvidence)
    const groundedQuotes = [...new Set(result.evidence_quotes.filter((quote) => evidence.includes(normalized(quote))))].slice(0, 5)
    const riskFlags = result.risk_flags.slice(0, 8)
    const allowedBusinessModel = ["saas", "ecommerce", "product_brand"].includes(result.business_model)
    const allowedEmployeeBand = !["250+", "unknown"].includes(result.employee_band)
    const passed = result.smb_fit
      && !result.enterprise
      && result.japan_entry_fit
      && allowedBusinessModel
      && allowedEmployeeBand
      && result.confidence >= MIN_CONFIDENCE
      && groundedQuotes.length >= 2
      && riskFlags.length === 0
    return {
      passed,
      model: response.usedModel ?? MODEL,
      confidence: result.confidence,
      employeeBand: result.employee_band,
      businessModel: result.business_model,
      evidenceQuotes: groundedQuotes,
      riskFlags,
      reason: result.reason,
      usage: response.usage,
      error: groundedQuotes.length < 2 ? "fewer than two evidence quotes matched the supplied website" : undefined,
    }
  } catch (error) {
    console.error("[lead-candidate-ai-smb-review] invalid DeepSeek response:", error)
    return failed(error instanceof Error ? error.message : "invalid JSON", response.usage)
  }
}

export function applyAiSmbReview(gate: LeadQualityGate, review: AiSmbReviewResult): LeadQualityGate {
  if (!review.passed) return gate
  return {
    ...gate,
    status: "passed",
    reasons: [],
    smb: {
      passed: true,
      score: 90,
      evidence: [
        ...gate.smb.evidence,
        `deepseek_v4_pro:${review.employeeBand}:${Math.round(review.confidence * 100)}`,
        ...review.evidenceQuotes.map((quote) => `site_quote:${quote}`),
      ],
    },
    aiReview: review,
  }
}

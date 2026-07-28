import "server-only"

import { z } from "zod"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import {
  reviewManualMessageDistinctness,
  type PriorManualMessage,
} from "./manual-japan-entry-message-similarity"
import type { ManualEditorialBrief } from "./manual-work-editorial-brief"

const DEFAULT_TIMEOUT_MS = 75_000
const BODY_MIN_WORDS = 60
const BODY_MAX_WORDS = 135

const candidateSchema = z.object({
  body: z.string().min(80).max(1_500),
  evidenceIds: z.array(z.string()).min(2).max(6),
  angle: z.string().min(3).max(120),
})

const draftSchema = z.object({
  decision: z.enum(["ready", "insufficient"]),
  strategy: z.object({
    companyThesis: z.string().min(3).max(500),
    japanQuestion: z.string().min(3).max(500),
    whyNow: z.string().max(400).nullable(),
    evidenceIds: z.array(z.string()).min(2).max(8),
  }).nullable(),
  candidates: z.array(candidateSchema).max(3),
  insufficiencyReason: z.string().max(500).nullable(),
})

const finalSchema = z.object({
  decision: z.enum(["ready", "insufficient"]),
  body: z.string().max(1_500).nullable(),
  evidenceIds: z.array(z.string()).max(6),
  score: z.number().min(0).max(100),
  dimensions: z.object({
    companySpecificity: z.number().min(0).max(25),
    strategicSubstance: z.number().min(0).max(25),
    naturalness: z.number().min(0).max(25),
    executiveRelevance: z.number().min(0).max(25),
  }),
  critique: z.string().min(3).max(800),
})

export interface ManualEditorialWriterUsage {
  provider: "openai" | "openrouter"
  model: string
  promptTokens: number
  completionTokens: number
  calls: number
}

export interface ManualEditorialMessageResult {
  ok: boolean
  message?: string
  body?: string
  strategy?: z.infer<typeof draftSchema>["strategy"]
  evidenceIds?: string[]
  review?: Record<string, unknown>
  usage?: ManualEditorialWriterUsage
  error?: string
}

interface WriterProvider {
  provider: "openai" | "openrouter"
  endpoint: string
  key: string
  draftModel: string
  criticModel: string
  headers: Record<string, string>
}

interface RawUsage {
  prompt_tokens?: number
  completion_tokens?: number
  input_tokens?: number
  output_tokens?: number
}

interface WriterCallResult {
  text: string
  model: string
  usage: RawUsage
}

export type ManualEditorialModelCaller = (input: {
  model: string
  system: string
  user: string
  timeoutMs?: number
}) => Promise<WriterCallResult>

function provider(): WriterProvider | null {
  const preferred = process.env.SALES_WRITER_PROVIDER?.trim().toLowerCase()
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim()
  if ((preferred === "openai" || preferred !== "openrouter") && openAiKey) {
    return {
      provider: "openai",
      endpoint: (process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
      key: openAiKey,
      draftModel: process.env.OPENAI_SALES_WRITER_MODEL?.trim() || "gpt-5.6-terra",
      criticModel: process.env.OPENAI_SALES_WRITER_CRITIC_MODEL?.trim() || "gpt-5.6-sol",
      headers: {},
    }
  }
  if (openRouterKey) {
    return {
      provider: "openrouter",
      endpoint: (process.env.OPENROUTER_API_BASE ?? "https://openrouter.ai/api/v1").replace(/\/+$/, ""),
      key: openRouterKey,
      draftModel: process.env.OPENROUTER_SALES_WRITER_MODEL?.trim() || "openai/gpt-5.6-terra",
      criticModel: process.env.OPENROUTER_SALES_WRITER_CRITIC_MODEL?.trim() || "openai/gpt-5.6-sol",
      headers: {
        "HTTP-Referer": "https://paradigmjp.com",
        "X-Title": "Paradigm Japan Country Partner Workbench",
      },
    }
  }
  return null
}

function parseResponseText(data: unknown): { text: string; model: string; usage: RawUsage } {
  const record = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {}
  const choices = Array.isArray(record.choices) ? record.choices : []
  const first = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : {}
  const message = first.message && typeof first.message === "object" ? first.message as Record<string, unknown> : {}
  const text = typeof message.content === "string" ? message.content : ""
  const usage = record.usage && typeof record.usage === "object" ? record.usage as RawUsage : {}
  return { text, model: typeof record.model === "string" ? record.model : "unknown", usage }
}

async function callConfiguredModel(input: {
  model: string
  system: string
  user: string
  timeoutMs?: number
}): Promise<WriterCallResult> {
  const selected = provider()
  if (!selected) {
    throw new Error("High-quality sales writing is not configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY; DeepSeek fallback is intentionally disabled.")
  }
  const response = await fetch(`${selected.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${selected.key}`,
      "Content-Type": "application/json",
      ...selected.headers,
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4_000,
      stream: false,
    }),
    signal: AbortSignal.timeout(input.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 1_000)
    throw new Error(`GPT-5.6 sales writer failed (${response.status}): ${detail || response.statusText}`)
  }
  const result = parseResponseText(await response.json())
  if (!result.text.trim()) throw new Error("GPT-5.6 sales writer returned an empty response")
  return result
}

function safeJson(value: string): unknown {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  return JSON.parse(trimmed)
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

const BANNED_COPY = [
  /\bI reviewed your (?:website|site)\b/i,
  /\buntapped opportunity\b/i,
  /\bJapan is (?:a )?(?:large|huge|major) market\b/i,
  /\bexplore (?:a )?(?:partnership|collaboration)\b/i,
  /\bthat leaves Japan untested rather than disproven\b/i,
  /\blocalization, launch(?: setup)?, and (?:the first 90 days of )?market operations\b/i,
  /\bwe help overseas companies enter (?:the )?Japanese market\b/i,
  /\bhope this message finds you well\b/i,
]

function deterministicIssues(input: {
  body: string
  evidenceIds: string[]
  brief: ManualEditorialBrief
  priorMessages: PriorManualMessage[]
}): string[] {
  const issues: string[] = []
  const count = wordCount(input.body)
  if (count < BODY_MIN_WORDS || count > BODY_MAX_WORDS) issues.push(`Body must be ${BODY_MIN_WORDS}-${BODY_MAX_WORDS} words; received ${count}`)
  const allowedIds = new Set(input.brief.evidence.map((point) => point.id))
  const validIds = [...new Set(input.evidenceIds.filter((id) => allowedIds.has(id)))]
  if (validIds.length < 2) issues.push("At least two valid company-specific evidence points are required")
  for (const pattern of BANNED_COPY) if (pattern.test(input.body)) issues.push(`Stock phrase is prohibited: ${pattern.source}`)
  const anchors = [input.brief.companyName, ...input.brief.productNames]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 3)
  if (!anchors.some((anchor) => input.body.toLowerCase().includes(anchor))) {
    issues.push("The body must contain the company or a specific product anchor")
  }
  const wrapped = [manualFormGreeting(input.brief.companyName), input.body, MANUAL_FORM_SIGNATURE].join("\n\n")
  const similarity = reviewManualMessageDistinctness({
    message: wrapped,
    companyName: input.brief.companyName,
    priorMessages: input.priorMessages,
    threshold: 0.30,
    ctaThreshold: 0.38,
  })
  if (!similarity.passed) issues.push(...similarity.reasons)
  return issues
}

function gapSummary(brief: ManualEditorialBrief): string[] {
  const status = brief.audit.status
  const gaps: string[] = []
  if (status.japanese_language_missing) gaps.push("No Japanese-language customer path was found on the checked pages")
  if (status.jpy_currency_missing) gaps.push("No customer-facing JPY pricing was found on the checked pages")
  if (brief.businessModel === "ecommerce" && status.japan_shipping_missing) gaps.push("No clear Japan shipping terms were found on the checked pages")
  if (brief.businessModel === "ecommerce" && status.local_payments_missing) gaps.push("No Japan-local payment reference was found on the checked pages")
  return gaps.slice(0, 3)
}

function draftSystemPrompt(): string {
  return [
    "You are a senior founder-led outbound strategist and editorial copywriter for Paradigm LLC, a Japan market operator.",
    "This is not a template-filling task. A company name swap must make every candidate collapse. If the evidence is too thin, return decision=insufficient.",
    "Use only the supplied public evidence. Do not invent demand, traffic, revenue, ROI, customers, competitors, funding, urgency, or legal conclusions.",
    "Develop one non-obvious Japan entry question from the actual product, commercial model, and current customer path. Missing Japanese language alone is not a thesis.",
    "Each candidate body must be 70-125 English words, use two to four short paragraphs, and exclude greeting and signature.",
    "Use at least two distinct evidence IDs. Include concrete nouns, product details, or operating choices from the company; do not paraphrase them into generic labels.",
    "The first touch asks permission to send a concise company-specific Japan opportunity note. It does not quote price, list the full service scope, or force a call.",
    "Vary structure and CTA according to the evidence. Do not use stock openings, generic praise, 'untapped opportunity', 'Japan is a large market', 'explore a partnership', or reusable agency copy.",
    "Return strict JSON only: {decision:'ready'|'insufficient',strategy:{companyThesis,japanQuestion,whyNow,evidenceIds}|null,candidates:[{body,evidenceIds,angle}],insufficiencyReason:string|null}.",
    "When ready, return exactly three materially different candidates. They must differ in reasoning, not merely synonyms.",
  ].join("\n")
}

function criticSystemPrompt(): string {
  return [
    "You are the final editorial director for a high-value founder outreach campaign.",
    "Judge whether the copy could only have been written for this company. Reject polite but empty agency copy.",
    "Select and rewrite the strongest candidate into one natural body of 65-120 English words and two to four short paragraphs.",
    "The final body must use at least two valid evidence IDs, contain a specific commercial thought about Japan, and end with one low-pressure permission or routing question.",
    "Do not preserve a candidate's wording when it is generic. Rewrite freely while staying inside the supplied evidence.",
    "No invented demand, traffic, revenue, ROI, customer behavior, competitor facts, legal claims, or measured loss.",
    "Return strict JSON only: {decision:'ready'|'insufficient',body:string|null,evidenceIds:string[],score:0-100,dimensions:{companySpecificity:0-25,strategicSubstance:0-25,naturalness:0-25,executiveRelevance:0-25},critique:string}.",
    "A ready result requires score >= 88. If the evidence cannot support that standard, return insufficient rather than padding.",
  ].join("\n")
}

function usageTotal(providerName: WriterProvider["provider"], calls: WriterCallResult[]): ManualEditorialWriterUsage {
  return {
    provider: providerName,
    model: calls.map((call) => call.model).join(" -> "),
    promptTokens: calls.reduce((sum, call) => sum + (call.usage.prompt_tokens ?? call.usage.input_tokens ?? 0), 0),
    completionTokens: calls.reduce((sum, call) => sum + (call.usage.completion_tokens ?? call.usage.output_tokens ?? 0), 0),
    calls: calls.length,
  }
}

export async function generateManualEditorialMessage(input: {
  brief: ManualEditorialBrief
  priorMessages: PriorManualMessage[]
  caller?: ManualEditorialModelCaller
}): Promise<ManualEditorialMessageResult> {
  const selected = provider()
  if (!input.caller && !selected) {
    return { ok: false, error: "GPT-5.6 sales writer is not configured; DeepSeek and template fallback are disabled" }
  }
  const caller = input.caller ?? callConfiguredModel
  const draftModel = selected?.draftModel ?? "test-draft"
  const criticModel = selected?.criticModel ?? "test-critic"
  const calls: WriterCallResult[] = []
  const briefPayload = {
    companyName: input.brief.companyName,
    countryCode: input.brief.countryCode,
    businessModel: input.brief.businessModel,
    productNames: input.brief.productNames,
    productContext: input.brief.productContext,
    observedJapanGaps: gapSummary(input.brief),
    pages: input.brief.pages.map((page) => ({ url: page.url, kind: page.kind, title: page.title, headings: page.headings.slice(0, 5) })),
    evidence: input.brief.evidence,
  }

  try {
    const draftCall = await caller({
      model: draftModel,
      system: draftSystemPrompt(),
      user: JSON.stringify(briefPayload),
    })
    calls.push(draftCall)
    const draft = draftSchema.parse(safeJson(draftCall.text))
    if (draft.decision === "insufficient" || draft.candidates.length === 0) {
      return {
        ok: false,
        strategy: draft.strategy,
        usage: usageTotal(selected?.provider ?? "openrouter", calls),
        error: draft.insufficiencyReason ?? "Public evidence was insufficient for company-specific outreach",
      }
    }

    const criticCall = await caller({
      model: criticModel,
      system: criticSystemPrompt(),
      user: JSON.stringify({ brief: briefPayload, strategy: draft.strategy, candidates: draft.candidates }),
    })
    calls.push(criticCall)
    let final = finalSchema.parse(safeJson(criticCall.text))
    if (final.decision === "insufficient" || !final.body) {
      return {
        ok: false,
        strategy: draft.strategy,
        usage: usageTotal(selected?.provider ?? "openrouter", calls),
        error: final.critique || "The editorial quality gate rejected the draft",
      }
    }

    let issues = deterministicIssues({
      body: final.body,
      evidenceIds: final.evidenceIds,
      brief: input.brief,
      priorMessages: input.priorMessages,
    })
    if (issues.length > 0) {
      const repairCall = await caller({
        model: criticModel,
        system: criticSystemPrompt(),
        user: JSON.stringify({
          brief: briefPayload,
          strategy: draft.strategy,
          rejectedBody: final.body,
          requiredFixes: issues,
          instruction: "Rewrite from scratch. Do not patch sentences mechanically.",
        }),
      })
      calls.push(repairCall)
      final = finalSchema.parse(safeJson(repairCall.text))
      if (final.decision === "insufficient" || !final.body) {
        return { ok: false, strategy: draft.strategy, usage: usageTotal(selected?.provider ?? "openrouter", calls), error: final.critique }
      }
      issues = deterministicIssues({
        body: final.body,
        evidenceIds: final.evidenceIds,
        brief: input.brief,
        priorMessages: input.priorMessages,
      })
    }
    if (issues.length > 0 || final.score < 88) {
      return {
        ok: false,
        strategy: draft.strategy,
        usage: usageTotal(selected?.provider ?? "openrouter", calls),
        error: [...issues, final.score < 88 ? `Editorial score ${final.score}/100 is below 88` : ""].filter(Boolean).join("; "),
      }
    }

    const message = [manualFormGreeting(input.brief.companyName), final.body.trim(), MANUAL_FORM_SIGNATURE].join("\n\n")
    return {
      ok: true,
      message,
      body: final.body.trim(),
      strategy: draft.strategy,
      evidenceIds: final.evidenceIds,
      usage: usageTotal(selected?.provider ?? "openrouter", calls),
      review: {
        passed: true,
        score: final.score,
        dimensions: final.dimensions,
        critique: final.critique,
        evidence_ids: final.evidenceIds,
        generation_engine: selected?.provider === "openai" ? "openai_gpt56" : "openrouter_openai_gpt56",
        draft_model: draftModel,
        critic_model: criticModel,
        automatic_send_allowed: false,
        generated_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      ok: false,
      usage: calls.length > 0 ? usageTotal(selected?.provider ?? "openrouter", calls) : undefined,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

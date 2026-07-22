import { z } from "zod"
import { callDeepSeek, type DeepSeekResponse } from "@/lib/deepseek"
import { INDUSTRIES } from "./types"
import type { JapanMarketAudit } from "./sources/japan-market-audit"
import {
  MANUAL_COMMERCIAL_SIGNAL_KINDS,
  type ManualCompanyProfile,
  type ManualDeepSeekStageUsage,
} from "./manual-japan-entry-types"
import {
  buildManualMarketLens,
  groundManualCommercialSignals,
} from "./manual-japan-entry-market-lens"
import {
  groundManualPositioningConcept,
  MANUAL_OUTREACH_PLAYBOOKS,
} from "./manual-japan-entry-playbook"
import { applyJapanEntryFitPolicy, JAPAN_ENTRY_FIT_CONTRACT_VERSION } from "./manual-japan-entry-fit-policy"
import { decodePublicHtmlText } from "./initial-form-draft-evidence"

const profileSchema = z.object({
  companyName: z.string().min(2).max(120),
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  isJapaneseCompany: z.boolean(),
  smbStatus: z.enum(["qualified", "review_required", "rejected"]),
  smbConfidence: z.number().int().min(0).max(100),
  smbEvidence: z.array(z.string().min(3).max(240)).max(8),
  japanEntryFitStatus: z.enum(["qualified", "review_required", "rejected"]),
  japanEntryFitConfidence: z.number().int().min(0).max(100),
  japanEntryFitEvidence: z.array(z.string().min(3).max(240)).max(8),
  businessModel: z.enum(["ecommerce", "saas", "service"]),
  industry: z.enum(INDUSTRIES),
  productContext: z.string().min(12).max(700),
  observedFacts: z.array(z.string().min(3).max(240)).min(1).max(10),
  outreachPlaybook: z.enum(MANUAL_OUTREACH_PLAYBOOKS),
  positioningConcept: z.object({
    sourcePhrase: z.string().min(3).max(180),
    japaneseHeadline: z.string().min(4).max(60),
    japaneseSupportLine: z.string().min(8).max(140),
  }).strict().nullable(),
  commercialSignals: z.array(z.object({
    kind: z.enum(MANUAL_COMMERCIAL_SIGNAL_KINDS),
    sourcePhrase: z.string().min(3).max(180),
    detail: z.string().min(3).max(180).optional().default("Human verification required"),
  }).strict()).max(6).default([]),
}).strict()

type ParsedManualCompanyProfile = z.infer<typeof profileSchema>

function summarizeAnalysisUsage(responses: DeepSeekResponse[], elapsedMs: number): ManualDeepSeekStageUsage {
  return {
    stage: "company_classification",
    requests: responses.length,
    models: [...new Set(responses.map((response) => response.usedModel).filter((model): model is string => Boolean(model)))],
    promptTokens: responses.reduce((total, response) => total + (response.usage?.prompt_tokens ?? 0), 0),
    completionTokens: responses.reduce((total, response) => total + (response.usage?.completion_tokens ?? 0), 0),
    cacheHitTokens: responses.reduce((total, response) => total + (response.usage?.cache_hit_tokens ?? 0), 0),
    cacheMissTokens: responses.reduce((total, response) => total + (response.usage?.cache_miss_tokens ?? 0), 0),
    elapsedMs,
  }
}

const PROFILE_OUTPUT_CONTRACT = {
  companyName: "string",
  countryCode: "ISO-3166 alpha-2 uppercase string or null",
  isJapaneseCompany: "boolean",
  smbStatus: "qualified | review_required | rejected",
  smbConfidence: "integer number from 0 to 100 (not a quoted string)",
  smbEvidence: "JSON array of up to 8 short strings",
  japanEntryFitStatus: "qualified | review_required | rejected",
  japanEntryFitConfidence: "integer number from 0 to 100 (not a quoted string)",
  japanEntryFitEvidence: "JSON array of up to 8 short strings",
  businessModel: "ecommerce | saas | service",
  industry: "exactly one allowedIndustries value",
  productContext: "string",
  observedFacts: "JSON array of 1 to 10 short strings",
  outreachPlaybook: "exactly one allowedOutreachPlaybooks value",
  positioningConcept: {
    sourcePhrase: "exact phrase copied from groundedProductContext",
    japaneseHeadline: "string",
    japaneseSupportLine: "string",
  },
  commercialSignals: "JSON array; use [] when no explicit public evidence exists",
} as const

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function boundedInteger(value: unknown): unknown {
  if (typeof value !== "string") return value
  const normalized = value.trim().replace(/%$/, "")
  if (!/^\d{1,3}$/.test(normalized)) return value
  const parsed = Number(normalized)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : value
}

function boundedEvidence(value: unknown, maximum: number): unknown {
  const items = typeof value === "string"
    ? value.split(/\r?\n|\s*;\s*|\s+\|\s+|\s*•\s*/)
    : value
  if (!Array.isArray(items) || items.some((item) => typeof item !== "string")) return value
  return items
    .map((item) => item.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim().slice(0, 240))
    .filter((item) => item.length >= 3)
    .slice(0, maximum)
}

function qualificationStatus(value: unknown): unknown {
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_")
  return ["qualified", "review_required", "rejected"].includes(normalized) ? normalized : value
}

function businessModel(value: unknown): unknown {
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, " ")
  if ([
    "saas",
    "software",
    "software as a service",
    "ai software",
    "platform",
    "software platform",
    "online platform",
    "marketplace",
    "online marketplace",
    "b2b marketplace",
    "marketplace platform",
  ].includes(normalized)) return "saas"
  if (["ecommerce", "e commerce", "ecomerce", "online retail", "d2c"].includes(normalized)) return "ecommerce"
  if (["service", "services", "professional service", "professional services", "consulting"].includes(normalized)) return "service"
  return value
}

function positioningConcept(value: unknown): unknown {
  if (value === null) return null
  const source = record(value)
  if (!source) return value
  const sourcePhrase = source.sourcePhrase
  const japaneseHeadline = source.japaneseHeadline
  const japaneseSupportLine = source.japaneseSupportLine
  if (
    typeof sourcePhrase !== "string"
    || typeof japaneseHeadline !== "string"
    || typeof japaneseSupportLine !== "string"
    || sourcePhrase.trim().length < 3
    || sourcePhrase.trim().length > 180
    || japaneseHeadline.trim().length < 4
    || japaneseHeadline.trim().length > 60
    || japaneseSupportLine.trim().length < 8
    || japaneseSupportLine.trim().length > 140
  ) {
    // A partial positioning draft is optional. Dropping it is safer than inventing
    // the missing source phrase or Japanese copy merely to satisfy the schema.
    return null
  }
  return {
    sourcePhrase: sourcePhrase.trim(),
    japaneseHeadline: japaneseHeadline.trim(),
    japaneseSupportLine: japaneseSupportLine.trim(),
  }
}

function commercialSignals(value: unknown): unknown {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const source = record(item)
    if (!source) return []
    const kind = source.kind
    const sourcePhrase = source.sourcePhrase
    const detail = source.detail
    if (
      typeof kind !== "string"
      || !MANUAL_COMMERCIAL_SIGNAL_KINDS.includes(kind as (typeof MANUAL_COMMERCIAL_SIGNAL_KINDS)[number])
      || typeof sourcePhrase !== "string"
      || sourcePhrase.trim().length < 3
      || sourcePhrase.trim().length > 180
      || (detail !== undefined && (typeof detail !== "string" || detail.trim().length < 3 || detail.trim().length > 180))
    ) return []
    return [{
      kind,
      sourcePhrase: sourcePhrase.trim(),
      ...(typeof detail === "string" ? { detail: detail.trim() } : {}),
    }]
  }).slice(0, 6)
}

export function normalizeManualCompanyProfile(value: unknown): unknown {
  const source = record(value)
  if (!source) return value
  const countryCode = typeof source.countryCode === "string" && /^[a-z]{2}$/i.test(source.countryCode.trim())
    ? source.countryCode.trim().toUpperCase()
    : source.countryCode
  const isJapaneseCompany = source.isJapaneseCompany === "true"
    ? true
    : source.isJapaneseCompany === "false"
      ? false
      : source.isJapaneseCompany
  const normalized: Record<string, unknown> = {
    ...source,
    countryCode,
    isJapaneseCompany,
    smbStatus: qualificationStatus(source.smbStatus),
    smbConfidence: boundedInteger(source.smbConfidence),
    smbEvidence: boundedEvidence(source.smbEvidence, 8),
    japanEntryFitStatus: qualificationStatus(source.japanEntryFitStatus),
    japanEntryFitConfidence: boundedInteger(source.japanEntryFitConfidence),
    japanEntryFitEvidence: boundedEvidence(source.japanEntryFitEvidence, 8),
    businessModel: businessModel(source.businessModel),
    observedFacts: boundedEvidence(source.observedFacts, 10),
    positioningConcept: positioningConcept(source.positioningConcept),
    commercialSignals: commercialSignals(source.commercialSignals),
  }
  return Object.fromEntries(Object.keys(profileSchema.shape).map((key) => [key, normalized[key]]))
}

export function parseManualCompanyProfile(value: unknown): ParsedManualCompanyProfile {
  return profileSchema.parse(normalizeManualCompanyProfile(value))
}

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))
}

function parseJsonSafely(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: parseJson(text) }
  } catch {
    return { ok: false }
  }
}

export function hasDeterministicJapanEvidence(input: {
  domain: string
  text: string
  countryCode: string | null
  llmJapanese: boolean
}): boolean {
  return input.domain.endsWith(".jp")
    || input.countryCode === "JP"
    || input.llmJapanese
    || /株式会社|有限会社|合同会社|所在地.{0,30}(?:日本|東京都|大阪府|京都府)/.test(input.text)
}

function publicEvidenceFacts(productContext: string): string[] {
  return [...new Set(productContext
    .split(" | ")
    .map((value) => value.trim().slice(0, 240))
    .filter((value) => value.length >= 3))]
    .slice(0, 10)
}

function normalizedPublicCompanyName(value: string | null, domain: string): string {
  const decoded = decodePublicHtmlText(value ?? "")
    .replace(/\s+[|–—-]\s+(?:the\s+)?[^|–—]{8,}$/i, "")
    .replace(/,\s+(?:the|a|an)\s+[^,]{8,}$/i, "")
    .replace(/\s+/g, " ")
    .trim()
  return decoded.length >= 2 && decoded.length <= 80 ? decoded : domain
}

export function groundManualCompanyProfile(input: {
  profile: ParsedManualCompanyProfile
  domain: string
  fallbackCompanyName: string | null
  evidenceText: string
  productContext: string
}): ManualCompanyProfile {
  const normalizedEvidence = decodePublicHtmlText(input.evidenceText).toLocaleLowerCase("en-US")
  const profileCompanyName = normalizedPublicCompanyName(input.profile.companyName, input.domain)
  const fallbackCompanyName = normalizedPublicCompanyName(input.fallbackCompanyName, input.domain)
  const modelNameIsObserved = normalizedEvidence.includes(profileCompanyName.toLocaleLowerCase("en-US"))
  const companyName = modelNameIsObserved
    ? profileCompanyName
    : fallbackCompanyName
  const isJapaneseCompany = hasDeterministicJapanEvidence({
    domain: input.domain,
    text: input.evidenceText,
    countryCode: input.profile.countryCode,
    llmJapanese: input.profile.isJapaneseCompany,
  })
  const commercialSignals = groundManualCommercialSignals(input.profile.commercialSignals, input.productContext)

  const grounded: ManualCompanyProfile = {
    ...input.profile,
    companyName,
    productContext: input.productContext,
    observedFacts: publicEvidenceFacts(input.productContext),
    positioningConcept: groundManualPositioningConcept(input.profile.positioningConcept, input.productContext),
    commercialSignals,
    marketLens: buildManualMarketLens({ countryCode: input.profile.countryCode, commercialSignals }),
    isJapaneseCompany,
    japanEntryFitStatus: isJapaneseCompany ? "rejected" : input.profile.japanEntryFitStatus,
    japanEntryFitConfidence: isJapaneseCompany ? 100 : input.profile.japanEntryFitConfidence,
    japanEntryFitEvidence: isJapaneseCompany
      ? [...input.profile.japanEntryFitEvidence, "Deterministic evidence indicates a Japanese company."].slice(0, 8)
      : input.profile.japanEntryFitEvidence,
  }
  return applyJapanEntryFitPolicy(grounded)
}

export async function analyzeManualCompanyProfile(input: {
  domain: string
  fallbackCompanyName: string | null
  productContext: string
  title: string | null
  description: string | null
  headings: string[]
  audit: JapanMarketAudit
}): Promise<ManualCompanyProfile> {
  const analysisStartedAt = Date.now()
  const analysisResponses: DeepSeekResponse[] = []
  const evidenceText = [input.title, input.description, ...input.headings, input.productContext]
    .filter((value): value is string => Boolean(value))
    .join(" | ")
    .slice(0, 5_000)
  const messages = [
    {
      role: "system",
      content: [
        "You classify public company websites for a manual Japan market-entry sales workbench.",
        "Return strict JSON only. Never invent headcount, revenue, traction, country, or Japan demand.",
        "SMB qualified means public evidence is consistent with a small or midsize operating company; uncertainty must be review_required.",
        `Apply Japan-entry fit decision contract ${JAPAN_ENTRY_FIT_CONTRACT_VERSION}.`,
        "Japan-entry fit asks whether Paradigm's market-entry work can plausibly help this non-Japanese commercial company bring its actual product or service to Japan. It does not ask whether the company is already Japan-ready.",
        "Missing Japanese language, JPY, local payments, Japan shipping, Japanese customers, localization, or current Japan presence are readiness gaps and sales opportunities. Never use those gaps by themselves as rejection evidence, and never require proof of existing Japan demand.",
        "For a real online-deliverable SaaS or ecommerce offer, classify Japan-entry fit as qualified unless explicit public evidence establishes a structural incompatibility. A low Japan-readiness audit score is not a fit rejection.",
        "Use rejected only for explicit structural mismatch such as a Japanese company, non-commercial or inactive site, or a strictly location-bound offer that cannot serve or export to Japan. When delivery or exportability is genuinely unclear, use review_required rather than rejected.",
        "Use ISO-3166 alpha-2 countryCode or null. Japanese companies must be isJapaneseCompany=true and japanEntryFitStatus=rejected.",
        "Choose exactly one outreachPlaybook from the allowed list based only on the public product evidence.",
        "For positioningConcept, create a stored draft Japanese positioning concept only when it can be grounded in one exact sourcePhrase copied from productContext. Translate or reframe only that supplied meaning; do not add demand, outcomes, superiority, numbers, customers, or Japan-market fit. Return null when a grounded concept is not possible.",
        "For commercialSignals, return only signals whose sourcePhrase is copied exactly from groundedProductContext. Do not infer payment capacity. Use an empty array unless the phrase itself explicitly states foreign-currency revenue, global customers, funding, founder-led ownership, employee count, or international operations.",
        "Follow outputContract exactly. Numeric confidence fields must be JSON numbers, evidence and fact fields must be JSON arrays, businessModel must use the exact lowercase enum, and positioningConcept must use all three named keys or be null. Do not rename keys or add keys.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        domain: input.domain,
        fallbackCompanyName: input.fallbackCompanyName,
        publicWebsiteEvidence: evidenceText,
        groundedProductContext: input.productContext,
        japanReadinessAudit: {
          score: input.audit.score,
          status: input.audit.status,
          pagesChecked: input.audit.pages_checked,
        },
        allowedIndustries: INDUSTRIES,
        allowedOutreachPlaybooks: MANUAL_OUTREACH_PLAYBOOKS,
        allowedCommercialSignalKinds: MANUAL_COMMERCIAL_SIGNAL_KINDS,
        commercialSignalShape: { kind: "allowed kind", sourcePhrase: "exact quote", detail: "brief interpretation" },
        outputContract: PROFILE_OUTPUT_CONTRACT,
      }),
    },
  ] as const
  const response = await callDeepSeek([...messages], {
    model: "deepseek-v4-pro",
    modelPolicy: "strict",
    responseFormat: "json_object",
    temperature: 0.1,
    maxTokens: 2_400,
    thinking: "disabled",
    timeoutMs: 120_000,
  })
  analysisResponses.push(response)
  if (!response.ok || !response.text) {
    throw new Error(response.error ?? "DeepSeek V4 Pro company classification failed")
  }
  const parsedProfile = parseJsonSafely(response.text)
  const rawProfile = parsedProfile.ok ? parsedProfile.value : response.text.slice(0, 10_000)
  const rawProfileRecord = parsedProfile.ok ? record(rawProfile) : null
  const groundedWireProfile = rawProfileRecord
    ? { ...rawProfileRecord, productContext: input.productContext, observedFacts: publicEvidenceFacts(input.productContext) }
    : rawProfile
  const initial = parsedProfile.ok
    ? profileSchema.safeParse(normalizeManualCompanyProfile(groundedWireProfile))
    : null
  let profile: ParsedManualCompanyProfile
  if (initial?.success) {
    profile = initial.data
  } else {
    const issues = initial
      ? initial.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        }))
      : [{ path: "$", code: "invalid_json", message: "Response was not valid JSON" }]
    const repair = await callDeepSeek([
      {
        role: "system",
        content: [
          "Repair the supplied company-classification JSON so it follows outputContract exactly.",
          "Return strict JSON only. Preserve the supplied meaning and evidence; do not add facts, claims, scores, countries, customers, demand, or outcomes.",
          "Use null or an empty array for optional material that cannot be represented safely. Do not rename or add keys.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          invalidOutput: groundedWireProfile,
          validationIssues: issues,
          outputContract: PROFILE_OUTPUT_CONTRACT,
          allowedIndustries: INDUSTRIES,
          allowedOutreachPlaybooks: MANUAL_OUTREACH_PLAYBOOKS,
          allowedCommercialSignalKinds: MANUAL_COMMERCIAL_SIGNAL_KINDS,
          commercialSignalShape: { kind: "allowed kind", sourcePhrase: "exact quote", detail: "brief interpretation" },
        }),
      },
    ], {
      model: "deepseek-v4-pro",
      modelPolicy: "strict",
      responseFormat: "json_object",
      temperature: 0,
      maxTokens: 2_400,
      thinking: "disabled",
      timeoutMs: 120_000,
    })
    analysisResponses.push(repair)
    if (!repair.ok || !repair.text) {
      throw new Error(`DeepSeek V4 Pro company classification repair failed (${issues.map((issue) => issue.path).filter(Boolean).join(", ")})`)
    }
    const parsedRepair = parseJsonSafely(repair.text)
    if (!parsedRepair.ok) {
      throw new Error("DeepSeek V4 Pro returned invalid JSON after one company-classification repair")
    }
    const rawRepair = parsedRepair.value
    const rawRepairRecord = record(rawRepair)
    const groundedRepair = rawRepairRecord
      ? { ...rawRepairRecord, productContext: input.productContext, observedFacts: publicEvidenceFacts(input.productContext) }
      : rawRepair
    const repaired = profileSchema.safeParse(normalizeManualCompanyProfile(groundedRepair))
    if (!repaired.success) {
      const paths = [...new Set(repaired.error.issues.map((issue) => issue.path.join(".")).filter(Boolean))]
      throw new Error(`DeepSeek V4 Pro returned an invalid company classification after one repair (${paths.join(", ")})`)
    }
    profile = repaired.data
  }
  return {
    ...groundManualCompanyProfile({
      profile,
      domain: input.domain,
      fallbackCompanyName: input.fallbackCompanyName,
      evidenceText,
      productContext: input.productContext,
    }),
    analysisUsage: summarizeAnalysisUsage(analysisResponses, Date.now() - analysisStartedAt),
  }
}

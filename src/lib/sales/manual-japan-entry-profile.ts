import { z } from "zod"
import { callDeepSeek } from "@/lib/deepseek"
import { INDUSTRIES } from "./types"
import type { JapanMarketAudit } from "./sources/japan-market-audit"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

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
}).strict()

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))
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

export async function analyzeManualCompanyProfile(input: {
  domain: string
  fallbackCompanyName: string | null
  productContext: string
  title: string | null
  description: string | null
  headings: string[]
  audit: JapanMarketAudit
}): Promise<ManualCompanyProfile> {
  const evidenceText = [input.title, input.description, ...input.headings, input.productContext]
    .filter((value): value is string => Boolean(value))
    .join(" | ")
    .slice(0, 5_000)
  const response = await callDeepSeek([
    {
      role: "system",
      content: [
        "You classify public company websites for a manual Japan market-entry sales workbench.",
        "Return strict JSON only. Never invent headcount, revenue, traction, country, or Japan demand.",
        "SMB qualified means public evidence is consistent with a small or midsize operating company; uncertainty must be review_required.",
        "Japan-entry fit qualified means the offer can plausibly be sold to this non-Japanese company based on its actual product/service and public site, not assumed demand.",
        "Use ISO-3166 alpha-2 countryCode or null. Japanese companies must be isJapaneseCompany=true and japanEntryFitStatus=rejected.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        domain: input.domain,
        fallbackCompanyName: input.fallbackCompanyName,
        publicWebsiteEvidence: evidenceText,
        japanReadinessAudit: {
          score: input.audit.score,
          status: input.audit.status,
          pagesChecked: input.audit.pages_checked,
        },
        allowedIndustries: INDUSTRIES,
        outputKeys: Object.keys(profileSchema.shape),
      }),
    },
  ], {
    model: "deepseek-v4-pro",
    modelPolicy: "strict",
    responseFormat: "json_object",
    temperature: 0.1,
    maxTokens: 2_000,
    thinking: "disabled",
    timeoutMs: 120_000,
  })
  if (!response.ok || !response.text) {
    throw new Error(response.error ?? "DeepSeek V4 Pro company classification failed")
  }
  const profile = profileSchema.parse(parseJson(response.text))
  const isJapaneseCompany = hasDeterministicJapanEvidence({
    domain: input.domain,
    text: evidenceText,
    countryCode: profile.countryCode,
    llmJapanese: profile.isJapaneseCompany,
  })
  return {
    ...profile,
    companyName: profile.companyName || input.fallbackCompanyName || input.domain,
    isJapaneseCompany,
    japanEntryFitStatus: isJapaneseCompany ? "rejected" : profile.japanEntryFitStatus,
    japanEntryFitConfidence: isJapaneseCompany ? 100 : profile.japanEntryFitConfidence,
    japanEntryFitEvidence: isJapaneseCompany
      ? [...profile.japanEntryFitEvidence, "Deterministic evidence indicates a Japanese company."].slice(0, 8)
      : profile.japanEntryFitEvidence,
  }
}

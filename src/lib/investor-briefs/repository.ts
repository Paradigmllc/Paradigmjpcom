import { z } from "zod"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const INVESTOR_BRIEF_CONTENT_TYPE = "investor_brief" as const

const investorBriefPreviewSchema = z.object({
  category: z.string().min(1).max(80),
  region: z.string().min(1).max(80),
  assetClass: z.string().min(1).max(100),
  decisionStage: z.string().min(1).max(80),
  readTime: z.string().min(1).max(40),
  sourceCount: z.number().int().positive(),
})

const sourceSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(240),
  publisher: z.string().min(1).max(160),
  url: z.string().url(),
  accessedAt: z.string().date(),
})

const keyFactSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(240),
  meaning: z.string().min(1).max(600),
  sourceIds: z.array(z.string().min(1).max(80)).min(1),
})

const riskSchema = z.object({
  title: z.string().min(1).max(160),
  level: z.enum(["high", "medium", "context"]),
  whyItMatters: z.string().min(1).max(800),
  diligenceAction: z.string().min(1).max(800),
})

const decisionGateSchema = z.object({
  title: z.string().min(1).max(160),
  evidence: z.string().min(1).max(800),
  passCondition: z.string().min(1).max(800),
})

export const investorBriefPayloadSchema = z.object({
  schemaVersion: z.literal("1.0"),
  kicker: z.string().min(1).max(160),
  answer: z.string().min(1).max(2_000),
  decisionQuestion: z.string().min(1).max(500),
  audience: z.array(z.string().min(1).max(120)).min(1),
  keyFacts: z.array(keyFactSchema).min(3),
  risks: z.array(riskSchema).min(3),
  decisionGates: z.array(decisionGateSchema).min(3),
  checklist: z.array(z.string().min(1).max(600)).min(5),
  faqs: z.array(z.object({
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(1_000),
  })).min(2),
  methodology: z.object({
    purpose: z.string().min(1).max(600),
    process: z.string().min(1).max(1_000),
    limitations: z.string().min(1).max(1_000),
    reviewedBy: z.string().min(1).max(160),
  }),
  sources: z.array(sourceSchema).min(2),
  relatedSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(4),
})

const summaryRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  locale: z.literal("en"),
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(1_000),
  preview: investorBriefPreviewSchema,
  source_url: z.string().url(),
  license: z.string().min(1).max(200),
  version: z.number().int().positive(),
  published_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
})

const detailRowSchema = summaryRowSchema.extend({
  payload: investorBriefPayloadSchema,
})

export type InvestorBriefPreview = z.infer<typeof investorBriefPreviewSchema>
export type InvestorBriefPayload = z.infer<typeof investorBriefPayloadSchema>

export interface InvestorBriefSummary {
  id: string
  slug: string
  locale: "en"
  title: string
  summary: string
  preview: InvestorBriefPreview
  sourceUrl: string
  license: string
  version: number
  publishedAt: string
  updatedAt: string
  pageUrl: string
  endpoint: string
}

export interface InvestorBrief extends InvestorBriefSummary {
  payload: InvestorBriefPayload
}

export class InvestorBriefRepositoryError extends Error {
  constructor(message: string, public readonly code: "DATABASE_UNAVAILABLE" | "DATABASE_ERROR" | "DATA_INVALID") {
    super(message)
    this.name = "InvestorBriefRepositoryError"
  }
}

function database() {
  const client = getServiceSalesSupabase()
  if (!client) {
    throw new InvestorBriefRepositoryError(
      "Investor brief database is not configured.",
      "DATABASE_UNAVAILABLE",
    )
  }
  return client
}

function toSummary(row: z.infer<typeof summaryRowSchema>): InvestorBriefSummary {
  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    preview: row.preview,
    sourceUrl: row.source_url,
    license: row.license,
    version: row.version,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    pageUrl: `/en/japan-opportunities/invest/${row.slug}`,
    endpoint: `/api/v1/investor-briefs/${row.slug}`,
  }
}

function parseSummaryRows(rows: unknown[]): InvestorBriefSummary[] {
  return rows.map((row) => {
    const parsed = summaryRowSchema.safeParse(row)
    if (!parsed.success) {
      throw new InvestorBriefRepositoryError(
        `Investor brief summary failed validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
        "DATA_INVALID",
      )
    }
    return toSummary(parsed.data)
  })
}

export async function listInvestorBriefs(): Promise<InvestorBriefSummary[]> {
  const { data, error } = await database()
    .from(DB_TABLES.CONTENT_PRODUCTS)
    .select("id,slug,locale,title,summary,preview,source_url,license,version,published_at,updated_at")
    .eq("locale", "en")
    .eq("content_type", INVESTOR_BRIEF_CONTENT_TYPE)
    .eq("access_model", "free")
    .eq("is_active", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .order("slug", { ascending: true })

  if (error) {
    throw new InvestorBriefRepositoryError(error.message, "DATABASE_ERROR")
  }
  return parseSummaryRows((data ?? []) as unknown[])
}

export async function getInvestorBrief(slug: string): Promise<InvestorBrief | null> {
  const { data, error } = await database()
    .from(DB_TABLES.CONTENT_PRODUCTS)
    .select("id,slug,locale,title,summary,preview,payload,source_url,license,version,published_at,updated_at")
    .eq("slug", slug)
    .eq("locale", "en")
    .eq("content_type", INVESTOR_BRIEF_CONTENT_TYPE)
    .eq("access_model", "free")
    .eq("is_active", true)
    .lte("published_at", new Date().toISOString())
    .maybeSingle()

  if (error) {
    throw new InvestorBriefRepositoryError(error.message, "DATABASE_ERROR")
  }
  if (!data) return null

  const parsed = detailRowSchema.safeParse(data as unknown)
  if (!parsed.success) {
    throw new InvestorBriefRepositoryError(
      `Investor brief failed validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
      "DATA_INVALID",
    )
  }
  return { ...toSummary(parsed.data), payload: parsed.data.payload }
}

export function investorBriefToMarkdown(brief: InvestorBrief): string {
  const lines = [
    `# ${brief.title}`,
    "",
    brief.summary,
    "",
    `> ${brief.payload.answer}`,
    "",
    `- Published: ${brief.publishedAt}`,
    `- Updated: ${brief.updatedAt}`,
    `- Source page: https://paradigmjp.com${brief.pageUrl}`,
    `- License: ${brief.license}`,
    "",
    "## Key facts",
    "",
    ...brief.payload.keyFacts.flatMap((fact) => [
      `### ${fact.label}: ${fact.value}`,
      "",
      fact.meaning,
      "",
    ]),
    "## Decision gates",
    "",
    ...brief.payload.decisionGates.flatMap((gate) => [
      `### ${gate.title}`,
      "",
      `Evidence: ${gate.evidence}`,
      "",
      `Pass condition: ${gate.passCondition}`,
      "",
    ]),
    "## Risks",
    "",
    ...brief.payload.risks.flatMap((risk) => [
      `### ${risk.title} (${risk.level})`,
      "",
      risk.whyItMatters,
      "",
      `Diligence action: ${risk.diligenceAction}`,
      "",
    ]),
    "## Sources",
    "",
    ...brief.payload.sources.map((source) => `- [${source.title}](${source.url}) — ${source.publisher}; accessed ${source.accessedAt}`),
    "",
    "This brief is decision support, not investment, legal, tax, brokerage, or financial advice.",
  ]
  return lines.join("\n")
}

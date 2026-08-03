import { z } from "zod"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180)

const scenarioSourceSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(240),
  publisher: z.string().min(1).max(160),
  url: z.string().url(),
  accessedAt: z.string().date(),
})

const marketEvidenceSchema = z.object({
  asOf: z.string().date(),
  scope: z.string().min(1).max(500),
  points: z.array(z.object({
    market: z.string().min(1).max(100),
    averagePriceYenPerSqm: z.number().int().nonnegative(),
    annualChangePct: z.number().min(-100).max(100),
    sourceIds: z.array(z.string().min(1).max(80)).min(1),
  })).min(2).max(12),
})

const scenarioPreviewSchema = z.object({
  schemaVersion: z.literal("1.0"),
  marketLabel: z.string().min(1).max(120),
  strategyLabel: z.string().min(1).max(120),
  investorProfileLabel: z.string().min(1).max(120),
  fitBand: z.enum(["core", "selective"]),
  readTime: z.string().min(1).max(40),
  sourceCount: z.number().int().min(2),
})

const evidenceLensSchema = z.object({
  slug: slugSchema,
  label: z.string().min(1).max(120),
  objective: z.string().min(1).max(800).optional(),
  worksWhen: z.string().min(1).max(1_000).optional(),
  breaksWhen: z.string().min(1).max(1_000).optional(),
  mandate: z.string().min(1).max(1_000).optional(),
  governanceConstraint: z.string().min(1).max(1_000).optional(),
  capitalConstraint: z.string().min(1).max(1_000).optional(),
  requiredEvidence: z.array(z.string().min(1).max(500)).min(3),
})

const scenarioRiskSchema = z.object({
  title: z.string().min(1).max(180),
  level: z.enum(["high", "medium", "context"]),
  whyItMatters: z.string().min(1).max(1_200),
  diligenceAction: z.string().min(1).max(1_200),
})

const decisionGateSchema = z.object({
  title: z.string().min(1).max(180),
  evidence: z.string().min(1).max(1_200),
  passCondition: z.string().min(1).max(1_200),
})

export const investorScenarioPayloadSchema = z.object({
  schemaVersion: z.literal("1.0"),
  intentKey: z.string().min(1).max(240),
  marketBriefSlug: slugSchema,
  marketPageUrl: z.string().startsWith("/en/japan-opportunities/invest/"),
  decisionQuestion: z.string().min(1).max(500),
  directAnswer: z.string().min(200).max(2_000),
  coveredMarkets: z.array(z.string().min(1).max(120)).min(2).max(24),
  strategy: evidenceLensSchema,
  investorProfile: evidenceLensSchema,
  underwritingDefaults: z.object({
    purchasePriceYenMn: z.number().positive(),
    grossYieldPct: z.number().positive().max(100),
    occupancyPct: z.number().positive().max(100),
    operatingCostPct: z.number().nonnegative().max(100),
    debtPct: z.number().nonnegative().max(100),
    interestRatePct: z.number().nonnegative().max(100),
    holdYears: z.number().int().min(1).max(30),
    exitYieldShiftBps: z.number().int().min(-1_000).max(2_000),
  }),
  analysisSections: z.array(z.object({
    id: z.enum(["mandate-fit", "underwriting-frame", "risk-control", "decision-and-exit"]),
    title: z.string().min(1).max(240),
    lede: z.string().min(1).max(500),
    paragraphs: z.array(z.string().min(500).max(3_000)).length(2),
    sourceIds: z.array(z.string().min(1).max(80)).min(2),
  })).length(4),
  marketEvidence: marketEvidenceSchema,
  risks: z.array(scenarioRiskSchema).min(4),
  decisionGates: z.array(decisionGateSchema).min(3),
  checklist: z.array(z.string().min(1).max(500)).min(8),
  faqs: z.array(z.object({
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(1_500),
  })).min(3),
  methodology: z.object({
    purpose: z.string().min(1).max(800),
    process: z.string().min(1).max(1_200),
    limitations: z.string().min(1).max(1_200),
    reviewedBy: z.string().min(1).max(180),
    reviewStatus: z.literal("system_quality_gated"),
  }),
  sources: z.array(scenarioSourceSchema).min(2),
  qualitySignals: z.object({
    distinctIntent: z.literal(true),
    interactiveUnderwriting: z.literal(true),
    canonicalRequired: z.literal(true),
    minimumSourceCount: z.number().int().min(2),
    analysisSectionCount: z.literal(4),
    candidateDoesNotMeanPublished: z.literal(true),
  }),
})

const summaryRowSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  locale: z.literal("en"),
  market_slug: slugSchema,
  strategy_slug: slugSchema,
  investor_profile_slug: slugSchema,
  title: z.string().min(20).max(240),
  summary: z.string().min(120).max(1_000),
  preview: scenarioPreviewSchema,
  source_count: z.number().int().min(2),
  quality_score: z.number().int().min(90).max(100),
  published_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
})

const detailRowSchema = summaryRowSchema.extend({ payload: investorScenarioPayloadSchema })

export type InvestorScenarioPreview = z.infer<typeof scenarioPreviewSchema>
export type InvestorScenarioPayload = z.infer<typeof investorScenarioPayloadSchema>
export type InvestorScenarioDefaults = InvestorScenarioPayload["underwritingDefaults"]

export interface InvestorScenarioSummary {
  id: string
  slug: string
  locale: "en"
  marketSlug: string
  strategySlug: string
  investorProfileSlug: string
  title: string
  summary: string
  preview: InvestorScenarioPreview
  sourceCount: number
  qualityScore: number
  publishedAt: string
  updatedAt: string
  pageUrl: string
  endpoint: string
}

export interface InvestorScenario extends InvestorScenarioSummary {
  payload: InvestorScenarioPayload
}

export interface InvestorScenarioFilters {
  marketSlug?: string
  strategySlug?: string
  investorProfileSlug?: string
  limit?: number
  offset?: number
}

export interface InvestorScenarioList {
  items: InvestorScenarioSummary[]
  total: number
  limit: number
  offset: number
}

export class InvestorScenarioRepositoryError extends Error {
  constructor(message: string, public readonly code: "DATABASE_UNAVAILABLE" | "DATABASE_ERROR" | "DATA_INVALID") {
    super(message)
    this.name = "InvestorScenarioRepositoryError"
  }
}

function database() {
  const client = getServiceSalesSupabase()
  if (!client) {
    throw new InvestorScenarioRepositoryError("Investor scenario database is not configured.", "DATABASE_UNAVAILABLE")
  }
  return client
}

function toSummary(row: z.infer<typeof summaryRowSchema>): InvestorScenarioSummary {
  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale,
    marketSlug: row.market_slug,
    strategySlug: row.strategy_slug,
    investorProfileSlug: row.investor_profile_slug,
    title: row.title,
    summary: row.summary,
    preview: row.preview,
    sourceCount: row.source_count,
    qualityScore: row.quality_score,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    pageUrl: `/en/japan-opportunities/invest/markets/${row.market_slug}/${row.strategy_slug}/${row.investor_profile_slug}`,
    endpoint: `/api/v1/investor-scenarios/${row.slug}`,
  }
}

function parseSummaryRows(rows: unknown[]): InvestorScenarioSummary[] {
  return rows.map((row) => {
    const parsed = summaryRowSchema.safeParse(row)
    if (!parsed.success) {
      throw new InvestorScenarioRepositoryError(
        `Investor scenario summary failed validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
        "DATA_INVALID",
      )
    }
    return toSummary(parsed.data)
  })
}

export async function listInvestorScenarios(filters: InvestorScenarioFilters = {}): Promise<InvestorScenarioList> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 1_000)
  const offset = Math.max(filters.offset ?? 0, 0)
  let query = database()
    .from(DB_TABLES.INVESTOR_METRO_SCENARIOS)
    .select("id,slug,locale,market_slug,strategy_slug,investor_profile_slug,title,summary,preview,source_count,quality_score,published_at,updated_at", { count: "exact" })
    .eq("locale", "en")
    .eq("is_indexable", true)
    .lte("published_at", new Date().toISOString())

  if (filters.marketSlug) query = query.eq("market_slug", filters.marketSlug)
  if (filters.strategySlug) query = query.eq("strategy_slug", filters.strategySlug)
  if (filters.investorProfileSlug) query = query.eq("investor_profile_slug", filters.investorProfileSlug)

  const { data, error, count } = await query
    .order("market_slug", { ascending: true })
    .order("strategy_slug", { ascending: true })
    .order("investor_profile_slug", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw new InvestorScenarioRepositoryError(error.message, "DATABASE_ERROR")
  return { items: parseSummaryRows((data ?? []) as unknown[]), total: count ?? 0, limit, offset }
}

export async function getInvestorScenario(slug: string): Promise<InvestorScenario | null> {
  const { data, error } = await database()
    .from(DB_TABLES.INVESTOR_METRO_SCENARIOS)
    .select("id,slug,locale,market_slug,strategy_slug,investor_profile_slug,title,summary,preview,payload,source_count,quality_score,published_at,updated_at")
    .eq("slug", slug)
    .eq("locale", "en")
    .eq("is_indexable", true)
    .lte("published_at", new Date().toISOString())
    .maybeSingle()

  if (error) throw new InvestorScenarioRepositoryError(error.message, "DATABASE_ERROR")
  if (!data) return null
  const parsed = detailRowSchema.safeParse(data as unknown)
  if (!parsed.success) {
    throw new InvestorScenarioRepositoryError(
      `Investor scenario failed validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
      "DATA_INVALID",
    )
  }
  return { ...toSummary(parsed.data), payload: parsed.data.payload }
}

export async function getInvestorScenarioByPath(
  marketSlug: string,
  strategySlug: string,
  investorProfileSlug: string,
): Promise<InvestorScenario | null> {
  return getInvestorScenario(`${marketSlug}-${strategySlug}-${investorProfileSlug}`)
}

function readableWordCount(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:[.'’\u2010-\u2015-][\p{L}\p{N}]+)*/gu)?.length ?? 0
}

export function investorScenarioReadableWordCount(scenario: InvestorScenario): number {
  const { payload } = scenario
  const fields = [
    scenario.title,
    scenario.summary,
    payload.decisionQuestion,
    payload.directAnswer,
    payload.strategy.objective ?? "",
    payload.strategy.worksWhen ?? "",
    payload.strategy.breaksWhen ?? "",
    ...payload.strategy.requiredEvidence,
    payload.investorProfile.mandate ?? "",
    payload.investorProfile.governanceConstraint ?? "",
    payload.investorProfile.capitalConstraint ?? "",
    ...payload.investorProfile.requiredEvidence,
    ...payload.analysisSections.flatMap((section) => [section.title, section.lede, ...section.paragraphs]),
    payload.marketEvidence.scope,
    ...payload.marketEvidence.points.map((point) => point.market),
    ...payload.risks.flatMap((risk) => [risk.title, risk.whyItMatters, risk.diligenceAction]),
    ...payload.decisionGates.flatMap((gate) => [gate.title, gate.evidence, gate.passCondition]),
    ...payload.checklist,
    ...payload.faqs.flatMap((faq) => [faq.question, faq.answer]),
    payload.methodology.purpose,
    payload.methodology.process,
    payload.methodology.limitations,
  ]
  return fields.reduce((total, field) => total + readableWordCount(field), 0)
}

export function investorScenarioToMarkdown(scenario: InvestorScenario): string {
  const { payload } = scenario
  return [
    `# ${scenario.title}`,
    "",
    scenario.summary,
    "",
    `> ${payload.directAnswer}`,
    "",
    ...payload.analysisSections.flatMap((section) => [
      `## ${section.title}`,
      "",
      `_${section.lede}_`,
      "",
      ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
      `Sources: ${section.sourceIds.join(", ")}`,
      "",
    ]),
    "## Market evidence",
    "",
    `${payload.marketEvidence.scope} As of ${payload.marketEvidence.asOf}.`,
    "",
    "| Market | Residential land price | Annual change |",
    "| --- | ---: | ---: |",
    ...payload.marketEvidence.points.map((point) => `| ${point.market} | JPY ${point.averagePriceYenPerSqm.toLocaleString("en-US")}/sq m | ${point.annualChangePct.toFixed(1)}% |`),
    "",
    "## Decision gates",
    "",
    ...payload.decisionGates.flatMap((gate) => [`### ${gate.title}`, "", `Evidence: ${gate.evidence}`, "", `Pass: ${gate.passCondition}`, ""]),
    "## Sources",
    "",
    ...payload.sources.map((source) => `- [${source.title}](${source.url}) — ${source.publisher}; accessed ${source.accessedAt}`),
    "",
    payload.methodology.limitations,
  ].join("\n")
}

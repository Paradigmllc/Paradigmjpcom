import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  investorBriefPayloadSchema,
  investorBriefReadableWordCount,
  investorBriefToMarkdown,
  type InvestorBrief,
  type InvestorBriefPayload,
} from "./repository"
import {
  CURATED_INVESTOR_COMPARISONS,
  comparisonPairSlug,
  parseComparisonPair,
} from "./comparisons"
import { calculateInvestorPseoScale, INVESTOR_PSEO_QUALITY_GATES } from "./pseo-scale"

const payload: InvestorBriefPayload = {
  schemaVersion: "1.0",
  kicker: "JAPAN / TEST ASSET",
  answer: "Advance only after the evidence is verified.",
  decisionQuestion: "Does the asset pass the evidence gate?",
  audience: ["Foreign investors"],
  keyFacts: [
    { label: "Fact one", value: "Verified", meaning: "First decision fact.", sourceIds: ["official"] },
    { label: "Fact two", value: "Dated", meaning: "Second decision fact.", sourceIds: ["official"] },
    { label: "Fact three", value: "Scoped", meaning: "Third decision fact.", sourceIds: ["official"] },
  ],
  risks: [
    { title: "Price", level: "high", whyItMatters: "Price can be wrong.", diligenceAction: "Check completed transactions." },
    { title: "Operations", level: "medium", whyItMatters: "Operations can fail.", diligenceAction: "Verify the operator." },
    { title: "Context", level: "context", whyItMatters: "Conditions can change.", diligenceAction: "Date every assumption." },
  ],
  decisionGates: [
    { title: "Rights", evidence: "Registry evidence.", passCondition: "Rights are clear." },
    { title: "Returns", evidence: "Cash-flow evidence.", passCondition: "Downside meets mandate." },
    { title: "Execution", evidence: "Named operators.", passCondition: "Every task has an owner." },
  ],
  checklist: ["Registry", "Financials", "Tax", "Operations", "Exit"],
  faqs: [
    { question: "Is this advice?", answer: "No." },
    { question: "Should facts be refreshed?", answer: "Yes." },
  ],
  methodology: {
    purpose: "Test the content contract.",
    process: "Map official evidence into decision gates.",
    limitations: "No asset-specific verification.",
    reviewedBy: "Paradigm Research Desk",
  },
  sources: [
    { id: "official", title: "Official source", publisher: "Government body", url: "https://example.go.jp/source", accessedAt: "2026-08-02" },
    { id: "official-two", title: "Second source", publisher: "Public body", url: "https://example.go.jp/source-two", accessedAt: "2026-08-02" },
  ],
  relatedSlugs: ["related-investor-brief"],
}

const brief: InvestorBrief = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  slug: "test-investor-brief",
  locale: "en",
  title: "Test Investor Brief",
  summary: "A sourced test brief.",
  preview: {
    category: "Test",
    region: "Japan",
    assetClass: "Test asset",
    decisionStage: "Screening",
    readTime: "5 min",
    sourceCount: 2,
  },
  sourceUrl: "https://paradigmjp.com/en/japan-opportunities/invest/test-investor-brief",
  license: "Paradigm API Terms",
  version: 1,
  publishedAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  pageUrl: "/en/japan-opportunities/invest/test-investor-brief",
  endpoint: "/api/v1/investor-briefs/test-investor-brief",
  payload,
}

function extractMetroProfiles(file: string): Array<Record<string, unknown>> {
  const migration = fs.readFileSync(path.join(process.cwd(), file), "utf8")
  return [...migration.matchAll(/\$profile\$(\{[\s\S]*?\})\$profile\$/g)]
    .map((match) => JSON.parse(match[1]) as Record<string, unknown>)
}

describe("investor brief content contract", () => {
  it("accepts a sourced decision brief with facts, risks and decision gates", () => {
    expect(investorBriefPayloadSchema.safeParse(payload).success).toBe(true)
  })

  it("rejects a thin payload that omits primary sources", () => {
    const result = investorBriefPayloadSchema.safeParse({ ...payload, sources: [] })
    expect(result.success).toBe(false)
  })

  it("delivers the same decision model as attributable Markdown", () => {
    const markdown = investorBriefToMarkdown(brief)
    expect(markdown).toContain("# Test Investor Brief")
    expect(markdown).toContain("## Decision gates")
    expect(markdown).toContain("[Official source](https://example.go.jp/source)")
    expect(markdown).toContain("not investment, legal, tax, brokerage, or financial advice")
  })

  it("includes metro narrative and evidence tables in machine-readable Markdown", () => {
    const metroBrief: InvestorBrief = {
      ...brief,
      payload: {
        ...payload,
        coveredMarkets: ["Market A", "Market B"],
        chapters: [{
          title: "Investment thesis",
          lede: "A sourced market thesis.",
          paragraphs: ["First evidence paragraph.", "Second evidence paragraph."],
          sourceIds: ["official"],
        }, {
          title: "Demand",
          lede: "Demand must be observed.",
          paragraphs: ["Leasing evidence.", "Buyer evidence."],
          sourceIds: ["official"],
        }, {
          title: "Downside",
          lede: "Downside is explicit.",
          paragraphs: ["Hazard evidence.", "Exit evidence."],
          sourceIds: ["official-two"],
        }],
        marketEvidence: {
          asOf: "2026-01-01",
          scope: "Official residential benchmarks.",
          points: [
            { market: "Market A", averagePriceYenPerSqm: 500_000, annualChangePct: 5.2, sourceIds: ["official"] },
            { market: "Market B", averagePriceYenPerSqm: 300_000, annualChangePct: 3.1, sourceIds: ["official"] },
          ],
        },
      },
    }
    const markdown = investorBriefToMarkdown(metroBrief)
    expect(markdown).toContain("## Market analysis")
    expect(markdown).toContain("## Market evidence")
    expect(markdown).toContain("| Market A | JPY 500,000/sq m | 5.2% |")
    expect(markdown).toContain("## Diligence checklist")
    expect(markdown).toContain("## Methodology and limits")
  })

  it("ships twelve database-seeded briefs that all satisfy the evidence contract", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260802043347_foreign_investor_pseo.sql"),
      "utf8",
    )
    const match = migration.match(/\$investor_briefs\$\s*(\[[\s\S]*?\])\s*\$investor_briefs\$::jsonb/)
    expect(match?.[1]).toBeTruthy()
    const seeds = JSON.parse(match?.[1] ?? "[]") as Array<{
      slug: string
      preview: { sourceCount: number }
      payload: unknown
    }>

    expect(seeds).toHaveLength(12)
    expect(new Set(seeds.map((seed) => seed.slug)).size).toBe(12)
    for (const seed of seeds) {
      const parsed = investorBriefPayloadSchema.safeParse(seed.payload)
      expect(parsed.success, `${seed.slug} must satisfy the investor brief schema`).toBe(true)
      if (parsed.success) expect(seed.preview.sourceCount).toBe(parsed.data.sources.length)
    }
  })

  it("expands every legacy brief with unique sourced analysis and durable official links", () => {
    const seedMigration = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260802043347_foreign_investor_pseo.sql"),
      "utf8",
    )
    const expansionMigration = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260802202105_expand_legacy_investor_briefs.sql"),
      "utf8",
    )
    const seedMatch = seedMigration.match(/\$investor_briefs\$\s*(\[[\s\S]*?\])\s*\$investor_briefs\$::jsonb/)
    const expansionMatch = expansionMigration.match(/\$legacy_expansions\$\s*(\[[\s\S]*?\])\s*\$legacy_expansions\$::jsonb/)
    const seeds = JSON.parse(seedMatch?.[1] ?? "[]") as Array<{
      slug: string
      title: string
      summary: string
      payload: InvestorBriefPayload
    }>
    const expansions = JSON.parse(expansionMatch?.[1] ?? "[]") as Array<{
      slug: string
      chapters: NonNullable<InvestorBriefPayload["chapters"]>
    }>
    const chaptersBySlug = new Map(expansions.map((expansion) => [expansion.slug, expansion.chapters]))

    expect(expansions).toHaveLength(12)
    expect(new Set(expansions.map((expansion) => expansion.slug)).size).toBe(12)
    for (const seed of seeds) {
      const chapters = chaptersBySlug.get(seed.slug)
      expect(chapters, `${seed.slug} needs a legacy expansion`).toHaveLength(4)
      const expandedPayload = { ...seed.payload, chapters }
      const parsed = investorBriefPayloadSchema.safeParse(expandedPayload)
      expect(parsed.success, `${seed.slug} expansion must satisfy the schema`).toBe(true)
      if (!parsed.success) continue

      const sourceIds = new Set(parsed.data.sources.map((source) => source.id))
      for (const chapter of parsed.data.chapters ?? []) {
        expect(chapter.paragraphs).toHaveLength(2)
        expect(chapter.paragraphs.every((paragraph) => paragraph.length >= 400)).toBe(true)
        expect(chapter.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(true)
      }
      expect(investorBriefReadableWordCount({
        title: seed.title,
        summary: seed.summary,
        payload: parsed.data,
      }), `${seed.slug} needs substantial decision content`).toBeGreaterThanOrEqual(1_100)
    }

    expect(expansionMigration).toContain("https://minpakuportal.city.kyoto.lg.jp/list/list1")
    expect(expansionMatch?.[1]).not.toContain("20260131itiran_eng.pdf")
    expect(expansionMigration).toContain("retired Kyoto lodging PDF URL remains in investor content")
  })

  it("fails closed when Greater Tokyo analysis is duplicated or too short", () => {
    const uniquenessMigration = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260802222332_diversify_greater_tokyo_investor_analysis.sql"),
      "utf8",
    )

    expect(uniquenessMigration).toContain("expected 16 diversified Greater Tokyo briefs")
    expect(uniquenessMigration).toContain("investor chapter titles are not unique")
    expect(uniquenessMigration).toContain("investor paragraphs are not unique")
    expect(uniquenessMigration).toContain("length(paragraph.value) < 400")
    expect(uniquenessMigration).toContain("investor analysis chapter references an unknown source")
    expect(uniquenessMigration).toContain("paragraph_count <> 288")
  })

  it("counts rendered prose instead of serialized payload keys", () => {
    const readableCount = investorBriefReadableWordCount(brief)
    const changedMachineFields: InvestorBrief = {
      ...brief,
      payload: {
        ...brief.payload,
        sources: brief.payload.sources.map((source, index) => ({
          ...source,
          id: `${source.id}-machine-id-${index}`,
          url: `https://example.go.jp/machine-path-${index}`,
        })),
      },
    }

    expect(readableCount).toBeGreaterThan(80)
    expect(investorBriefReadableWordCount(changedMachineFields)).toBe(readableCount)
    expect(JSON.stringify(brief.payload).split(/\s+/).length).not.toBe(readableCount)
  })

  it("ships sixteen distinct, evidence-rich Greater Tokyo market profiles", () => {
    const migrationFiles = [
      "supabase/migrations/20260802123100_tokyo_metro_investor_briefs.sql",
      "supabase/migrations/20260802123200_greater_tokyo_ring_investor_briefs.sql",
    ]
    const tokyo = extractMetroProfiles(migrationFiles[0])
    const ring = extractMetroProfiles(migrationFiles[1])
    const profiles = [...tokyo, ...ring]

    expect(tokyo).toHaveLength(10)
    expect(ring).toHaveLength(6)
    expect(new Set(profiles.map((profile) => profile.slug)).size).toBe(16)
    for (const profile of profiles) {
      expect(profile).toMatchObject({
        slug: expect.any(String),
        title: expect.any(String),
        summary: expect.any(String),
        thesis: expect.any(String),
        demand: expect.any(String),
        supply: expect.any(String),
        downside: expect.any(String),
      })
      expect(profile.coveredMarkets).toEqual(expect.arrayContaining([expect.any(String)]))
      expect((profile.coveredMarkets as unknown[]).length).toBeGreaterThanOrEqual(2)
      expect((profile.evidencePoints as unknown[]).length).toBeGreaterThanOrEqual(2)
    }
    for (const migrationFile of migrationFiles) {
      const migration = fs.readFileSync(path.join(process.cwd(), migrationFile), "utf8")
      expect(migration).toContain("'investor_brief', 'free', 0, 'eip155:8453'")
      expect(migration).toContain("price_usdc = EXCLUDED.price_usdc")
      expect(migration).not.toContain("'investor_brief', 'free', NULL, NULL")
    }
  })

  it("defines curated A/B URLs without turning every arbitrary pair into an indexable page", () => {
    expect(CURATED_INVESTOR_COMPARISONS.length).toBeGreaterThanOrEqual(10)
    const first = CURATED_INVESTOR_COMPARISONS[0]
    const pair = comparisonPairSlug(first.left, first.right)
    expect(parseComparisonPair(pair)).toEqual({ left: first.left, right: first.right })
    expect(parseComparisonPair(`${first.left}-vs-${first.left}`)).toEqual({ left: first.left, right: first.left })
    expect(parseComparisonPair("not-a-pair")).toBeNull()
  })

  it("models a six-figure candidate universe while keeping publication quality-gated", () => {
    const scale = calculateInvestorPseoScale(12)
    expect(scale.inputs).toEqual({
      themes: 12,
      prefectures: 47,
      investorProfiles: 5,
      locales: 12,
      greaterTokyoSubmarkets: 16,
      metroPropertyStrategies: 6,
    })
    expect(scale.candidates.themeMarketProfileLocale).toBe(33_840)
    expect(scale.candidates.marketComparisonsByThemeAndLocale).toBe(155_664)
    expect(scale.candidates.greaterTokyoStrategyProfileLocale).toBe(5_760)
    expect(scale.candidates.total).toBe(195_264)
    expect(scale.policy.indexableOnlyAfterQualityGate).toBe(true)
    expect(INVESTOR_PSEO_QUALITY_GATES).toMatchObject({
      minimumPrimarySources: 2,
      requiresDistinctIntent: true,
      requiresInteractiveTool: true,
      requiresHumanTranslationReview: true,
    })
  })
})

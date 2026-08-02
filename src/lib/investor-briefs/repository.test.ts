import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  investorBriefPayloadSchema,
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
    expect(scale.inputs).toEqual({ themes: 12, prefectures: 47, investorProfiles: 5, locales: 12 })
    expect(scale.candidates.themeMarketProfileLocale).toBe(33_840)
    expect(scale.candidates.marketComparisonsByThemeAndLocale).toBe(155_664)
    expect(scale.candidates.total).toBe(189_504)
    expect(scale.policy.indexableOnlyAfterQualityGate).toBe(true)
    expect(INVESTOR_PSEO_QUALITY_GATES).toMatchObject({
      minimumPrimarySources: 2,
      requiresDistinctIntent: true,
      requiresInteractiveTool: true,
      requiresHumanTranslationReview: true,
    })
  })
})

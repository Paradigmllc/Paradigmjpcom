import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  investorScenarioPayloadSchema,
  investorScenarioReadableWordCount,
  investorScenarioToMarkdown,
  type InvestorScenario,
} from "./repository"

const substantialParagraph = (label: string) => `${label} ${"This decision record connects the exact market boundary, investor mandate, operating evidence, downside assumptions, governance owner and exit buyer to a dated source. ".repeat(5)}`

const scenario: InvestorScenario = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  slug: "yokohama-multifamily-income-family-office",
  locale: "en",
  marketSlug: "yokohama",
  strategySlug: "multifamily-income",
  investorProfileSlug: "family-office",
  title: "Yokohama Multifamily Income for Family Office",
  summary: "A source-backed multifamily income screen for a family office in Yokohama, combining official market evidence, mandate constraints and downside tests.",
  preview: { schemaVersion: "1.0", marketLabel: "Yokohama", strategyLabel: "Multifamily income", investorProfileLabel: "Family office", fitBand: "core", readTime: "14 min", sourceCount: 2 },
  sourceCount: 2,
  qualityScore: 96,
  publishedAt: "2026-08-03T01:30:00.000Z",
  updatedAt: "2026-08-03T01:30:00.000Z",
  pageUrl: "/en/japan-opportunities/invest/markets/yokohama/multifamily-income/family-office",
  endpoint: "/api/v1/investor-scenarios/yokohama-multifamily-income-family-office",
  payload: {
    schemaVersion: "1.0",
    intentKey: "yokohama:multifamily-income:family-office",
    marketBriefSlug: "yokohama-real-estate-investment",
    marketPageUrl: "/en/japan-opportunities/invest/yokohama-real-estate-investment",
    decisionQuestion: "Does Yokohama support a defensible multifamily allocation for a family office?",
    directAnswer: "Yokohama can support a family-office multifamily allocation only when achieved rents, normalized operating costs, condition evidence, governance and exit buyers are reconciled to the exact asset. This record is a diligence hypothesis and not a recommendation, valuation or return forecast.",
    coveredMarkets: ["Nishi Ward", "Naka Ward"],
    strategy: { slug: "multifamily-income", label: "Multifamily income", objective: "Durable rental income.", worksWhen: "Achieved leases support income.", breaksWhen: "Asking rents replace achieved evidence.", requiredEvidence: ["Rent roll", "Leasing cohorts", "Condition plan"] },
    investorProfile: { slug: "family-office", label: "Family office", mandate: "Governable real-asset allocation.", governanceConstraint: "Committee authority must be documented.", capitalConstraint: "Portfolio concentration and reserves must be tested.", requiredEvidence: ["Policy check", "Reporting protocol", "Ownership workflow"] },
    underwritingDefaults: { purchasePriceYenMn: 600, grossYieldPct: 4.5, occupancyPct: 94, operatingCostPct: 28, debtPct: 55, interestRatePct: 2.5, holdYears: 7, exitYieldShiftBps: 50 },
    analysisSections: ["mandate-fit", "underwriting-frame", "risk-control", "decision-and-exit"].map((id, index) => ({ id: id as "mandate-fit" | "underwriting-frame" | "risk-control" | "decision-and-exit", title: `Yokohama scenario section ${index + 1}`, lede: "A source-backed decision section.", paragraphs: [substantialParagraph(`${id} A.`), substantialParagraph(`${id} B.`)], sourceIds: ["mlit", "reins"] })),
    marketEvidence: { asOf: "2026-01-01", scope: "Official Yokohama residential land-price evidence.", points: [{ market: "Nishi Ward", averagePriceYenPerSqm: 500_000, annualChangePct: 6.2, sourceIds: ["mlit"] }, { market: "Naka Ward", averagePriceYenPerSqm: 440_000, annualChangePct: 5.1, sourceIds: ["mlit"] }] },
    risks: Array.from({ length: 4 }, (_, index) => ({ title: `Risk ${index + 1}`, level: "high" as const, whyItMatters: "The downside can impair income and exit value.", diligenceAction: "Assign evidence, an owner and a stop condition." })),
    decisionGates: Array.from({ length: 3 }, (_, index) => ({ title: `Gate ${index + 1}`, evidence: "Reconciled market and asset evidence.", passCondition: "The linked downside remains fundable." })),
    checklist: ["Rent roll", "Leases", "Condition", "Title", "Hazards", "Financing", "Operations", "Exit"],
    faqs: [{ question: "Is this advice?", answer: "No, it is a transparent diligence screen." }, { question: "Is this a valuation?", answer: "No, asset evidence is required." }, { question: "Can inputs change?", answer: "Yes, every underwriting assumption is editable." }],
    methodology: { purpose: "Test a distinct investment decision.", process: "Combine official evidence with transparent downside tests.", limitations: "No asset has been inspected or valued and no investment advice is provided.", reviewedBy: "Paradigm Greater Tokyo Real Estate Intelligence Desk", reviewStatus: "system_quality_gated" },
    sources: [{ id: "mlit", title: "Published Land Prices", publisher: "MLIT", url: "https://www.mlit.go.jp/", accessedAt: "2026-08-02" }, { id: "reins", title: "Market Trends", publisher: "REINS", url: "https://www.reins.or.jp/", accessedAt: "2026-08-02" }],
    qualitySignals: { distinctIntent: true, interactiveUnderwriting: true, canonicalRequired: true, minimumSourceCount: 2, analysisSectionCount: 4, candidateDoesNotMeanPublished: true },
  },
}

describe("Greater Tokyo investor scenario content contract", () => {
  it("accepts a substantial sourced scenario and distributes it as Markdown", () => {
    expect(investorScenarioPayloadSchema.safeParse(scenario.payload).success).toBe(true)
    expect(investorScenarioReadableWordCount(scenario)).toBeGreaterThan(900)
    const markdown = investorScenarioToMarkdown(scenario)
    expect(markdown).toContain("# Yokohama Multifamily Income for Family Office")
    expect(markdown).toContain("## Market evidence")
    expect(markdown).toContain("[Published Land Prices](https://www.mlit.go.jp/)")
  })

  it("rejects thin analysis and missing source evidence", () => {
    const thin = { ...scenario.payload, sources: [], analysisSections: scenario.payload.analysisSections.map((section) => ({ ...section, paragraphs: ["thin", "thin"] })) }
    expect(investorScenarioPayloadSchema.safeParse(thin).success).toBe(false)
  })

  it("seeds exactly 320 gated combinations rather than every candidate", () => {
    const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260803013000_investor_metro_scenarios.sql"), "utf8")
    const marketBlock = migration.match(/WITH market_strategy_map[\s\S]*?\), strategy\(/)?.[0] ?? ""
    const marketRows = [...marketBlock.matchAll(/\('([^']+)', '([^']+)', ARRAY\[([^\]]+)\]\)/g)]
    expect(marketRows).toHaveLength(16)
    for (const row of marketRows) expect(row[3]?.split(",")).toHaveLength(4)
    expect(migration).toContain("expected 320 indexable scenarios across 16 markets")
    expect(migration).toContain("scenario analysis paragraphs are not unique")
    expect(migration).toContain("length(paragraph.value) < 500")
    expect(migration).toContain("FORCE ROW LEVEL SECURITY")
    expect(migration).toContain("REVOKE ALL ON public.investor_metro_scenarios FROM PUBLIC, anon, authenticated")
  })

  it("applies and verifies the scenario migration inside the production container before startup", () => {
    const runtime = fs.readFileSync(path.join(process.cwd(), "scripts/apply-investor-scenario-runtime-migration.mjs"), "utf8")
    const dockerfile = fs.readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8")
    const dockerignore = fs.readFileSync(path.join(process.cwd(), ".dockerignore"), "utf8")
    const entrypoint = fs.readFileSync(path.join(process.cwd(), "docker-entrypoint.sh"), "utf8")
    expect(runtime).toContain("scenario_count === 320")
    expect(runtime).toContain("unique_paragraphs === 2_560")
    expect(runtime).toContain("row.force_rls === true")
    expect(runtime).toContain("row.anon_select === false")
    expect(dockerfile).toContain("scripts/apply-investor-scenario-runtime-migration.mjs")
    expect(dockerfile).toContain("20260803013000_investor_metro_scenarios.sql")
    expect(dockerignore).toContain("!scripts/apply-investor-scenario-runtime-migration.mjs")
    expect(dockerignore).toContain("!supabase/migrations/20260803013000_investor_metro_scenarios.sql")
    expect(entrypoint.indexOf("node /app/scripts/apply-investor-scenario-runtime-migration.mjs"))
      .toBeLessThan(entrypoint.lastIndexOf("start_video_factory"))
  })
})

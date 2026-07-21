import type { JapanEntryProjection } from "./japan-entry-projection"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import type {
  ManualCustomerReportPriority,
  ManualCustomerReportRoadmapStep,
  ManualJapanEntryReportData,
  ManualReportGap,
} from "./manual-japan-entry-report-types"
import { buildManualStrategyChapters, countStrategyWords } from "./manual-japan-entry-strategy-chapters"

type CustomerView = ManualJapanEntryReportData["customerView"]

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function unique(values: Array<string | null | undefined>, limit: number): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].slice(0, limit)
}

function sentence(value: string): string {
  const normalized = value.trim()
  return /[.!?。！？]$/.test(normalized) ? normalized : `${normalized}.`
}

const INTERNAL_STRATEGY_VALUES = new Set([
  "problem", "competitor", "opportunity", "mockup", "unverified", "unknown", "n/a", "none",
])

function compactPublicText(value: string, maxLength = 300): string {
  const parts = value
    .split(/\s*\|\s*|(?<=[.!?。！？])\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 12)
  const selected: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const key = part.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const next = [...selected, part].join(" ")
    if (next.length > maxLength && selected.length > 0) break
    selected.push(part)
    if (selected.length >= 2) break
  }
  const compact = selected.join(" ") || value.replace(/\s+/g, " ").trim()
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength - 1).trimEnd()}…`
}

function publicStrategyText(value: unknown, fallback: string): string {
  const candidate = text(value)
  if (!candidate || INTERNAL_STRATEGY_VALUES.has(candidate.toLowerCase())) return fallback
  return compactPublicText(candidate, 260)
}

function money(value: number): string {
  return `$${Math.max(0, Math.round(value)).toLocaleString("en-US")}`
}

function annualRevenue(projection: JapanEntryProjection, scenarioName: "conservative" | "upside"): number | null {
  const scenario = projection.scenarios.find((item) => item.scenario === scenarioName)
  if (!scenario || scenario.months.length < 12) return null
  return scenario.months.slice(0, 12).reduce((sum, month) => sum + month.incrementalRevenueUsd, 0)
}

function projectionView(projection: JapanEntryProjection | null): CustomerView["projection"] {
  if (!projection) return null
  const low = annualRevenue(projection, "conservative")
  const high = annualRevenue(projection, "upside")
  if (low === null || high === null) return null
  return {
    monthlyVisitRange: `${projection.monthlyVisitRange.low.toLocaleString("en-US")}–${projection.monthlyVisitRange.high.toLocaleString("en-US")}`,
    firstYearOpportunityRange: `${money(low)}–${money(high)}`,
    basis: "A scenario range built from public visibility signals and business-model assumptions; it is intended for prioritization, not forecasting.",
    disclaimer: "These figures are modeled estimates, not measured analytics or observed revenue. Actual demand and performance have not been validated and are not guaranteed.",
  }
}

function priorityForGap(companyName: string, productContext: string, gap: ManualReportGap): ManualCustomerReportPriority {
  const definitions: Record<string, Omit<ManualCustomerReportPriority, "finding">> = {
    "japan-audit-language": {
      title: "Build a Japanese evaluation path",
      recommendation: `Translate the core ${companyName} value proposition into a focused Japanese landing and evaluation journey, using the existing product capability as the starting point rather than a generic corporate translation.`,
      decisionValue: "Tests whether qualified Japanese prospects understand the offer and know what to do next.",
    },
    "japan-audit-jpy": {
      title: "Make the commercial frame legible in Japan",
      recommendation: "Test a customer-facing JPY presentation with clear scope, billing basis, and international-purchase handling before changing the underlying commercial terms.",
      decisionValue: "Separates pricing comprehension from actual willingness to buy.",
    },
    "japan-audit-shipping": {
      title: "Clarify the Japan delivery promise",
      recommendation: "Create a Japan-specific delivery page covering eligible products, expected timing, duties, returns, and support boundaries using confirmed operating facts only.",
      decisionValue: "Tests whether delivery uncertainty is preventing otherwise qualified demand from progressing.",
    },
    "japan-audit-payments": {
      title: "Validate checkout fit before adding payment methods",
      recommendation: "Review the current checkout flow with Japanese buyers, then prioritize payment changes only where the evidence shows a material obstacle.",
      decisionValue: "Avoids implementing local payment options before their conversion value is known.",
    },
    "japan-audit-commerce-disclosure": {
      title: "Prepare the customer-facing commerce information",
      recommendation: "Map the information Japanese customers need before purchase and have any legal or disclosure requirements confirmed by qualified counsel before launch.",
      decisionValue: "Keeps commercial validation separate from legal conclusions.",
    },
  }
  const definition = definitions[gap.id] ?? {
    title: `Validate ${gap.title.toLowerCase()}`,
    recommendation: `Test how the current ${productContext} proposition performs when this customer-path question is addressed explicitly for Japan.`,
    decisionValue: "Turns an unverified assumption into a measurable go/no-go decision.",
  }
  return { ...definition, finding: gap.observation }
}

function roadmap(companyName: string, focus: string): ManualCustomerReportRoadmapStep[] {
  return [
    {
      phase: "1 · Define",
      objective: `Choose one Japanese buyer segment and one high-value use case for ${companyName}.`,
      deliverable: "A segment hypothesis, localized value proposition, and evidence checklist.",
    },
    {
      phase: "2 · Prepare",
      objective: `Build the minimum customer journey needed to test ${focus.toLowerCase()}.`,
      deliverable: "Customer-facing Japanese copy, route changes, and a human-reviewed outreach set.",
    },
    {
      phase: "3 · Validate",
      objective: "Run a bounded market test and record objections, routing quality, replies, and qualified next steps.",
      deliverable: "A go / refine / stop decision based on observed conversations rather than assumed demand.",
    },
  ]
}

function evidenceSources(urls: string[]): CustomerView["evidenceSources"] {
  const sources = new Map<string, { label: string; url: string }>()
  for (const candidate of urls) {
    try {
      const url = new URL(candidate)
      if (!["http:", "https:"].includes(url.protocol)) continue
      url.hash = ""
      url.hostname = url.hostname.toLowerCase().replace(/^www\./, "")
      url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "")
      const normalized = `${url.hostname}${url.pathname.toLowerCase()}${url.search}`
      const path = url.pathname.toLowerCase()
      const label = path === "/"
        ? "Company homepage"
        : /pricing|plans|subscription/.test(path)
          ? "Pricing and plans"
          : /product|platform|service|solution/.test(path)
            ? "Product or service page"
            : /support|help|docs/.test(path)
              ? "Support or documentation page"
              : "Public company page"
      if (!sources.has(normalized)) sources.set(normalized, { label, url: url.toString() })
    } catch (error) {
      console.warn("[manual-work-report] skipped invalid evidence URL:", error)
    }
  }
  return [...sources.values()].slice(0, 6)
}

export function buildManualCustomerReportView(input: {
  profile: ManualCompanyProfile
  gaps: ManualReportGap[]
  messageReview: Record<string, unknown>
  projection: JapanEntryProjection | null
  reviewedPages: string[]
}): CustomerView {
  const strategy = record(input.messageReview.strategy)
  const primaryObservation = text(strategy.primaryObservation)
  const targetSegment = publicStrategyText(
    strategy.japaneseSegment,
    `A narrowly defined Japanese buyer segment whose workflow matches ${input.profile.companyName}’s existing offer`,
  )
  const opportunityAngle = publicStrategyText(
    strategy.opportunityAngle,
    `Validate a focused Japanese customer path for ${input.profile.companyName}`,
  )
  const japanGap = text(strategy.japanGap)
  const whyNow = text(strategy.whyNow)
    ?? "The public product proposition is specific enough to test, while the Japan customer journey remains unverified."
  const leadGap = input.gaps[0]
  const productSnapshot = compactPublicText(input.profile.productContext)
  const observedSignals = unique([
    primaryObservation,
    ...input.profile.observedFacts,
    ...(input.profile.commercialSignals ?? []).map((signal) => signal.sourcePhrase),
    productSnapshot,
  ].map((value) => value ? compactPublicText(value, 240) : value), 4)
  const priorities = input.gaps.slice(0, 3).map((gap) => priorityForGap(
    input.profile.companyName,
    input.profile.productContext,
    gap,
  ))
  if (priorities.length === 0) {
    priorities.push({
      title: "Validate the strongest Japan use case",
      finding: "The checked pages did not expose a decisive customer-path gap, so market fit should not be inferred from the absence of one.",
      recommendation: `Select one high-value use case for ${input.profile.companyName} and test it with a narrow Japanese buyer segment before committing to a broader launch.`,
      decisionValue: "Establishes whether there is a repeatable reason to invest further in Japan.",
    })
  }
  const focus = leadGap?.title ?? opportunityAngle

  const strategyChapters = buildManualStrategyChapters({
    profile: input.profile,
    gaps: input.gaps,
    projection: input.projection,
    targetSegment,
    opportunityAngle,
    whyNow,
  })

  return {
    title: "Japan Entry Strategy Report",
    executiveSummary: `${input.profile.companyName} presents a concrete public offer: ${sentence(productSnapshot)} The most credible next step is not to assume broad Japanese demand, but to test whether a focused customer path can make that offer understandable, trustworthy, and actionable for a defined segment.`,
    productSnapshot,
    observedSignals,
    opportunityHypothesis: {
      headline: opportunityAngle,
      targetSegment,
      rationale: leadGap
        ? `${leadGap.observation} This creates a specific validation question around ${focus.toLowerCase()}, not proof of lost sales or existing demand.`
        : japanGap ?? "The public pages provide enough product context for a focused Japan test, but they do not establish market demand or launch readiness.",
      whyNow,
      evidenceBoundary: "The hypothesis is based only on the public pages and public visibility signals reviewed for this report.",
    },
    projection: projectionView(input.projection),
    priorities,
    roadmap: roadmap(input.profile.companyName, focus),
    evidenceSources: evidenceSources(input.reviewedPages),
    recommendedDecision: `Decide whether ${targetSegment} is important enough to justify a bounded validation sprint. Advance only if the test produces company-specific evidence of comprehension, qualified interest, and a workable buying path.`,
    methodology: "Paradigm reviewed the company’s public product positioning, observable Japan customer-path signals, and available public visibility indicators. Findings describe what was and was not visible; they are not legal advice, measured analytics, or a guarantee of demand or performance.",
    strategyChapters,
    reportWordCount: countStrategyWords(strategyChapters),
  }
}

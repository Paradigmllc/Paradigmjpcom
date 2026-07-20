import { describe, expect, it } from "vitest"
import { initialInterestClose } from "./japan-entry-message-options"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"

const companyName = "Example"
const productEvidence = "subscription analytics platform for independent retailers"
const productContext = `Example provides a ${productEvidence} with inventory insights.`
const introduction = "Example’s public pages describe a retail analytics workflow centered on inventory decisions, giving this review a concrete product and customer-path starting point."
const productParagraph = `I reviewed Example and its ${productEvidence}, including the inventory insights described on the homepage.`
const audit: JapanEntryPersonalizationFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Japan market public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language"],
}
const annual: JapanEntryPersonalizationFact = {
  id: "modeled-annual-opportunity-range",
  statement: "Based on public signals and conservative planning assumptions, the model estimates a potential first-12-month Japan revenue opportunity range of approximately $24,000–$96,000.",
  source: "public-signals-v1",
  confidence: 0.3,
  anchors: ["$24,000–$96,000", "first-12-month Japan revenue opportunity", "public signals"],
}
const traffic: JapanEntryPersonalizationFact = {
  id: "modeled-global-monthly-visit-range",
  statement: "The public-signal planning model estimates a broad global monthly website-visit range of approximately 6,000–55,000; this is not measured analytics.",
  source: "public-signals-v1",
  confidence: 0.3,
  anchors: ["6,000–55,000", "global monthly website-visit range", "not measured analytics"],
}

function copyReady(diagnosis: string, close: string): string {
  const bespokeClose = close
    .replace("a one-page Japan Opportunity Snapshot", "a one-page Japan Opportunity Snapshot focused on Example’s Japanese-language customer path")
    .replace("a more detailed Japan opportunity analysis", "a more detailed Japan opportunity analysis focused on Example’s Japanese-language customer path")
  return [manualFormGreeting(companyName), introduction, productParagraph, diagnosis, bespokeClose, MANUAL_FORM_SIGNATURE].join("\n\n")
}

function review(input: {
  message: string
  facts: JapanEntryPersonalizationFact[]
  factIds: string[]
  includeEstimate: boolean
  includePrice: boolean
}) {
  return reviewPersonalizedJapanEntryMessage({
    message: input.message,
    companyName,
    productContext,
    productEvidence,
    facts: input.facts,
    factIds: input.factIds,
    purpose: "initial_interest",
    initialInterestOptions: {
      includeEstimate: input.includeEstimate,
      includePrice: input.includePrice,
      founderForwardCta: true,
    },
  })
}

describe("manual initial-interest message variants", () => {
  it("accepts the price cell only with the current fixed terms", () => {
    const options = { includeEstimate: false, includePrice: true, founderForwardCta: true }
    const message = copyReady("In a review of the public pages, I did not find a Japanese-language customer path. This is not a finding about demand or performance; it means the customer path available for a Japan entry decision remains unverified from the pages checked.", initialInterestClose(options))
    expect(review({ message, facts: [audit], factIds: [audit.id], includeEstimate: false, includePrice: true })).toMatchObject({ passed: true, score: 100 })
    expect(message).not.toMatch(/founding compan|normally \$|paid upfront|month 7|continuation/i)
  })

  it("accepts a non-assertive annual estimate with its public-signal disclaimers", () => {
    const options = { includeEstimate: true, includePrice: true, founderForwardCta: true }
    const diagnosis = `${traffic.statement} ${annual.statement} A public-page review also found that the checked pages did not show a Japanese-language customer path. These modeled estimates are not observed revenue and performance is not guaranteed.`
    const message = copyReady(diagnosis, initialInterestClose(options))
    const result = review({ message, facts: [audit, traffic, annual], factIds: [traffic.id, annual.id, audit.id], includeEstimate: true, includePrice: true })
    expect(result.issues).toEqual([])
    expect(result).toMatchObject({ passed: true, score: 100 })
  })

  it("allows a grounded USD opportunity range in the automatic no-price cell", () => {
    const options = { includeEstimate: true, includePrice: false, founderForwardCta: true }
    const diagnosis = `${traffic.statement} ${annual.statement} A public-page review also found that the checked pages did not show a Japanese-language customer path. These modeled estimates are not observed revenue and performance is not guaranteed.`
    const message = copyReady(diagnosis, initialInterestClose(options))
    const result = review({ message, facts: [audit, traffic, annual], factIds: [traffic.id, annual.id, audit.id], includeEstimate: true, includePrice: false })

    expect(message).toContain("$24,000–$96,000")
    expect(result).toMatchObject({ passed: true, score: 100, issues: [] })
  })

  it("rejects unsupported scarcity and continuation terms", () => {
    const options = { includeEstimate: false, includePrice: true, founderForwardCta: true }
    const unsafeClose = `${initialInterestClose(options)} This is for the first ten founding companies, and month 7 pricing will be shared later.`
    const message = copyReady("In a review of the public pages, I did not find a Japanese-language customer path. This is not a finding about demand or performance; it means the customer path remains unverified from the pages checked.", unsafeClose)
    const result = review({ message, facts: [audit], factIds: [audit.id], includeEstimate: false, includePrice: true })
    expect(result.passed).toBe(false)
    expect(result.issues).toContain("Unsupported scarcity, continuation pricing, or payment terms are prohibited")
  })

  it("rejects template openings, partnership pitches, and generic Japanese behavior", () => {
    const options = { includeEstimate: false, includePrice: false, founderForwardCta: true }
    const message = copyReady(
      "A public-page review did not show a Japanese-language customer path. Japanese retailers often prefer local-language tools, so I would like to explore a partnership and work together.",
      initialInterestClose(options),
    ).replace(introduction, "I noticed Example’s public pages and wanted to reach out about its retail analytics workflow.")
    const result = review({ message, facts: [audit], factIds: [audit.id], includeEstimate: false, includePrice: false })

    expect(result.passed).toBe(false)
    expect(result.issues.join(" ")).toMatch(/Template-like outreach opening/)
    expect(result.issues).toContain("Partnership or collaboration pitch language is prohibited in first-touch form copy")
    expect(result.issues).toContain("Generalized Japanese audience behavior is not grounded in a selected fact")
  })

  it("rejects an estimate draft that dumps multiple audit gaps", () => {
    const jpyAudit: JapanEntryPersonalizationFact = {
      id: "japan-audit-jpy",
      statement: "The checked public pages did not show customer-facing JPY pricing.",
      source: "Japan market public-page audit",
      confidence: 0.76,
      anchors: ["JPY pricing"],
    }
    const options = { includeEstimate: true, includePrice: false, founderForwardCta: true }
    const diagnosis = `${traffic.statement} ${annual.statement} A public-page review found no Japanese-language customer path or JPY pricing. These modeled estimates are not observed revenue and performance is not guaranteed.`
    const message = copyReady(diagnosis, initialInterestClose(options))
    const result = review({ message, facts: [audit, jpyAudit, traffic, annual], factIds: [audit.id, jpyAudit.id, traffic.id, annual.id], includeEstimate: true, includePrice: false })

    expect(result.passed).toBe(false)
    expect(result.issues).toContain("The estimate variant must use exactly one audited customer-path fact")
  })

  it("rejects a generic CTA that does not carry the selected company focus", () => {
    const options = { includeEstimate: false, includePrice: false, founderForwardCta: true }
    const message = copyReady(
      "A public-page review did not show a Japanese-language customer path. This is not a finding about demand or performance; it leaves one concrete question for a Japan entry decision.",
      initialInterestClose(options),
    ).replace(" focused on Example’s Japanese-language customer path", "")
    const result = review({ message, facts: [audit], factIds: [audit.id], includeEstimate: false, includePrice: false })

    expect(result.passed).toBe(false)
    expect(result.issues).toContain("The CTA must name the selected product or customer-path focus")
  })
})

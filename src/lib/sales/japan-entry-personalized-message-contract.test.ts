import { describe, expect, it } from "vitest"
import {
  initialInterestFactContract,
  isInitialInterestProductEvidenceSafe,
  isGroundedProductEvidence,
  selectGroundedProductEvidence,
  selectSupplementalProductEvidence,
  renderInitialInterestProductEvidence,
  shouldPreserveProductEvidenceAsRendering,
} from "./japan-entry-personalized-message-contract"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const facts: JapanEntryPersonalizationFact[] = [
  { id: "company-observed-1", statement: "Convert any screenshot or design to clean code", source: "Company site", confidence: 0.82, anchors: ["Convert any screenshot"] },
  { id: "japan-audit-language", statement: "The checked public pages did not show a Japanese-language customer path.", source: "Audit", confidence: 0.76, anchors: ["Japanese-language"] },
  { id: "japan-audit-jpy", statement: "The checked public pages did not show customer-facing JPY pricing.", source: "Audit", confidence: 0.76, anchors: ["JPY"] },
  { id: "modeled-global-monthly-visit-range", statement: "Approximately 700–8,000; not measured analytics.", source: "Model", confidence: 0.3, anchors: ["700–8,000"] },
  { id: "modeled-annual-opportunity-range", statement: "Approximately $336–$1,115.", source: "Model", confidence: 0.3, anchors: ["$336–$1,115"] },
]

describe("initial-interest evidence contract", () => {
  it("locks an estimate draft to one audit fact and the required modeled pair", () => {
    expect(initialInterestFactContract({
      facts,
      options: { includeEstimate: true, includePrice: false, founderForwardCta: true },
      angle: "problem",
    })).toEqual({
      requiredFactIds: ["modeled-global-monthly-visit-range", "modeled-annual-opportunity-range", "japan-audit-language"],
      allowedFactIds: ["modeled-global-monthly-visit-range", "modeled-annual-opportunity-range", "japan-audit-language"],
    })
  })

  it("selects an exact capability phrase and tolerates only a safe inflection in review", () => {
    const productContext = "Convert any screenshot or design to clean code | Refine colors, spacing, components, and functionality with follow-up prompts | Screenshot to Code"
    expect(selectGroundedProductEvidence({ companyName: "Screenshot to Code", productContext })).toBe("Refine colors, spacing, components, and functionality with follow-up prompts")
    expect(selectSupplementalProductEvidence({ companyName: "Screenshot to Code", productContext })).toBe("Convert any screenshot or design to clean code")
    expect(isGroundedProductEvidence(productContext, "converts any screenshot or design to clean code")).toBe(true)
    expect(isGroundedProductEvidence(productContext, "enterprise demand-generation platform")).toBe(false)
  })

  it("skips numeric and promotional SPA headings when selecting supplemental product evidence", () => {
    const productContext = "Convert any screenshot or design to clean code | Build User Interfaces 10x Faster | Developers love it | AI-powered conversion from screenshots and videos to clean, production-ready code."
    expect(selectGroundedProductEvidence({ companyName: "Screenshot to Code", productContext })).toBe("AI-powered conversion from screenshots and videos to clean, production-ready code.")
    expect(selectSupplementalProductEvidence({ companyName: "Screenshot to Code", productContext })).toBe("Convert any screenshot or design to clean code")
  })

  it("excludes claimed commercial outcomes and case-study headings from message evidence", () => {
    const productContext = [
      "Salesfire's all-in-one CRO solution can boost conversion and maximise revenue",
      "Leverage AI to transform visitor data into sales",
      "Significantly grow your marketing subscribers to reach more shoppers via email and SMS",
      "Effectively re-engage shoppers with automated emails based on their real-time activity",
      "Salesfire x Dream Big Digital:",
      "Connected solutions for smarter eCommerce operations",
      "Customer journey analytics across onsite search and email",
    ].join(" | ")

    expect(selectGroundedProductEvidence({ companyName: "Salesfire", productContext })).toBe("Customer journey analytics across onsite search and email")
    expect(selectSupplementalProductEvidence({ companyName: "Salesfire", productContext })).toBe("Connected solutions for smarter eCommerce operations")
  })

  it("excludes public conversion CTAs from the grounded capability pair", () => {
    const productContext = [
      "Salesfire's all-in-one CRO solution can boost conversion and maximise revenue. Book a consultation now.",
      "Explore customer preferences, behavioural trends, and purchase history on an individual or collective level.",
      "Book a consultation now.",
      "Customer journey analytics across onsite search and email.",
    ].join(" | ")

    const primary = selectGroundedProductEvidence({ companyName: "Salesfire", productContext })
    const supplemental = selectSupplementalProductEvidence({ companyName: "Salesfire", productContext })

    expect(primary).toBe("Explore customer preferences, behavioural trends, and purchase history on an individual or collective level.")
    expect([primary, supplemental]).not.toContain("Book a consultation now.")
    expect(isInitialInterestProductEvidenceSafe("Book a consultation now.")).toBe(false)
  })

  it("locks declarative evidence but allows grammatical rendering of marketing imperatives", () => {
    expect(shouldPreserveProductEvidenceAsRendering("AI-powered conversion from screenshots to production-ready code")).toBe(true)
    expect(shouldPreserveProductEvidenceAsRendering("Explore customer preferences and behavioural trends")).toBe(false)
    expect(shouldPreserveProductEvidenceAsRendering("Convert any screenshot or design to clean code")).toBe(false)
    expect(renderInitialInterestProductEvidence("Explore customer preferences and behavioural trends")).toBe("analysis of customer preferences and behavioural trends")
    expect(renderInitialInterestProductEvidence("Convert any screenshot or design to clean code")).toBe("conversion of any screenshot or design to clean code")
    expect(renderInitialInterestProductEvidence("AI-powered conversion from screenshots to production-ready code")).toBe("AI-powered conversion from screenshots to production-ready code")
  })

  it("extracts a clean exact capability clause instead of repeated promotional Paperform copy", () => {
    const productContext = "Paperform provides a doc-style form builder where you can create forms and surveys, take payments, automate workflows and send documents for signing, all from one easy, doc-style form builder FOR FREE. The platform also supports surveys, quizzes, tests, payment forms, scheduling forms, and a whole lot more."

    const selected = selectGroundedProductEvidence({ companyName: "Paperform", productContext })

    expect(selected).toBe("create forms and surveys, take payments, automate workflows and send documents for signing")
    expect(productContext).toContain(selected)
    expect(selected).not.toMatch(/for free|doc-style form builder/i)
  })

  it("rejects public marketing phrases that the form-copy safety gate prohibits", () => {
    const canny = "Canny | Canny's AI-powered customer feedback platform captures, analyzes, and prioritizes feedback to help you build what drives revenue. | AI-powered customer feedback platform | Use AI to turn customer conversations into revenue"
    const testimonial = "The all-in-one platform to capture, measure, and showcase customer love — testimonials, case studies, NPS, and brand monitoring in one place. | Once we added Testimonial it unlocked more conversion — the ROI was immediate."
    const heyzine = "Download, share and embed flipbooks. | Convert a PDF and customize it with page effects. | Change logo, text, icon styles, and pagination."

    expect(selectGroundedProductEvidence({ companyName: "Canny", productContext: canny, productNames: ["Canny"] })).toBe("AI-powered customer feedback platform")
    expect(selectGroundedProductEvidence({ companyName: "Testimonial", productContext: testimonial })).toContain("capture, measure, and showcase customer love")
    expect(selectGroundedProductEvidence({ companyName: "Heyzine", productContext: heyzine })).not.toMatch(/download/i)
    expect(isInitialInterestProductEvidenceSafe("Turn clicks into revenue")).toBe(false)
    expect(isInitialInterestProductEvidenceSafe("Download the attached report")).toBe(false)
    expect(isInitialInterestProductEvidenceSafe("AI-powered customer feedback platform")).toBe(true)
  })

  it("skips generic confidence language and public-page legal boilerplate", () => {
    const airboxr = "Make decisions with confidence, with advanced analytics and AI built into your existing tools. | Make confident decisions backed by data and e-commerce expertise, without changing the way you work."
    const strands = "This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply. | Accurate, Affordable and accelerated cancer monitoring technology"

    expect(selectGroundedProductEvidence({ companyName: "Airboxr", productContext: airboxr })).toBe("Make confident decisions backed by data and e-commerce expertise, without changing the way you work.")
    expect(selectGroundedProductEvidence({ companyName: "2Strands Biosciences", productContext: strands })).toBe("Accurate, Affordable and accelerated cancer monitoring technology")
    expect(isInitialInterestProductEvidenceSafe("This site is protected by reCAPTCHA")).toBe(false)
  })

  it("cleans a truncated storefront brand prefix and excludes availability boilerplate", () => {
    const productContext = [
      "ible Airvida - Wearable Air Purifier",
      "Sorry, this product is unavailable. Please choose a different combination.",
      "Scientific Testing Results of Airvida",
    ].join(" | ")

    expect(selectGroundedProductEvidence({ companyName: "Airvida", productContext })).toBe("Wearable Air Purifier")
    expect(selectGroundedProductEvidence({ companyName: "Airvida", productContext })).not.toMatch(/ible|unavailable/i)
  })

  it("uses one short safe public phrase instead of a repeated-brand context fallback", () => {
    const productContext = "Agrohub Benchmarking – | Agrohub HR360 Benchmarking – | Дослідження | AGROHUB"

    expect(selectGroundedProductEvidence({ companyName: "AGROHUB", productContext })).toBe("Agrohub Benchmarking")
  })

  it("skips evidence that repeats the company anchor and makes the copy contract impossible", () => {
    const productContext = [
      "Simple Analytics is a privacy-first analytics platform.",
      "When consent is rejected, traffic can go missing, be modeled, or lose source data.",
      "Simple Analytics works without cookies. Simple Analytics measures visits without building visitor profiles.",
    ].join(" | ")

    const selected = selectGroundedProductEvidence({ companyName: "Simple Analytics", productContext })

    expect(selected).toBe("privacy-first analytics platform.")
    expect(selected.match(/Simple Analytics/g)).toBeNull()
  })
})

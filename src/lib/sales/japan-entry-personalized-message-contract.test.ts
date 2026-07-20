import { describe, expect, it } from "vitest"
import {
  initialInterestFactContract,
  isGroundedProductEvidence,
  selectGroundedProductEvidence,
  selectSupplementalProductEvidence,
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
})

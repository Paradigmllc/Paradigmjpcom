import { describe, expect, it } from "vitest"
import { reviewManualFormBespokeStyle } from "./manual-japan-entry-copy-style"

const auditFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language"],
}

function review(body: string, openingParagraph: string, finalParagraph: string) {
  return reviewManualFormBespokeStyle({
    body,
    openingParagraph,
    finalParagraph,
    companyName: "Screenshot to Code",
    productEvidence: "Convert any screenshot or design to clean code",
    productNames: [],
    selectedFacts: [auditFact],
    includeEstimate: false,
  })
}

describe("bespoke form-copy style", () => {
  it("accepts a company-named CTA as a concrete customer-path focus", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. The audit found no Japanese-language path.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code opportunity snapshot?",
    )
    expect(issues).not.toContain("The CTA must name the selected product or customer-path focus")
  })

  it("rejects ungrounded behavior claims about a qualified Japanese audience", () => {
    const issues = review(
      "Japanese front-end developers often rely on localized onboarding when evaluating tools.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code opportunity snapshot?",
    )
    expect(issues).toContain("Generalized Japanese audience behavior is not grounded in a selected fact")
  })
})

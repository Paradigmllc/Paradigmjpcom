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
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )
    expect(issues).not.toContain("The final question must include the exact company or product anchor: Screenshot to Code")
  })

  it("rejects a generic final question even when the preceding offer sentence names the company", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. The audit found no Japanese-language path.",
      "Screenshot to Code converts screenshots to code.",
      "I can share a Screenshot to Code opportunity snapshot. Could you forward it to the right person?",
    )
    expect(issues).toContain("The final question must include the exact company or product anchor: Screenshot to Code")
  })

  it("rejects the stock founder-forward CTA even when the company anchor is present", () => {
    const finalParagraph = "I can share a detailed Japan opportunity analysis based on this public evidence for Screenshot to Code. Could you forward this to the founder or person responsible for international growth at Screenshot to Code?"
    const issues = review(
      `Screenshot to Code converts screenshots to code. ${finalParagraph}`,
      "Screenshot to Code converts screenshots to code.",
      finalParagraph,
    )

    expect(issues.join(" ")).toContain("Reusable stock routing CTA is prohibited")
  })

  it("rejects ungrounded behavior claims about a qualified Japanese audience", () => {
    const issues = review(
      "Japanese front-end developers often rely on localized onboarding when evaluating tools.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )
    expect(issues).toContain("Generalized Japanese audience behavior is not grounded in a selected fact; delete the entire behavior sentence and state only that whether the observed gap matters for this company's Japan customer path remains unverified")
  })
})

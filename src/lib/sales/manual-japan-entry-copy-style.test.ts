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
  it("rejects an unnatural pronoun bridge that is not paste-ready English", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. For it, the open question is whether to test the customer path.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )
    expect(issues).toContain("The message contains an unnatural pronoun bridge; name the documented capability or rewrite the sentence directly")
  })

  it("accepts a three-character company anchor in the final question", () => {
    const issues = reviewManualFormBespokeStyle({
      body: "Dub documents a link attribution workflow. Would you like the Dub analysis?",
      openingParagraph: "Dub documents a link attribution workflow.",
      finalParagraph: "Would you like the Dub analysis?",
      companyName: "Dub",
      productEvidence: "link attribution workflow",
      productNames: ["Dub"],
      selectedFacts: [],
      includeEstimate: false,
    })

    expect(issues).not.toContain("The final question must include the exact company or product anchor: Dub")
  })

  it("accepts a company-named CTA as a concrete customer-path focus", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. The audit found no Japanese-language path.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )
    expect(issues).not.toContain("The final question must include the exact company or product anchor: Screenshot to Code")
  })

  it("accepts a natural pronoun in the final question when the CTA paragraph names the company", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. The audit found no Japanese-language path.",
      "Screenshot to Code converts screenshots to code.",
      "I can share a Screenshot to Code opportunity snapshot. Could you forward it to the right person?",
    )
    expect(issues).not.toContain("The final CTA paragraph must include the exact company or product anchor: Screenshot to Code")
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

  it("rejects repeated company naming and repeated evidence disclaimers", () => {
    const issues = review(
      "Screenshot to Code documents screenshot conversion. Screenshot to Code has no Japanese-language path. Screenshot to Code remains unverified; it is not evidence of demand and does not establish outcomes.",
      "Screenshot to Code documents screenshot conversion.",
      "I can send a Screenshot to Code analysis. Would you like me to send it?",
    )
    expect(issues).toContain("The company name must appear no more than twice in the personalized body; use natural pronouns after the grounded introduction")
    expect(issues).toContain("The message repeats evidence disclaimers; keep one concise boundary statement and use the remaining space for decision relevance")
  })

  it("does not count a company anchor inside an ordinary plural product noun", () => {
    const issues = reviewManualFormBespokeStyle({
      body: "Testimonial captures testimonials and case studies. The checked pages did not show a Japanese-language path. I can send a Japan opportunity analysis for Testimonial. Would you like to receive it?",
      openingParagraph: "Testimonial captures testimonials and case studies.",
      finalParagraph: "I can send a Japan opportunity analysis for Testimonial. Would you like to receive it?",
      companyName: "Testimonial",
      productEvidence: "captures testimonials and case studies",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
    })

    expect(issues).not.toContain("The company name must appear no more than twice in the personalized body; use natural pronouns after the grounded introduction")
  })

  it("allows one unavoidable company mention inside the exact product evidence", () => {
    const issues = reviewManualFormBespokeStyle({
      body: "Airvida publicly documents ible Airvida wearable purification. The checked pages did not show a Japanese-language path. I can send a Japan opportunity analysis for Airvida.",
      openingParagraph: "Airvida publicly documents ible Airvida wearable purification.",
      finalParagraph: "I can send a Japan opportunity analysis for Airvida.",
      companyName: "Airvida",
      productEvidence: "ible Airvida wearable purification",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
    })

    expect(issues).not.toContain("The company name must appear no more than twice in the personalized body; use natural pronouns after the grounded introduction")
  })

  it("rejects stock decision wording and broken possessive reductions", () => {
    const issues = review(
      "Screenshot to Code documents screenshot conversion. Whether this gap matters for its Japanese-language decision remains unverified. The company’ launch path remains open.",
      "Screenshot to Code documents screenshot conversion.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("The message uses an ambiguous stock decision sentence; name the documented product and one concrete validation decision")
    expect(issues).toContain("The message contains a broken possessive created by anchor reduction")
  })

  it("rejects stacked mechanical bridges while allowing one concise bridge", () => {
    const issues = review(
      "Screenshot to Code documents screenshot conversion. I used that capability to frame the Japan review. A second workflow is documented. This helps narrow the scope.",
      "Screenshot to Code documents screenshot conversion. I used that capability to frame the Japan review.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("The message repeats mechanical evidence-to-analysis bridge language; keep only the strongest bridge")
  })
})

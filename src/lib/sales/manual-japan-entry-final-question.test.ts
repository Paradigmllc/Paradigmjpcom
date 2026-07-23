import { describe, expect, it } from "vitest"
import { normalizeManualFinalQuestion } from "./manual-japan-entry-final-question"

const message = `Hello Salesfire team,

Salesfire documents customer-preference analysis.

The checked public pages did not show a Japanese-language customer path.

Salesfire has two grounded product stories to compare before a first Japan test.

I can prepare a Japan opportunity analysis for Salesfire. Could you send this to the right person?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`

describe("manual Japan Entry final question normalization", () => {
  it("keeps the model-authored offer while limiting company mentions to the opening and question", () => {
    const result = normalizeManualFinalQuestion({
      message,
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:use_case_decision_evidence:1",
    })

    expect(result).toContain("I can prepare a Japan opportunity analysis for your company, centred on customer-preference analysis.")
    expect(result.match(/Salesfire/g)).toHaveLength(3)
    expect(result).toMatch(/Salesfire[^?]+\?\n\nBest regards,/)
  })

  it("uses stable company-specific variation keys for different routing questions", () => {
    const salesfire = normalizeManualFinalQuestion({ message, companyName: "Salesfire", productEvidenceRendering: "customer-preference analysis", founderForward: true, variationKey: "salesfire:1" })
    const screenshot = normalizeManualFinalQuestion({
      message: message.replaceAll("Salesfire", "Screenshot to Code"),
      companyName: "Screenshot to Code",
      productEvidenceRendering: "conversion from screenshots to code",
      founderForward: true,
      variationKey: "screenshot-to-code:2",
    })

    expect(salesfire.split("?").at(-2)).not.toBe(screenshot.split("?").at(-2))
  })

  it("does not create a broken which-your-company noun phrase", () => {
    const result = normalizeManualFinalQuestion({
      message: message.replace("I can prepare a Japan opportunity analysis for Salesfire.", "I can examine which Salesfire capability to prioritize."),
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:3",
    })

    expect(result).toContain("I can examine which capability to prioritize, centred on customer-preference analysis.")
    expect(result).not.toContain("which your company capability")
  })

  it("repairs a company-name substitution that leaves a broken analysis clause", () => {
    const result = normalizeManualFinalQuestion({
      message: message.replace(
        "I can prepare a Japan opportunity analysis for Salesfire.",
        "I can prepare a Japan opportunity analysis examining that Salesfire Japanese-language evaluation-path decision.",
      ),
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:broken-clause",
    })

    expect(result).toContain("examining the Japanese-language evaluation-path decision")
    expect(result).not.toContain("examining that")
    expect(result).not.toContain("your company Japanese-language")
  })

  it("does not turn customer-facing integration copy into an instruction about the recipient's company", () => {
    const result = normalizeManualFinalQuestion({
      message: message.replace(
        "Salesfire has two grounded product stories to compare before a first Japan test.",
        "Should the test lead with preference analysis or the ability to integrate Salesfire with your existing eCommerce platform?",
      ),
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:integration",
    })

    expect(result).toContain("integrate the platform with existing eCommerce platforms")
    expect(result).not.toContain("integrate your company")
    expect(result).not.toContain("your existing eCommerce platform")
  })

  it("removes a doubled integration-with construction", () => {
    const result = normalizeManualFinalQuestion({
      message: message.replace(
        "Salesfire has two grounded product stories to compare before a first Japan test.",
        "Should the test lead with preference analysis or with the integration with an existing eCommerce platform?",
      ),
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:double-integration",
    })

    expect(result).toContain("with eCommerce platform integration")
    expect(result).not.toContain("integration with an existing")
  })

  it("normalizes an article-less integration phrase from the supplemental evidence", () => {
    const result = normalizeManualFinalQuestion({
      message: message.replace(
        "Salesfire has two grounded product stories to compare before a first Japan test.",
        "Should the test lead with preference analysis or with integration with existing eCommerce platform?",
      ),
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:article-less-integration",
    })

    expect(result).toContain("with eCommerce platform integration")
    expect(result).not.toContain("integration with existing")
  })

  it("removes internal documented-capabilities terminology without changing the decision", () => {
    const result = normalizeManualFinalQuestion({
      message: message.replace(
        "Salesfire has two grounded product stories to compare before a first Japan test.",
        "Should preference analysis or platform integration lead? The pages cannot settle which of these documented capabilities to prioritize.",
      ),
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:documented-capabilities",
    })

    expect(result).toContain("cannot settle which of these to prioritize")
    expect(result).not.toContain("documented capabilities")
  })

  it("retains a concrete product focus when the model returns a generic analysis offer", () => {
    const result = normalizeManualFinalQuestion({
      message,
      companyName: "Salesfire",
      productEvidenceRendering: "analysis of customer preferences, behavioural trends, and purchase history",
      founderForward: true,
      variationKey: "salesfire:4",
    })

    expect(result).toContain("centred on analysis of customer preferences")
  })

  it("keeps the audited wording while reducing excessive Japanese-language repetition", () => {
    const repeated = message.replace(
      "Salesfire has two grounded product stories to compare before a first Japan test.",
      "A Japanese-language test compares two Japanese-language emphases for a Japanese-language decision.",
    ).replace("Japan opportunity analysis", "Japanese-language Japan opportunity analysis")
    const result = normalizeManualFinalQuestion({
      message: repeated,
      companyName: "Salesfire",
      productEvidenceRendering: "customer-preference analysis",
      founderForward: true,
      variationKey: "salesfire:5",
    })

    expect(result.match(/Japanese-language/gi)).toHaveLength(3)
    expect(result).toContain("Japan decision")
  })
})

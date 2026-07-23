import { describe, expect, it } from "vitest"
import { reviewManualFormBespokeStyle } from "./manual-japan-entry-copy-style"

const auditFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language"],
}

describe("bespoke form-copy live regressions", () => {
  it("rejects a repeated wider-localization boundary", () => {
    const body = `Salesfire describes analysis of customer preferences and behavioural trends.

The customer-behaviour analysis should be tested through a Japanese-language path before wider localization is considered.

I can send a Japan opportunity analysis for Salesfire focused on customer-behaviour analysis before wider localization is considered. Who owns the Japanese-language evaluation-path decision?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences and behavioural trends",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences and behavioural trends",
    })

    expect(issues).toContain("The same wider-localization boundary is repeated in the decision paragraph and CTA")
  })

  it("rejects necessity inferred from a missing public-page path", () => {
    const body = "Screenshot to Code converts screenshots to code. The checked public pages did not show a Japanese-language path, which makes that decision a necessary step."
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: "Screenshot to Code converts screenshots to code.",
      finalParagraph: "I can send a Japan opportunity analysis for Screenshot to Code. Who owns the Japanese-language evaluation-path decision?",
      companyName: "Screenshot to Code",
      productEvidence: "conversion of screenshots to code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "conversion of screenshots to code",
    })

    expect(issues).toContain("The message turns a public-page gap into unsupported audience behaviour, adoption, reach, or friction")
  })

  it.each([
    "The current surface leaves that evaluation unverified.",
    "The core capability—from initial interaction to code output—remains untested through that lens.",
    "The missing path leaves open what adjustments might be needed.",
    "The customer-behaviour analysis workflow currently lacks a Japanese-language path.",
  ])("rejects speculative detail added after the audited absence: %s", (speculation) => {
    const body = `Screenshot to Code documents conversion from screenshots and videos to production-ready code.

The checked public pages did not show a Japanese-language customer path. ${speculation}

I can prepare a Japan opportunity analysis for Screenshot to Code focused on conversion from screenshots and videos through a Japanese-language evaluation path.`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "conversion from screenshots and videos to production-ready code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "conversion from screenshots and videos to production-ready code",
    })

    expect(issues).toContain("The message invents an unverified product surface, process span, or required adjustment beyond the audited public-page fact")
  })

  it("rejects a Japanese-language interface not present in the audited fact or product evidence", () => {
    const body = `Screenshot to Code documents conversion from screenshots and videos to production-ready code.

The checked public pages did not show a Japanese-language customer path. The screenshot-to-code workflow should be tested through a Japanese-language interface.

I can prepare a Japan opportunity analysis for Screenshot to Code focused on conversion from screenshots and videos through a Japanese-language customer path.`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "conversion from screenshots and videos to production-ready code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "conversion from screenshots and videos to production-ready code",
    })

    expect(issues).toContain("The message invents a Japanese-language product surface not present in selected facts or product context")
  })

  it("rejects a vague workflow pronoun and invented test outcomes", () => {
    const body = `Screenshot to Code documents conversion from screenshots and videos to production-ready code.

The checked public pages did not show a Japanese-language customer path. The decision is whether to test that workflow to gauge technical fit and first impressions.

I can prepare a Japan opportunity analysis for Screenshot to Code focused on conversion from screenshots and videos through a Japanese-language customer path.`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "conversion from screenshots and videos to production-ready code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "conversion from screenshots and videos to production-ready code",
    })

    expect(issues).toContain("The message uses a reusable workflow pronoun instead of repeating the grounded company-specific subject")
    expect(issues).toContain("The message invents a test outcome not present in selected facts or product context")
  })

  it("rejects a mechanical audit bridge and bare workflow reference", () => {
    const body = `Salesfire documents customer-behaviour analysis across preferences and purchase history.

The decision is whether the workflow should be tested through a Japanese-language path. This decision is grounded in a specific finding—the checked public pages did not show a Japanese-language customer path.

I can prepare a Japan opportunity analysis for Salesfire focused on customer-behaviour analysis through a Japanese-language path.`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "customer-behaviour analysis across preferences and purchase history",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "customer-behaviour analysis across preferences and purchase history",
    })

    expect(issues).toContain("Mechanical evidence-to-analysis bridge language is prohibited; state the company-specific observation directly")
    expect(issues).toContain("The message uses a reusable workflow pronoun instead of repeating the grounded company-specific subject")
  })

  it("rejects an unsupplied Japan audience and generic analysis focus", () => {
    const body = `Screenshot to Code documents conversion from screenshots and videos to production-ready code.

The checked public pages did not show a Japanese-language customer path. The gap does not confirm how evaluators in Japan would respond, but it surfaces a practical choice about where to place the next validation step.

A Japan opportunity analysis for Screenshot to Code would define a bounded test of product evaluation and Japanese positioning around the screenshot-to-code workflow.`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "conversion from screenshots and videos to production-ready code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "conversion from screenshots and videos to production-ready code",
    })

    expect(issues.some((issue) => issue.startsWith("The message invents an unverified Japanese target segment:"))).toBe(true)
    expect(issues).toContain("Reusable analysis-process wording is prohibited; connect the product fact directly to one company-specific decision")
    expect(issues).toContain("The final CTA uses a generic product-evaluation and positioning focus instead of the grounded company-specific decision")
  })

  it("rejects urgency inferred from a missing public-page path", () => {
    const body = "Salesfire documents customer-behaviour analysis. The checked public pages did not show a Japanese-language customer path, which makes that decision immediate."
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: "Salesfire documents customer-behaviour analysis.",
      finalParagraph: "I can prepare a Japan opportunity analysis for Salesfire focused on customer-behaviour analysis through a Japanese-language path.",
      companyName: "Salesfire",
      productEvidence: "customer-behaviour analysis",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "customer-behaviour analysis",
    })

    expect(issues).toContain("The message turns a public-page gap into unsupported audience behaviour, adoption, reach, or friction")
  })

  it("requires the public-page absence to remain a standalone sentence", () => {
    const body = "Screenshot to Code documents conversion from screenshots and videos. The checked public pages did not show a Japanese-language customer path, so the screenshot-to-code workflow faces a practical decision."
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: "Screenshot to Code documents conversion from screenshots and videos.",
      finalParagraph: "I can prepare a Japan opportunity analysis for Screenshot to Code focused on conversion from screenshots and videos through a Japanese-language path.",
      companyName: "Screenshot to Code",
      productEvidence: "conversion from screenshots and videos",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "conversion from screenshots and videos",
    })

    expect(issues).toContain("The audited public-page absence must be a standalone sentence and may not be extended into a causal inference")
  })

  it("rejects an invented product experience in Japanese", () => {
    const body = "Salesfire documents customer-behaviour analysis. The checked public pages did not show a Japanese-language customer path. The immediate step is validating the core analysis experience in Japanese."
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: "Salesfire documents customer-behaviour analysis.",
      finalParagraph: "I can prepare a Japan opportunity analysis for Salesfire focused on customer-behaviour analysis through a Japanese-language path.",
      companyName: "Salesfire",
      productEvidence: "customer-behaviour analysis",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "customer-behaviour analysis",
    })

    expect(issues).toContain("The message invents a Japanese-language product surface not present in selected facts or product context")
  })
})

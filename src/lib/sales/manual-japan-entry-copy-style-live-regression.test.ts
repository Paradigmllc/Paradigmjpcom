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
  it("rejects invented audiences and benefits from the cross-company Screenshot to Code canary", () => {
    const body = `Screenshot to Code provides AI-powered conversion from screenshots and videos to clean, production-ready code.

The checked public pages did not show a Japanese-language customer path.

For a first Japan test, should you lead with the instant HTML/CSS output that lets a non-technical stakeholder see a live page immediately, or with the React/Vue component generation that fits an engineering team's existing stack?

A Japan opportunity analysis would examine the early-adopter developer workflow. Who at Screenshot to Code owns international growth?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "AI-powered conversion from screenshots and videos to clean, production-ready code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "AI-powered conversion from screenshots and videos to clean, production-ready code | supports HTML/CSS, React, Vue, Tailwind, Bootstrap, and Ionic",
    })

    expect(issues.some((issue) => issue.startsWith("Unsupported praise or product outcome is prohibited: instant"))).toBe(true)
    expect(issues.some((issue) => issue.startsWith("Unsupported product or commercial outcome is prohibited:"))).toBe(true)
    expect(issues.some((issue) => issue.startsWith("The message invents a product audience not present in public product evidence:"))).toBe(true)
    expect(issues).toContain("The company-specific decision must use the primary product subject, not only split a supplemental feature list")
  })

  it("rejects the evidence-boundary filler sentence from the live Salesfire canary", () => {
    const body = `Salesfire provides analysis of customer preferences, behavioural trends, and purchase history.

The checked public pages did not show a Japanese-language customer path.

The first Japan test should distinguish preference analysis from platform integration.

We would rely solely on the public-page audit to define the evidence boundary.

I can prepare a Japan opportunity analysis for Salesfire. Would its founder be the right recipient?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences, behavioural trends, and purchase history | platform integration",
    })

    expect(issues).toContain("Reusable analysis-process wording is prohibited; connect the product fact directly to one company-specific decision")
  })

  it("accepts a grounded individual-versus-collective Salesfire decision", () => {
    const body = `Salesfire presents analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level.

The checked public pages did not show a Japanese-language customer path.

Should a first Japanese-language test lead with individual-level preference analysis or collective behavioural trends? The checked pages cannot determine which emphasis to prioritize.

I can prepare a Japan opportunity analysis comparing those two Salesfire analysis levels. Is Salesfire's founder the right recipient?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level | platform integration",
    })

    expect(issues).not.toContain("The company-specific decision must use the primary product subject, not only split a supplemental feature list")
  })

  it("rejects internal evaluation-path jargon and an awkward either-or capability CTA", () => {
    const body = `Salesfire presents analysis of customer preferences and behavioural trends.

The checked public pages did not show a Japanese-language customer path.

Should the first test lead with preference analysis or platform integration?

I can prepare a Japan opportunity analysis examining the specific Japanese-language evaluation-path decision for your preference-analysis or platform-integration capability. Is Salesfire's founder the right recipient?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences and behavioural trends",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences and behavioural trends | platform integration",
    })

    expect(issues).toContain("The final CTA uses a generic market-entry label instead of naming the company-specific validation")
    expect(issues).toContain("The final CTA uses an awkward either-or capability label instead of natural product names")
  })

  it("requires one product-specific term in a company-named CTA without demanding the full opening", () => {
    const body = `Salesfire provides analysis of customer preferences, behavioural trends, and purchase history.

The checked public pages did not show a Japanese-language customer path.

The first test should distinguish preference analysis from platform integration, without treating that choice as evidence of demand.

I can prepare a Japan opportunity analysis comparing those entry angles. Would Salesfire's founder or international-growth lead be the right person for me to send it to?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences, behavioural trends, and purchase history | platform integration",
    })

    expect(issues).toContain("The final CTA does not repeat enough of the grounded product subject to be company-specific")
  })

  it("rejects the formulaic Salesfire canary even when every fact is grounded", () => {
    const body = `Salesfire publicly describes its offering around “analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level.”

The checked public pages did not show a Japanese-language customer path.

A practical next step is deciding whether the customer-behaviour analysis should first be tested through a Japanese-language path before wider localization is considered.

I can prepare a Japan opportunity analysis for Salesfire that defines a bounded test for the customer-behaviour analysis and informs the Japanese-language evaluation-path decision. Could the founder or international-growth lead weigh in on that evaluation-path decision for the customer-behaviour analysis?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level.",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level.",
    })

    expect(issues).toContain("The opening uses reusable evidence-meta wording instead of describing the product directly")
    expect(issues).toContain("The decision paragraph uses reusable transition scaffolding instead of company-specific reasoning")
    expect(issues).toContain("The message repeats the same product phrase too often: customer behaviour")
    expect(issues).toContain("The message uses validation-program jargon instead of plain company-specific language")
  })

  it("rejects deterministic Screenshot to Code scaffolding as a final message", () => {
    const body = `Screenshot to Code publicly describes its offering with the phrase “AI-powered conversion from screenshots and videos to clean, production-ready code.”

The checked public pages did not show a Japanese-language customer path.

The decision is whether a bounded Japanese-language customer-path test should cover the conversion from screenshots and videos.

A Japan opportunity analysis for Screenshot to Code can set out a bounded evaluation of the conversion from screenshots and videos through a Japanese-language customer path. Should I address the evaluation-path decision brief to the person responsible for the conversion from screenshots and videos?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "AI-powered conversion from screenshots and videos to clean, production-ready code.",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "AI-powered conversion from screenshots and videos to clean, production-ready code.",
    })

    expect(issues).toContain("The decision paragraph uses reusable transition scaffolding instead of company-specific reasoning")
    expect(issues).toContain("The message repeats bounded-validation jargon instead of using natural company-specific language")
  })

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

  it("rejects the production Salesfire draft that passed by collapsing the decision into a generic CTA", () => {
    const body = `Salesfire publicly describes its offering with the phrase “analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level.”

The checked public pages did not show a Japanese-language customer path.

I can send a Japan opportunity analysis for Salesfire, focused on a bounded test of whether to validate a Japanese-language path for the customer-behaviour analysis before wider localization. Would the founder or international-growth owner be the right person to review the evaluation-path decision?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences, behavioural trends, and purchase history on an individual or collective level",
    })

    expect(issues).toContain("The message must separate the audited finding and the company-specific product decision into distinct paragraphs")
    expect(issues).toContain("The analysis focus uses a generic validate-the-path construction instead of a company-specific test")
    expect(issues).toContain("The final routing question must name the company or grounded product subject")
  })

  it("rejects the malformed company substitution found in live generated copy", () => {
    const body = `Screenshot to Code documents conversion from screenshots and videos to code.

The checked public pages did not show a Japanese-language customer path.

The decision is whether to lead with screenshot conversion or video conversion.

I can prepare a Japan opportunity analysis examining that your company Japanese-language evaluation-path decision.`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "conversion from screenshots and videos to code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
    })

    expect(issues).toContain("The analysis focus contains an ungrammatical verb form and is not copy-ready English")
  })

  it("does not misclassify a capability-priority decision as an invented product claim", () => {
    const body = `Salesfire documents analysis of customer preferences, behavioural trends, and purchase history.

The checked public pages did not show a Japanese-language customer path.

Should the first test lead with individual preference analysis or eCommerce integration? The checked pages cannot settle which of these documented capabilities to lead with.

I can prepare a Japan opportunity analysis centred on customer-preference analysis. Is Salesfire's founder the right recipient?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "Analysis of customer preferences, behavioural trends, and purchase history | Integrate with an existing eCommerce platform",
    })

    expect(issues.some((issue) => issue.startsWith("An additional product claim is not grounded in the supplied public product context:"))).toBe(false)
  })

  it("rejects documented-capabilities filler in place of the actual Salesfire alternatives", () => {
    const body = `Salesfire documents preference analysis and eCommerce platform integration.

The checked public pages did not show a Japanese-language customer path.

Should preference analysis or platform integration lead? The public-page audit cannot settle which of these documented capabilities to prioritize.

I can prepare a Japan opportunity analysis comparing preference analysis with platform integration. Is Salesfire's founder the right recipient?`
    const issues = reviewManualFormBespokeStyle({
      body, openingParagraph: body.split(/\n\s*\n/)[0] ?? "", finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire", productEvidence: "preference analysis and eCommerce platform integration", productNames: [],
      selectedFacts: [auditFact], includeEstimate: false, productContext: "preference analysis and eCommerce platform integration",
    })

    expect(issues).toContain("The message uses a generic product-capability reference instead of naming the grounded workflow")
  })
})

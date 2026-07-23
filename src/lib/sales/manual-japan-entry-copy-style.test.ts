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

  it("rejects the live For it, that leaves regression", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. For it, that leaves one decision open: whether to test the customer path.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("The message contains an unnatural pronoun bridge; name the documented capability or rewrite the sentence directly")
  })

  it("rejects repeated exact product evidence and mechanical exact-evidence CTA copy", () => {
    const productEvidence = "Wearable Air Purifier"
    const finalParagraph = "I can prepare a Japan opportunity analysis for Airvida around the exact Japanese-language evidence. Would you like to receive it?"
    const issues = reviewManualFormBespokeStyle({
      body: `Airvida describes its product as ${productEvidence}. The ${productEvidence} review concerns the customer path. A brief for the ${productEvidence} would separate facts from assumptions. ${finalParagraph}`,
      openingParagraph: `Airvida describes its product as ${productEvidence}.`,
      finalParagraph,
      companyName: "Airvida",
      productEvidence,
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
    })

    expect(issues).toContain("The exact product-evidence phrase must appear once in the opening and must not be repeated later")
    expect(issues).toContain("Mechanical exact-evidence CTA language is prohibited; offer a concrete decision brief in natural language")
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

  it("rejects inferred product outcomes appended to the grounded opening", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code, giving teams a direct path to deployable output.",
      "Screenshot to Code converts screenshots to code, giving teams a direct path to deployable output.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )
    expect(issues).toContain("The opening adds an inferred user outcome after the grounded product evidence")
  })

  it("rejects gap-to-adoption and Japan-audience inferences that are not public facts", () => {
    const issues = review(
      "This means adoption depends on typical discovery behavior of technical audiences in Japan and could strengthen its reach.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )
    expect(issues).toContain("The message turns a public-page gap into unsupported audience behaviour, adoption, reach, or friction")
  })

  it("rejects passive Japan-audience behaviour inferred by the live DeepSeek smoke", () => {
    const issues = review(
      "The checked pages did not show a Japanese-language path. That leaves open whether a Japanese evaluation path would change how the product is discovered and assessed by teams in Japan.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("The message turns a public-page gap into unsupported audience behaviour, adoption, reach, or friction")
  })

  it("rejects Japanese-speaking audience behavior inferred by the live DeepSeek smoke", () => {
    const issues = review(
      "The checked pages did not show a Japanese-language path. The open question is whether the current documentation would let a Japanese-speaking developer evaluate output quality before adopting the tool.",
      "Screenshot to Code converts screenshots to code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("The message turns a public-page gap into unsupported audience behaviour, adoption, reach, or friction")
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

  it("rejects an audited customer-path phrase repeated like a template", () => {
    const issues = review(
      "Screenshot to Code documents screenshot conversion. The Japanese-language path was not shown. The Japanese-language decision is open. A Japanese-language analysis can frame the Japanese-language test.",
      "Screenshot to Code documents screenshot conversion.",
      "A Japan analysis for Screenshot to Code can frame the Japanese-language evaluation-path decision. Would you like it?",
    )

    expect(issues).toContain("The audited customer-path anchor is repeated too often; use 'Japanese-language' no more than three times and vary the reasoning naturally")
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
      "Screenshot to Code documents screenshot conversion. Whether this gap matters for its Japanese-language evaluation-path decision remains unverified. The company’ launch path remains open.",
      "Screenshot to Code documents screenshot conversion.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("The message uses an ambiguous stock decision sentence; name the documented product and one concrete validation decision")
    expect(issues).toContain("The message contains a broken possessive created by anchor reduction")
  })

  it("rejects even one mechanical evidence-to-analysis bridge", () => {
    const issues = review(
      "Screenshot to Code documents screenshot conversion. I used that capability to frame the Japan review. A second workflow is documented. This helps narrow the scope.",
      "Screenshot to Code documents screenshot conversion. I used that capability to frame the Japan review.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("Mechanical evidence-to-analysis bridge language is prohibited; state the company-specific observation directly")
  })

  it("rejects unsupported praise added to grounded product evidence", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code. The workflow creates a seamless experience with a broad technical surface.",
      "Screenshot to Code converts screenshots to code. The workflow creates a seamless experience with a broad technical surface.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues.join(" ")).toContain("Unsupported praise or product outcome is prohibited")
  })

  it("rejects an unsupported purchase outcome and repeated product phrase", () => {
    const issues = reviewManualFormBespokeStyle({
      body: "Salesfire uses onsite search and product recommendations to guide shoppers to purchase.",
      openingParagraph: "Salesfire uses onsite search and product recommendations before repeating onsite search and product recommendations.",
      finalParagraph: "May I send the Salesfire Japanese-language evaluation-path analysis?",
      companyName: "Salesfire",
      productEvidence: "onsite search and product recommendations",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
    })

    expect(issues.join(" ")).toContain("Unsupported product or commercial outcome is prohibited")
    expect(issues.join(" ")).toContain("opening repeats a product-evidence phrase")
  })

  it("rejects unsupported workflow outcomes and invented missing surfaces", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code, removing manual translation steps. The checked pages lacked Japanese documentation or localized onboarding flow.",
      "Screenshot to Code converts screenshots to code, removing manual translation steps.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues.join(" ")).toContain("Unsupported product or commercial outcome is prohibited")
    expect(issues.join(" ")).toContain("expands a verified page gap into an unsupported missing surface")
  })

  it("rejects the unsupported outcome and missing-surface wording from the live DeepSeek smoke", () => {
    const issues = review(
      "Screenshot to Code converts screenshots to code, letting developers skip manual translation of design to front-end code. The proposal refers to a verified onboarding or documentation gap and lets developers test the workflow in their native context.",
      "Screenshot to Code converts screenshots to code, letting developers skip manual translation of design to front-end code.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues.join(" ")).toContain("Unsupported product or commercial outcome is prohibited")
    expect(issues.join(" ")).toContain("expands a verified page gap into an unsupported missing surface")
  })

  it("rejects evaluator behavior, English-only surfaces, and conversion impact from the second live smoke", () => {
    const body = `Screenshot to Code offers conversion from screenshots into code. Its workflow turns a visual mockup into code in one step, which makes rapid prototyping unusually direct.

The public pages show no Japanese-language customer path. A non-English evaluator can still test the engine, but the surrounding onboarding, documentation, and UI remain English-only. That gap leaves open whether a lightweight Japanese interface layer would materially lift trial completion and paid conversion.

I can send the Screenshot to Code Japan opportunity analysis. Who owns the Japanese-language evaluation-path decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues.join(" ")).toContain("Unsupported product or commercial outcome is prohibited")
    expect(issues.join(" ")).toContain("unsupported audience behaviour")
    expect(issues.join(" ")).toContain("invents specific English-only onboarding")
  })

  it("rejects an invented Japanese developer segment and claimed adoption effect", () => {
    const body = `Screenshot to Code converts screenshots to code.

The public pages show no Japanese-language path. The decision is whether to invest in an evaluation experience for Japanese developers.

I can send a Screenshot to Code Japan opportunity analysis focused on a test that would strengthen adoption and readiness. Who owns the Japanese-language evaluation-path decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues.join(" ")).toContain("invents an unverified Japanese target segment")
    expect(issues.join(" ")).toContain("Unsupported product or commercial outcome is prohibited")
  })

  it("rejects the ungrounded product expansion and malformed analysis focus from the latest smoke", () => {
    const body = `Screenshot to Code provides AI-powered conversion from screenshots and videos to clean, production-ready code.

The workflow takes a visual input and generates framework-specific output ready for a developer environment. The public pages did not show a Japanese-language customer path.

The decision is whether the product explanation should be tested through a Japanese-language path.

I can send a Screenshot to Code Japan opportunity analysis focused on assess whether the path should be tested. Who owns the evaluation-path decision?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: "AI-powered conversion from screenshots and videos to clean, production-ready code",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "AI-powered conversion from screenshots and videos to clean, production-ready code | Supports HTML/CSS, React, Vue, Tailwind, Bootstrap, and Ionic",
    })

    expect(issues).toContain("An additional product claim is not grounded in the supplied public product context")
    expect(issues).toContain("The analysis focus contains an ungrammatical verb form and is not copy-ready English")
  })

  it("rejects Japanese-lens inference and an analysis described before the CTA", () => {
    const body = `Screenshot to Code converts screenshots to code.

The pages did not show a Japanese-language path, which means the capability has not been tested through a Japanese lens.

The analysis would center on how the current interface performs when the user's context is Japanese.

I can send a Screenshot to Code Japan opportunity analysis. Who owns the evaluation-path decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues.join(" ")).toContain("unsupported audience behaviour")
    expect(issues).toContain("The analysis is offered or described before the final CTA; state only the product-specific decision in earlier paragraphs")
  })

  it("rejects live copied CTA residue, malformed capitalization, and a generic user scenario", () => {
    const issues = review(
      "A retailer using Screenshot to Code can Explore customer preferences. They may also Book a consultation now.",
      "A retailer using Screenshot to Code can Explore customer preferences. They may also Book a consultation now.",
      "May I send the Screenshot to Code Japanese-language customer-path opportunity snapshot?",
    )

    expect(issues).toContain("Public-site conversion CTA text is prohibited in the personalized message")
    expect(issues).toContain("A copied marketing imperative is embedded with invalid English capitalization")
    expect(issues).toContain("The opening invents a generic user scenario instead of stating the company's documented capability")
  })

  it("rejects the live reusable reasoning chain", () => {
    const body = `Screenshot to Code documents a screenshot-to-code workflow.

The next concrete step is not a launch assumption but a bounded test.

I can prepare a Japan opportunity analysis that separates the verified finding from the decisions still to test.

The Japan opportunity analysis I can provide for Screenshot to Code would evaluate the documented product scope. Who owns the Japanese-language evaluation-path decision?`
    const issues = review(body, "Screenshot to Code documents a screenshot-to-code workflow.", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues).toContain("Reusable analysis-process wording is prohibited; connect the product fact directly to one company-specific decision")
  })

  it("rejects repeated analysis offers and evidence reused in the CTA", () => {
    const evidence = "conversion from screenshots and videos to production-ready code"
    const body = `Screenshot to Code provides ${evidence}.

The checked public pages did not show a Japanese-language customer path. The analysis would scope that decision and marks every Japan assumption as unconfirmed.

A Japan opportunity analysis for the product would define the evaluation path.

I can send a Japan opportunity analysis for Screenshot to Code using ${evidence}. Who owns the Japanese-language evaluation-path decision?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Screenshot to Code",
      productEvidence: evidence,
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
    })

    expect(issues).toContain("The analysis offer is repeated across paragraphs; make it once in the final CTA")
    expect(issues).toContain("The exact product-evidence phrase must appear once in the opening and must not be repeated later")
    expect(issues).toContain("Reusable analysis-process wording is prohibited; connect the product fact directly to one company-specific decision")
  })

  it("rejects invented untested surfaces, vague audiences, and generic product-scope filler", () => {
    const body = `Screenshot to Code provides AI-powered conversion from screenshots and videos to clean, production-ready code.

The checked public pages did not show a Japanese-language customer path, so the product explanation and onboarding experience remain untested for that audience. This leaves one concrete decision around the current product scope and the product's documented capability.

I can provide Screenshot to Code with a Japan opportunity analysis focused on a Japanese-language evaluation-path test. Who owns that decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues).toContain("The message invents an untested product, onboarding, documentation, UI, checkout, or support surface")
    expect(issues).toContain("The message uses an undefined audience reference instead of naming the verified product path")
    expect(issues).toContain("Reusable analysis-process wording is prohibited; connect the product fact directly to one company-specific decision")
    expect(issues).toContain("The message uses a generic product-capability reference instead of naming the grounded workflow")
  })

  it("rejects a generic market-readiness CTA from the live smoke", () => {
    const body = `Screenshot to Code converts screenshots and videos to code.

The checked pages did not show a Japanese-language path. The screenshot-to-code workflow has one open localization decision.

A Japan opportunity analysis for Screenshot to Code would frame the current market-readiness question as a testable entry decision. Who owns the Japanese-language evaluation-path decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues).toContain("The final CTA uses a generic market-entry label instead of naming the company-specific validation")
  })

  it("rejects a contrived hyphen-chained workflow label from the Salesfire smoke", () => {
    const body = `Salesfire integrates with existing eCommerce platforms to explore customer preferences and purchase history.

The integrate-and-explore workflow should be tested through a Japanese-language evaluation path.

I can send a Japan opportunity analysis for Salesfire. Who owns the Japanese-language evaluation-path decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues).toContain("The message invents a hyphen-chained workflow label instead of using a natural grounded noun phrase")
  })

  it("allows grounded customer-behaviour analysis before the sender CTA", () => {
    const body = `Salesfire documents customer-behaviour analysis across preferences and purchase history.

The customer-behaviour analysis path should be tested through a Japanese-language evaluation route.

I can send a Japan opportunity analysis for Salesfire. Who owns the Japanese-language evaluation-path decision?`
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

    expect(issues).not.toContain("The analysis is offered or described before the final CTA; state only the product-specific decision in earlier paragraphs")
  })

  it("rejects a vague workflow pronoun in the Salesfire CTA", () => {
    const body = `Salesfire documents customer-behaviour analysis across preferences and purchase history.

The customer-behaviour analysis should be tested through a Japanese-language evaluation route.

A Japan opportunity analysis would define a bounded evaluation test for that workflow. Who owns Salesfire's Japanese-language evaluation-path decision?`
    const issues = review(body, body.split(/\n\s*\n/)[0] ?? "", body.split(/\n\s*\n/).at(-1) ?? "")

    expect(issues).toContain("The final CTA refers to a generic workflow instead of naming the grounded product subject")
  })

  it("requires the Salesfire CTA to retain its grounded product subject", () => {
    const body = `Salesfire describes analysis of customer preferences, behavioural trends, and purchase history.

The customer-behaviour analysis should be tested through a Japanese-language evaluation route.

I can send a Japan opportunity analysis for Salesfire, focused on product evaluation and Japanese positioning. Who owns the Japanese-language evaluation-path decision?`
    const issues = reviewManualFormBespokeStyle({
      body,
      openingParagraph: body.split(/\n\s*\n/)[0] ?? "",
      finalParagraph: body.split(/\n\s*\n/).at(-1) ?? "",
      companyName: "Salesfire",
      productEvidence: "analysis of customer preferences, behavioural trends, and purchase history",
      productNames: [],
      selectedFacts: [auditFact],
      includeEstimate: false,
      productContext: "analysis of customer preferences, behavioural trends, and purchase history",
    })

    expect(issues).toContain("The final CTA does not repeat enough of the grounded product subject to be company-specific")
  })

})

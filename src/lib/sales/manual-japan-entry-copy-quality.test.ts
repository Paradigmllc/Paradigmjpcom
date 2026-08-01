import { describe, expect, it } from "vitest"
import { buildManualCopyPlan } from "./manual-japan-entry-copy-plan"
import { reviewManualMessagePersonalization } from "./manual-japan-entry-copy-quality"

const auditFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language"],
}

function review(message: string, overrides: Partial<Parameters<typeof reviewManualMessagePersonalization>[0]> = {}) {
  return reviewManualMessagePersonalization({
    message,
    companyName: "Screenshot to Code",
    productNames: ["Screenshot to Code"],
    productEvidenceRendering: "turn screenshots into React code",
    selectedFacts: [auditFact],
    architecture: "capability_gap_validation",
    personalizationAnchors: ["turn screenshots into React code", "Japanese-language"],
    solutionFocus: "validate the Japanese evaluation path for the documented conversion workflow",
    questionDecisionAnchor: "Japanese-language evaluation-path decision",
    maxPriorSimilarity: 0.12,
    includeEstimate: false,
    ...overrides,
  })
}

describe("manual message personalization quality", () => {
  it("accepts grounded copy whose reasoning and CTA are specific to the company", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code documents a workflow to “turn screenshots into React code,” giving the review a concrete product use case rather than a generic software category.

The public-page audit did not show a Japanese-language evaluation path. The launch decision is therefore whether that existing conversion workflow needs a localized explanation and trial path before broader acquisition is tested; demand and commercial impact remain unverified.

A Japan opportunity analysis for Screenshot to Code would keep that decision narrow. The analysis can map the Japanese-language gap against a bounded validation plan. Who owns the Japanese-language evaluation-path decision?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(true)
    expect(result.score).toBe(100)
    expect(result.reusableTemplateRisk).toBe(false)
  })

  it("rejects hidden responsive text and foreign UI residue from crawled pages", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code can “turn screenshots into React code.” Teks ini akan tersembunyi ketika ukuran layar berubah.

The public-page audit did not show a Japanese-language customer path, leaving a validation decision open.

A Japan opportunity analysis for Screenshot to Code can test the Japanese-language path. Who owns this decision?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.dimensions.languageIntegrity).toBe(0)
    expect(result.issues.join(" ")).toContain("hidden-page text")
  })

  it("rejects reusable stock body and CTA language even when names are filled", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code documents “turn screenshots into React code.”

The checked public pages did not show a Japanese-language customer path. The next decision is not a full launch.

I can send a short Japan opportunity analysis for Screenshot to Code focused on the Japanese-language question. Would you like me to send it?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.reusableTemplateRisk).toBe(true)
    expect(result.issues).toContain("The body contains a reusable stock sentence instead of company-specific reasoning")
  })

  it("rejects the repeated evidence-assessment bridge found by the live company matrix", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code documents a workflow to “turn screenshots into React code,” which gives the review a concrete product path.

The checked public pages did not show a Japanese-language customer path, so your team can assess that step with evidence. Demand and commercial impact remain unverified.

A Japan opportunity analysis can test the Japanese-language evaluation-path decision for the documented conversion workflow. Who owns that decision at Screenshot to Code?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.reusableTemplateRisk).toBe(true)
    expect(result.issues).toContain("The body contains a reusable stock sentence instead of company-specific reasoning")
  })

  it("rejects reusable evaluator-surface reasoning and awkward headline capitalization", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code supports a workflow where Customers choose a conversion mode.

The checked public pages did not show a Japanese-language customer path. The surfaces an evaluator would use to test the product in Japanese are not present. This leaves one concrete decision open.

A Japan opportunity analysis for Screenshot to Code can test the Japanese-language evaluation-path decision. Who owns that decision?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.reusableTemplateRisk).toBe(true)
    expect(result.dimensions.languageIntegrity).toBe(0)
  })

  it("rejects the repeated decision and output bridges found by the live matrix", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code documents “turn screenshots into React code.”

The checked public pages did not show a Japanese-language path. That leaves one concrete question open. The output would be a clear basis for the evaluation-path decision.

A Japan opportunity analysis for Screenshot to Code can test the Japanese-language path. Who owns that evaluation-path decision?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.reusableTemplateRisk).toBe(true)
    expect(result.passed).toBe(false)
  })

  it("rejects the live Salesfire CTA residue and repeated analysis scaffolding", () => {
    const result = review(`Hello Screenshot to Code team,

A retailer using Screenshot to Code can Explore customer preferences. They may also Book a consultation now.

The checked public pages did not show a Japanese-language customer path. The next concrete step is not a launch assumption but a bounded test.

I can prepare a Japan opportunity analysis that separates the verified finding from the decisions still to test.

The Japan opportunity analysis I can provide for Screenshot to Code would evaluate the documented product scope through a bounded Japan validation around product evaluation. Who owns the Japanese-language evaluation-path decision?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.dimensions.languageIntegrity).toBe(0)
    expect(result.reusableTemplateRisk).toBe(true)
  })

  it("rejects the model-authored verified-scope filler that previously scored 92", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code provides “turn screenshots into React code” as a documented product workflow.

The checked public pages did not show a Japanese-language path. The analysis would scope that decision.

A Japan opportunity analysis for the product would define an evaluation route. The analysis stays within the verified product scope and marks every Japan assumption as unconfirmed.

I can send a Japan opportunity analysis for Screenshot to Code focused on the Japanese-language decision. Who owns the evaluation-path decision?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.reusableTemplateRisk).toBe(true)
    expect(result.dimensions.narrativeOriginality).toBeLessThan(23)
  })

  it("rejects a generic founder-forward question and inferred Japanese user behaviour", () => {
    const result = review(`Hello Screenshot to Code team,

Screenshot to Code provides “turn screenshots into React code” as a documented product workflow.

The public-page audit did not show a Japanese-language evaluation path. The question is whether that gap shapes how Japanese users assess the tool, although commercial impact remains unverified.

A Japan opportunity analysis for Screenshot to Code would frame the Japanese-language positioning question. Could you forward this to the founder or the person responsible for international growth?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`)

    expect(result.passed).toBe(false)
    expect(result.coverage.routingCta).toBe(true)
    expect(result.reusableTemplateRisk).toBe(true)
  })
})

describe("manual company copy plan", () => {
  it("uses stable company, sector, country, and angle inputs to choose the architecture", () => {
    const input = {
      companyName: "Screenshot to Code",
      countryCode: "US",
      businessModel: "saas" as const,
      playbook: "saas_ai_devtools" as const,
      angle: "problem" as const,
      hasModeledOpportunity: false,
    }
    expect(buildManualCopyPlan(input)).toEqual(buildManualCopyPlan(input))
    expect(buildManualCopyPlan(input).requiredMoves).toHaveLength(5)
    expect(buildManualCopyPlan(input).solutionFocus).toContain("evaluation-path test")
  })

  it("does not select the opportunity architecture without grounded modeled evidence", () => {
    const result = buildManualCopyPlan({
      companyName: "Maison Exemple",
      countryCode: "FR",
      businessModel: "ecommerce",
      playbook: "premium_hobby_ecommerce",
      angle: "problem",
      hasModeledOpportunity: false,
    })
    expect(result.architecture).not.toBe("product_signal_opportunity")
    expect(result.countryTone).toContain("business-formal")
  })
})

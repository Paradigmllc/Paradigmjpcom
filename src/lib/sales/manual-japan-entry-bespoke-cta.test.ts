import { describe, expect, it } from "vitest"
import { finalizeManualBespokeCta } from "./manual-japan-entry-bespoke-cta"

describe("finalizeManualBespokeCta", () => {
  it("keeps the model-authored body but replaces a generic close with a company decision CTA", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "right_person",
        message: `Hello Example team,\n\nExample documents a fraud-review workflow, giving teams a direct route to adoption.\n\nThis means typical evaluation behaviour of technical audiences in Japan could strengthen its reach.\n\nPlease let me know if this is interesting.\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: true,
    })

    expect(result.message).toContain("Example documents a fraud-review workflow.")
    expect(result.message).not.toContain("giving teams")
    expect(result.message).not.toContain("technical audiences")
    expect(result.message).not.toContain("Please let me know")
    expect(result.message).toContain("evaluation-path decision")
    expect(result.message.split("\n\n").slice(1, -1).join(" ").match(/\bExample\b/g)).toHaveLength(2)
    expect(result.cta_type).toBe("founder_forward")
  })

  it("removes passive audience-behaviour inference before finalizing the message", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path. That leaves open whether localization would change how the product is discovered and assessed by teams in Japan.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
    })

    expect(result.message).not.toContain("discovered and assessed by teams in Japan")
    expect(result.message).toContain("evaluation-path decision")
  })

  it("removes Japanese-speaking developer behavior before finalizing the message", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path. The open question is whether a Japanese-speaking developer would evaluate the workflow before adopting it.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
    })

    expect(result.message).not.toContain("Japanese-speaking developer")
    expect(result.message).toContain("evaluation-path decision")
  })

  it("keeps the audited path anchor to three uses or fewer in fallback copy", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe Japanese-language customer path was not shown. The Japanese-language decision is open.\n\nA Japanese-language review could frame a Japanese-language test.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
    })

    expect(result.message.match(/Japanese-language/gi)?.length ?? 0).toBeLessThanOrEqual(3)
  })

  it("moves a merged audit gap out of the product opening", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow. The Japanese-language customer path was not shown.\n\nThe open decision is whether to validate the current onboarding route.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
    })
    const opening = result.message.split(/\n\s*\n/)[1] ?? ""

    expect(opening).toBe("Example documents an API-first fraud review workflow.")
    expect(result.message).toContain("The checked public pages did not show a Japanese-language customer path.")
  })

  it("keeps product evidence in the opening without repeating it in the fallback CTA", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
      productEvidenceRendering: "API-first fraud review workflow",
    })

    expect(result.message.split(/\n\s*\n/)[1]).toContain("API-first fraud review workflow")
    expect(result.message.split(/\n\s*\n/).at(-2)).not.toContain("API-first fraud review workflow")
    expect(result.message.split(/\n\s*\n/).at(-2)).toContain("evaluation-path decision")
  })

  it("restores the exact grounded opening when a mixed Japan sentence is removed", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample connects an API workflow to the Japanese-language gap, which was not shown on the checked pages.\n\nThe open decision is whether to validate onboarding.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
      productEvidenceRendering: "API-first fraud review workflow",
    })

    expect(result.message.split(/\n\s*\n/)[1]).toBe("On its public pages, Example describes API-first fraud review workflow.")
  })

  it("removes the later of two near-duplicate model sentences", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow for marketplace teams. The API-first fraud review workflow is documented for marketplace teams.\n\nThe checked pages did not show a Japanese-language path.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
      productEvidenceRendering: "API-first fraud review workflow for marketplace teams",
    })

    expect(result.message.match(/fraud review workflow is documented/gi)).toBeNull()
    expect(result.message).toContain("API-first fraud review workflow for marketplace teams")
  })

  it("removes speculative product-market-fit sentences caught by the safety gate", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path. A localized route could help the product reach more users.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded validation of product evaluation and onboarding",
      founderForwardCta: false,
      productEvidenceRendering: "API-first fraud review workflow",
    })

    expect(result.message).not.toContain("could help the product reach")
  })

  it("replaces generic finding aliases with one exact audited path reference", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded test of product evaluation using the observed customer-path finding",
      founderForwardCta: false,
      productEvidenceRendering: "API-first fraud review workflow",
    })
    const finalParagraph = result.message.split(/\n\s*\n/).at(-2) ?? ""

    expect(finalParagraph).toContain("through a Japanese-language customer path")
    expect(finalParagraph).not.toContain("observed customer-path finding")
  })

  it("normalizes a clause-shaped model focus before composing the CTA", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "founder_forward",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path.\n\nI can send an analysis. Who owns it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "Whether the fraud-review workflow should be tested before wider localization.",
      founderForwardCta: true,
      productEvidenceRendering: "API-first fraud review workflow",
    })
    const finalParagraph = result.message.split(/\n\s*\n/).at(-2) ?? ""

    expect(finalParagraph).toContain("a bounded test of the fraud-review workflow before wider localization")
    expect(finalParagraph).not.toMatch(/into Whether|\.\./)
  })

  it("removes a redundant whether-to-test wrapper from the model focus", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "founder_forward",
        message: `Hello Salesfire team,\n\nSalesfire describes customer-behaviour analysis.\n\nThe checked public pages did not show a Japanese-language path.\n\nI can send an analysis. Who owns it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Salesfire",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "whether to test a Japanese-language evaluation path for customer-behaviour analysis before wider localization",
      founderForwardCta: true,
      productEvidenceRendering: "customer-behaviour analysis",
    })
    const finalParagraph = result.message.split(/\n\s*\n/).at(-2) ?? ""

    expect(finalParagraph).toContain("a bounded test of a Japanese-language evaluation path for customer-behaviour analysis")
    expect(finalParagraph).not.toContain("whether to test")
  })

  it("does not repeat the wider-localization boundary in the finalized CTA", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "founder_forward",
        message: `Hello Salesfire team,\n\nSalesfire describes customer-behaviour analysis.\n\nThe workflow should be tested through a Japanese-language path before wider localization is considered.\n\nI can send an analysis. Who owns it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Salesfire",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "whether the customer-behaviour analysis workflow should be tested through a Japanese-language path before wider localization is considered",
      founderForwardCta: true,
      productEvidenceRendering: "customer-behaviour analysis",
    })

    expect(result.message.match(/before wider localization is considered/gi) ?? []).toHaveLength(0)
  })

  it("restores public-page provenance when a model writes only checked pages", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "permission_to_send",
        message: `Hello Example team,\n\nExample documents an API-first fraud review workflow.\n\nThe checked pages did not show a Japanese-language path.\n\nI can send an analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Example",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded test of fraud-review evaluation",
      founderForwardCta: false,
      productEvidenceRendering: "API-first fraud review workflow",
    })

    expect(result.message).toContain("The checked public pages did not show a Japanese-language customer path.")
    expect(result.message).not.toContain("The checked pages did not show a Japanese-language path.")
  })

  it("keeps the restored public-page audit ahead of repeated path language", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "founder_forward",
        message: `Hello Salesfire team,\n\nSalesfire describes customer-behaviour analysis.\n\nThe customer-behaviour workflow has a Japanese-language evaluation decision.\n\nFor the documented Japanese-language condition, the open decision is whether to run a bounded test.\n\nI can send an analysis. Who owns it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Salesfire",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "a bounded test of customer-behaviour analysis",
      founderForwardCta: true,
      productEvidenceRendering: "customer-behaviour analysis",
    })

    expect(result.message).toContain("The checked public pages did not show a Japanese-language customer path.")
    expect(result.message).not.toContain("For the documented Japanese-language condition")
  })

  it("repairs a missing article before a bounded test", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "founder_forward",
        message: `Hello Salesfire team,\n\nSalesfire describes customer-behaviour analysis.\n\nThe checked public pages did not show a Japanese-language path.\n\nI can send an analysis. Who owns it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Salesfire",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "bounded test of the customer-behaviour analysis workflow",
      founderForwardCta: true,
      productEvidenceRendering: "analysis of customer preferences and behavioural trends",
    })

    expect(result.message.split(/\n\s*\n/).at(-2)).toContain("a bounded test")
    expect(result.message.split(/\n\s*\n/).at(-2)).not.toContain("around bounded test")
  })

  it("uses the grounded conversion subject when the model focus is too generic", () => {
    const result = finalizeManualBespokeCta({
      candidate: {
        cta_type: "founder_forward",
        message: `Hello Screenshot to Code team,\n\nScreenshot to Code documents conversion from screenshots and videos.\n\nThe checked public pages did not show a Japanese-language path.\n\nI can send an analysis. Who owns it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`,
      },
      companyName: "Screenshot to Code",
      customerPathAnchor: "Japanese-language",
      questionDecisionAnchor: "Japanese-language evaluation-path decision",
      solutionFocus: "product evaluation and Japanese positioning",
      founderForwardCta: true,
      productEvidenceRendering: "AI-powered conversion from screenshots and videos to clean, production-ready code",
    })
    const finalParagraph = result.message.split(/\n\s*\n/).at(-2) ?? ""

    expect(finalParagraph).toContain("a bounded evaluation of the conversion from screenshots and videos through a Japanese-language customer path")
    expect(finalParagraph).not.toContain("product evaluation and Japanese positioning")
  })
})

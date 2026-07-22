import { describe, expect, it } from "vitest"
import { recoverManualInitialInterestCandidate } from "./manual-japan-entry-candidate-recovery"
import { buildManualCtaContracts } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import { reviewManualMessageDistinctness } from "./manual-japan-entry-message-similarity"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"

describe("manual recovery uniqueness", () => {
  it("pads short copy with product-grounded sentences instead of the shared recovery pool", () => {
    const companyName = "Airvida"
    const rendering = "Wearable Air Purifier"
    const fact: JapanEntryPersonalizationFact = {
      id: "japan-audit-language",
      statement: "The checked public pages did not show a Japanese-language customer path.",
      source: "Japan market public-page audit",
      confidence: 0.76,
      anchors: ["Japanese-language", "Japanese language"],
    }
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: companyName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const candidate = {
      message: `${manualFormGreeting(companyName)}\n\n${companyName} is a ${rendering}.\n\n${fact.statement}\n\nWould you like the analysis for ${companyName}?\n\n${MANUAL_FORM_SIGNATURE}`,
      fact_ids: [fact.id],
      product_evidence: rendering,
      product_evidence_rendering: rendering,
      cta_type: "permission_to_send",
    }
    const initialSafety = reviewPersonalizedJapanEntryMessage({
      message: candidate.message,
      companyName,
      productContext: `${companyName} documents ${rendering}.`,
      productEvidence: rendering,
      productEvidenceRendering: rendering,
      factIds: candidate.fact_ids,
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })
    const recovered = recoverManualInitialInterestCandidate({
      candidate,
      companyName,
      facts: [fact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: initialSafety.issues,
      similarityPassed: true,
    })
    const priorGeneric = [
      "The practical question is whether the Japanese-language observation deserves a focused test before a broader market commitment.",
      "The public evidence does not resolve that decision, so the analysis keeps assumptions separate from observed facts.",
    ].join(" ")
    const similarity = reviewManualMessageDistinctness({
      message: recovered.message,
      companyName,
      priorMessages: [{
        id: "prior",
        companyName: "Prior",
        domain: "prior.example",
        message: `Hello Prior team,\n\nPrior documents inventory software.\n\n${priorGeneric}\n\nCould you route this to the person responsible for market research at Prior?\n\n${MANUAL_FORM_SIGNATURE}`,
      }],
    })
    const safety = reviewPersonalizedJapanEntryMessage({
      message: recovered.message,
      companyName,
      productContext: `${companyName} documents ${rendering}.`,
      productEvidence: rendering,
      productEvidenceRendering: rendering,
      factIds: recovered.fact_ids,
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(recovered.message).toContain("Wearable Air Purifier")
    expect(recovered.message).not.toContain("The practical question is whether")
    expect(recovered.message).not.toContain("The public evidence does not resolve")
    expect(initialSafety.issues).toContain("The opening must describe the company's product without conflating the company with its product category")
    expect(recovered.message).not.toContain("Airvida is a Wearable Air Purifier")
    expect(similarity.passed, similarity.reasons.join("\n")).toBe(true)
    expect(safety.passed, safety.issues.join("\n")).toBe(true)
  })
})

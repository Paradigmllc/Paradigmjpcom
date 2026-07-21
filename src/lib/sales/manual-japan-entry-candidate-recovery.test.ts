import { describe, expect, it } from "vitest"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { buildManualCtaContracts } from "./manual-japan-entry-cta-contract"
import { recoverManualInitialInterestCandidate } from "./manual-japan-entry-candidate-recovery"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"

const companyName = "AtlasMetric"
const productName = "AtlasMetric Review"
const productEvidence = "workspace approval workflow"
const productEvidenceRendering = "a verified workspace approval workflow for independent analytics teams"
const productContext = `AtlasMetric documents ${productEvidenceRendering}.`
const auditFact: JapanEntryPersonalizationFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Japan market public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language", "Japanese language", "Japanese content"],
}

describe("manual initial-interest candidate recovery", () => {
  it("turns a failed draft into copy-ready, grounded form copy without weakening the review gate", () => {
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: productName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const candidate = {
      message: `${manualFormGreeting(companyName)}

${companyName} has an impressive product that could reduce waste for customers.

Please download the attached analysis at https://example.com. It can unlock revenue and create friction for buyers.

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
      fact_ids: [auditFact.id],
      product_evidence: productEvidence,
      product_evidence_rendering: productEvidenceRendering,
      cta_type: "legacy_unspecified",
    }
    const recovered = recoverManualInitialInterestCandidate({
      candidate,
      companyName,
      productNames: [productName],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: [
        "Unsupported performance or attached-material claim is prohibited",
        "Unsupported causal inference or invented package deliverable is prohibited",
        "Revenue wording is not tied to the modeled opportunity fact",
        "Generic, promotional, invented, or unsupported market phrasing is prohibited",
        "Message must be 120-190 words",
      ],
      similarityPassed: true,
    })
    const review = reviewPersonalizedJapanEntryMessage({
      message: recovered.message,
      companyName,
      productContext,
      productNames: [productName],
      productEvidence,
      productEvidenceRendering,
      factIds: recovered.fact_ids,
      facts: [auditFact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(review).toMatchObject({ passed: true, issues: [] })
    expect(review.wordCount).toBeGreaterThanOrEqual(120)
    expect(review.wordCount).toBeLessThanOrEqual(190)
    expect(recovered.message).toContain(productEvidenceRendering)
    expect(recovered.message).toContain(auditFact.statement)
    expect(recovered.message).not.toMatch(/https?:\/\/|attached|download|unlock|\brevenue\b|reduce waste/i)
  })

  it("does not rewrite an already passing candidate", () => {
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: productName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const candidate = {
      message: "already valid",
      fact_ids: [auditFact.id],
      product_evidence: productEvidence,
      product_evidence_rendering: productEvidenceRendering,
      cta_type: "permission_to_send",
    }

    expect(recoverManualInitialInterestCandidate({
      candidate,
      companyName,
      productNames: [productName],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: [],
      similarityPassed: true,
    })).toBe(candidate)
  })
})

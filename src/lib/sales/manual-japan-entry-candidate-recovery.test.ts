import { describe, expect, it } from "vitest"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { buildManualCtaContracts, type ManualCtaContract } from "./manual-japan-entry-cta-contract"
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

  it("discards template-like middle copy after a similarity failure and avoids repeated product evidence", () => {
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: productName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const candidate = {
      message: `${manualFormGreeting(companyName)}

${companyName} publicly documents ${productEvidenceRendering}.

This reusable template fragment appears across unrelated company messages. ${productEvidenceRendering}.

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
      supplementalProductEvidence: productEvidenceRendering,
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: ["The initial message is too similar to another company message"],
      similarityPassed: false,
    })

    expect(recovered.message).not.toContain("reusable template fragment")
    expect(recovered.message.match(new RegExp(productEvidenceRendering, "g"))).toHaveLength(1)
    expect(recovered.message).toContain(auditFact.statement)
  })

  it("enforces the exact product anchor in the final question after recovery", () => {
    const [baseContract] = buildManualCtaContracts({
      companyName: "Dub",
      requiredAnchor: "Dub",
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const contract: ManualCtaContract = {
      ...baseContract!,
      paragraph: `${baseContract!.paragraph.replace(baseContract!.question, "")} Would you like to receive it?`,
      question: "Would you like to receive it?",
    }
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting("Dub")}

Dub documents ${productEvidenceRendering}.

This message requires deterministic recovery.

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: productEvidence,
        product_evidence_rendering: productEvidenceRendering,
        cta_type: "legacy_unspecified",
      },
      companyName: "Dub",
      productNames: ["Dub"],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract,
      issues: ["The final CTA question must contain the exact company or product anchor"],
      similarityPassed: true,
    })
    const finalQuestion = recovered.message.match(/[^.!?]*\?\s*(?:\n|$)/g)?.at(-1) ?? ""

    expect(finalQuestion).toContain("Dub")
    expect(finalQuestion.trim()).toBe("Would you like to receive the Dub Japan opportunity analysis?")
  })

  it("rebuilds a multi-sentence opening when one sentence is duplicated later", () => {
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: productName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const repeated = "The workspace approval workflow is documented for independent analytics teams."
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting(companyName)}

${companyName} documents ${productEvidenceRendering}. ${repeated}

${repeated} ${auditFact.statement}

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: productEvidence,
        product_evidence_rendering: productEvidenceRendering,
        cta_type: "legacy_unspecified",
      },
      companyName,
      productNames: [productName],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: ["Repeated or near-duplicate sentences are prohibited; each sentence must add a distinct company-specific point"],
      similarityPassed: true,
    })

    expect(recovered.message).not.toContain(repeated)
    expect(recovered.message).toContain(productEvidenceRendering)
    expect(recovered.message).toContain(auditFact.statement)
  })
})

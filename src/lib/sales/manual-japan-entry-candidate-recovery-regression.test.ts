import { describe, expect, it } from "vitest"
import { recoverManualInitialInterestCandidate } from "./manual-japan-entry-candidate-recovery"
import type { ManualCtaContract } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"

const auditFact: JapanEntryPersonalizationFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Japan market public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language", "Japanese language", "Japanese content"],
}

describe("manual candidate live-copy regressions", () => {
  it("repairs the Airvida pronoun and exact-evidence repetition regression", () => {
    const evidence = "Wearable Air Purifier"
    const contract: ManualCtaContract = {
      id: "airvida-natural-cta",
      ctaType: "permission_to_send",
      paragraph: "I can send a short Japan opportunity analysis for Airvida that separates the verified Japanese-language finding from the decisions still to test. Would it be useful if I sent it over?",
      question: "Would it be useful if I sent it over?",
    }
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting("Airvida")}

In its public product description, Airvida defines its offering around “${evidence}”.

For it, that leaves one decision open. The ${evidence} analysis would keep that choice separate from unsupported claims. A decision brief for the ${evidence} can mark Japan assumptions as unconfirmed.

I can prepare a Japan opportunity analysis for Airvida around the exact Japanese-language evidence. Would you like to receive it?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: evidence,
        product_evidence_rendering: evidence,
        cta_type: "legacy_unspecified",
      },
      companyName: "Airvida",
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract,
      issues: [
        "The message contains an unnatural pronoun bridge; name the documented capability or rewrite the sentence directly",
        "The exact product-evidence phrase must appear no more than twice in the personalized body",
        "Mechanical exact-evidence CTA language is prohibited; offer a concrete decision brief in natural language",
      ],
      similarityPassed: true,
    })
    const body = recovered.message.split(/\n\n/).slice(1, -1).join("\n\n")
    const review = reviewPersonalizedJapanEntryMessage({
      message: recovered.message,
      companyName: "Airvida",
      productContext: `Airvida publicly describes its product as ${evidence}.`,
      productEvidence: evidence,
      productEvidenceRendering: evidence,
      factIds: recovered.fact_ids,
      facts: [auditFact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(body).not.toMatch(/For it, that leaves/i)
    expect(body).not.toMatch(/around the exact [^.?!]+ evidence/i)
    expect(body.match(new RegExp(evidence, "g"))?.length ?? 0).toBeLessThanOrEqual(2)
    expect(body).toContain(contract.paragraph)
    expect(review).toMatchObject({ passed: true, issues: [] })
  })
})

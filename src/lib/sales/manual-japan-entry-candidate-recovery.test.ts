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
    expect(recovered.message).not.toContain(`${companyName} publicly documents`)
    expect(recovered.message.match(new RegExp(productEvidenceRendering, "g"))).toHaveLength(1)
    expect(recovered.message).toContain(auditFact.statement)
  })

  it("tries structurally distinct safe variants and accepts a contract that prepares and routes the analysis", () => {
    const contract: ManualCtaContract = {
      id: "cta-prepare-route",
      ctaType: "right_person",
      paragraph: `I can prepare a concise Japan opportunity analysis for ${productName} around the open Japanese-language decision. Who would be the right person to review it?`,
      question: "Who would be the right person to review it?",
    }
    const candidate = {
      message: `${manualFormGreeting(companyName)}

${companyName} documents ${productEvidenceRendering}.

This repeated template fragment requires a deterministic rewrite.

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
      fact_ids: [auditFact.id],
      product_evidence: productEvidence,
      product_evidence_rendering: productEvidenceRendering,
      cta_type: "legacy_unspecified",
    }
    const recover = (variationIndex: number) => recoverManualInitialInterestCandidate({
      candidate,
      companyName,
      productNames: [productName],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract,
      issues: ["The initial message is too similar to another company message"],
      similarityPassed: false,
      variationIndex,
    })
    const first = recover(0)
    const second = recover(1)
    const review = reviewPersonalizedJapanEntryMessage({
      message: first.message,
      companyName,
      productContext,
      productNames: [productName],
      productEvidence,
      productEvidenceRendering,
      factIds: first.fact_ids,
      facts: [auditFact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(first.message).not.toBe(second.message)
    expect(review).toMatchObject({ passed: true, issues: [] })
    expect(first.message).toContain(contract.paragraph)
  })

  it("keeps one grounded and one CTA anchor while replacing model repetition with natural references", () => {
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: companyName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting(companyName)}

${companyName} documents ${productEvidenceRendering}. ${companyName} also describes the review workflow in its public material.

The checked pages leave the Japanese-language decision open for ${companyName}. ${companyName}'s public evidence does not resolve that decision.

I can send a Japan opportunity analysis for ${companyName}. Would you like me to send it?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: productEvidence,
        product_evidence_rendering: productEvidenceRendering,
        cta_type: "permission_to_send",
      },
      companyName,
      productNames: [],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: ["The company name must appear no more than twice in the personalized body; use natural pronouns after the grounded introduction"],
      similarityPassed: true,
    })
    const body = recovered.message.split(/\n\n/).slice(1, -1).join("\n\n")

    expect(body.match(new RegExp(companyName, "g"))).toHaveLength(2)
    expect(body).toMatch(/the company|its/i)
    expect(body.split(/\n\n/).at(-1)).toContain(companyName)
  })

  it("keeps the exact product anchor once in the CTA paragraph and a natural pronoun in the question", () => {
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
      issues: ["The final CTA paragraph must contain the exact company or product anchor"],
      similarityPassed: true,
    })
    const finalQuestion = recovered.message.match(/[^.!?]*\?\s*(?:\n|$)/g)?.at(-1) ?? ""

    expect(recovered.message).toContain("Dub")
    expect(finalQuestion).not.toContain("Dub")
    expect(finalQuestion.trim()).toBe("Would you like to receive it?")
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

  it("reasserts faithful product evidence when the company name is part of the source phrase", () => {
    const evidence = "Agrohub Benchmarking –"
    const [contract] = buildManualCtaContracts({
      companyName: "AGROHUB",
      requiredAnchor: "AGROHUB",
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting("AGROHUB")}

AGROHUB publicly documents ${evidence}. AGROHUB describes the same capability elsewhere.

${auditFact.statement}

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: evidence,
        product_evidence_rendering: evidence,
        cta_type: "legacy_unspecified",
      },
      companyName: "AGROHUB",
      productNames: [],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: ["The company name must appear no more than twice in the personalized body"],
      similarityPassed: true,
    })
    const body = recovered.message.split(/\n\n/).slice(1, -1).join("\n\n")

    expect(recovered.message).toContain(evidence)
    expect(body.match(/AGROHUB/gi)).toHaveLength(2)
  })

  it("keeps a numeric brand identity without treating it as an invented claim", () => {
    const numericCompanyName = "149 Technologies"
    const numericProductName = "149 Discover"
    const numericEvidence = "a verified workspace discovery workflow for independent product teams"
    const [contract] = buildManualCtaContracts({
      companyName: numericCompanyName,
      requiredAnchor: numericProductName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting(numericCompanyName)}

${numericCompanyName} publicly documents ${numericEvidence}.

${auditFact.statement}

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: numericEvidence,
        product_evidence_rendering: numericEvidence,
        cta_type: "legacy_unspecified",
      },
      companyName: numericCompanyName,
      productNames: [numericProductName],
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: ["Unsupported numeric claims: 149"],
      similarityPassed: true,
    })
    const review = reviewPersonalizedJapanEntryMessage({
      message: recovered.message,
      companyName: numericCompanyName,
      productContext: `${numericProductName} documents ${numericEvidence}.`,
      productNames: [numericProductName],
      productEvidence: numericEvidence,
      productEvidenceRendering: numericEvidence,
      factIds: recovered.fact_ids,
      facts: [auditFact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(review.issues).not.toContain("Unsupported numeric claims: 149")
    expect(review).toMatchObject({ passed: true, issues: [] })
  })

  it("reduces a plural possessive company anchor without leaving a broken apostrophe", () => {
    const companyName = "149 Technologies"
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: companyName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting(companyName)}

${companyName} documents a workspace discovery workflow.

${companyName}’ workflow keeps research in one place. ${auditFact.statement}

Can we talk?

${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: "a workspace discovery workflow",
        product_evidence_rendering: "a workspace discovery workflow",
        cta_type: "legacy_unspecified",
      },
      companyName,
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: ["The company name must appear no more than twice in the personalized body"],
      similarityPassed: true,
    })

    expect(recovered.message).not.toMatch(/company[’']/i)
    expect(recovered.message).toContain("Its workflow")
  })

})

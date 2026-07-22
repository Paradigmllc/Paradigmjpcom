import { describe, expect, it } from "vitest"
import { buildManualCtaContracts } from "./manual-japan-entry-cta-contract"
import {
  canSafelyFinishManualModelCopy,
  canUseManualDeterministicRecovery,
  recoverManualInitialInterestCandidate,
} from "./manual-japan-entry-candidate-recovery"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const auditFact: JapanEntryPersonalizationFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Japan market public-page audit",
  confidence: 0.76,
  anchors: ["Japanese-language"],
}

describe("manual model-copy safe finalizer", () => {
  it("removes an unselected positioning claim while preserving the model-authored product opening", () => {
    const companyName = "ProofWall"
    const evidence = "collects customer testimonials through a hosted request workflow"
    const [contract] = buildManualCtaContracts({
      companyName,
      requiredAnchor: companyName,
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const issue = "An unpublished positioning concept must not be claimed unless its stored fact is selected"
    const recovered = recoverManualInitialInterestCandidate({
      candidate: {
        message: `${manualFormGreeting(companyName)}\n\n${companyName} ${evidence}.\n\nA draft Japanese positioning concept remains unpublished. ${auditFact.statement}\n\nCan we talk?\n\n${MANUAL_FORM_SIGNATURE}`,
        fact_ids: [auditFact.id],
        product_evidence: evidence,
        product_evidence_rendering: evidence,
        cta_type: "legacy_unspecified",
      },
      companyName,
      facts: [auditFact],
      customerPathAnchor: "Japanese-language",
      contract: contract!,
      issues: [issue],
      similarityPassed: true,
    })

    expect(canSafelyFinishManualModelCopy({ issues: [issue], similarityPassed: true })).toBe(true)
    expect(recovered.message).toContain(`${companyName} ${evidence}.`)
    expect(recovered.message).not.toMatch(/positioning concept/i)
    const bodyWords = recovered.message.split(/\n\n/).slice(1, -1).join(" ").split(/\s+/).filter(Boolean)
    expect(bodyWords.length).toBeGreaterThanOrEqual(120)
  })

  it("does not authorize unsupported semantic or similarity failures", () => {
    expect(canSafelyFinishManualModelCopy({
      issues: ["Unsupported causal inference or invented package deliverable is prohibited"],
      similarityPassed: true,
    })).toBe(false)
    expect(canSafelyFinishManualModelCopy({
      issues: ["Message must be 120-190 words"],
      similarityPassed: false,
    })).toBe(false)
  })

  it("authorizes restoring required product evidence because recovery re-runs every hard gate", () => {
    expect(canSafelyFinishManualModelCopy({
      issues: [
        "The faithful English product-evidence rendering is missing from the message",
        "The opening product section must contain the company or exact product name and faithful English product-evidence rendering",
        "Message must be 120-190 words",
      ],
      similarityPassed: true,
    })).toBe(true)
  })

  it("allows a fact-grounded rebuild after a uniqueness failure and still requires the recovery flag", () => {
    expect(canUseManualDeterministicRecovery({ allowRecovery: true, similarityPassed: false })).toBe(true)
    expect(canUseManualDeterministicRecovery({ allowRecovery: true, similarityPassed: true })).toBe(true)
    expect(canUseManualDeterministicRecovery({ allowRecovery: false, similarityPassed: true })).toBe(false)
    expect(canUseManualDeterministicRecovery({ allowRecovery: false, similarityPassed: false })).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { reviewManualMessageDistinctness } from "./manual-japan-entry-message-similarity"
import {
  finalizeManualMessageProduction,
  finalizeManualMessageUniqueness,
} from "./manual-japan-entry-uniqueness-finalizer"

const signature = "Best regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com"

describe("finalizeManualMessageUniqueness", () => {
  it("grounds one duplicate, removes later duplicates, and rechecks every revision", () => {
    const first = "The practical question is whether the Japanese-language observation deserves a focused test before a broader market commitment."
    const second = "The public evidence does not resolve that decision, so the analysis keeps assumptions separate from observed facts."
    const prior = `Hello Prior team,\n\nPrior documents inventory software.\n\n${first} ${second}\n\nCould you point me to the person who owns market research and localization decisions at Prior?\n\n${signature}`
    const initial = {
      message: `Hello Airvida team,\n\nAirvida documents Airvida – Wearable Air Purifier.\n\n${first} ${second}\n\nI can prepare the evidence-led Japan analysis for Airvida. Would you like to receive it?\n\n${signature}`,
      product_evidence_rendering: "Airvida – Wearable Air Purifier",
    }
    let inspections = 0
    const inspect = (candidate: typeof initial) => {
      inspections += 1
      return {
        candidate,
        safety: { passed: true },
        similarity: reviewManualMessageDistinctness({
          message: candidate.message,
          companyName: "Airvida",
          priorMessages: [{ id: "prior", companyName: "Prior", domain: "prior.example", message: prior }],
        }),
        usedRecovery: false,
      }
    }

    const finalized = finalizeManualMessageUniqueness({
      inspection: inspect(initial),
      companyName: "Airvida",
      inspect,
    })

    expect(finalized.similarity.passed, finalized.similarity.reasons.join("\n")).toBe(true)
    expect(finalized.candidate.message).not.toContain(first)
    expect(finalized.candidate.message).not.toContain(second)
    expect(finalized.candidate.message).toContain("documented “Wearable Air Purifier” scope")
    expect(inspections).toBeGreaterThanOrEqual(3)
  })

  it("alternates uniqueness and mechanical safety repair until both pass", () => {
    const duplicate = "The practical question is whether the Japanese-language observation deserves a focused test before a broader market commitment."
    const prior = `Hello Prior team,\n\nPrior documents inventory software.\n\n${duplicate}\n\nCould you route this to the person responsible for localization research at Prior?\n\n${signature}`
    const initial = {
      message: `Hello Airvida team,\n\nAirvida documents Airvida – Wearable Air Purifier.\n\n${duplicate}\n\nI can prepare the evidence-led Japan analysis for Airvida. Would you like to receive it?\n\n${signature}`,
      product_evidence_rendering: "Airvida – Wearable Air Purifier",
    }
    const inspect = (candidate: typeof initial) => ({
      candidate,
      safety: { passed: candidate.message.includes("bounded validation step") },
      similarity: reviewManualMessageDistinctness({
        message: candidate.message,
        companyName: "Airvida",
        priorMessages: [{ id: "prior", companyName: "Prior", domain: "prior.example", message: prior }],
      }),
      usedRecovery: false,
    })
    const finalized = finalizeManualMessageProduction({
      inspection: inspect(initial),
      companyName: "Airvida",
      inspect,
      canRecoverSafety: (inspection) => inspection.similarity.passed && !inspection.safety.passed,
      recoverSafety: (candidate) => inspect({
        ...candidate,
        message: candidate.message.replace(
          "I can prepare the evidence-led Japan analysis",
          "A bounded validation step keeps assumptions separate from observed facts. I can prepare the evidence-led Japan analysis",
        ),
      }),
    })

    expect(finalized.similarity.passed).toBe(true)
    expect(finalized.safety.passed).toBe(true)
    expect(finalized.candidate.message).not.toContain(duplicate)
    expect(finalized.candidate.message).toContain("bounded validation step")
  })
})

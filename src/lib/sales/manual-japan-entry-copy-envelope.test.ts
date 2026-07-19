import { describe, expect, it } from "vitest"
import {
  inspectManualFormCopyEnvelope,
  MANUAL_FORM_SIGNATURE,
  manualFormGreeting,
  withManualFormCopyReadyEnvelope,
} from "./manual-japan-entry-copy-envelope"

describe("manual Japan Entry copy-ready envelope", () => {
  it("adds a company greeting and the approved sender signature", () => {
    const candidate = withManualFormCopyReadyEnvelope({ message: "I reviewed the public product pages.\n\nWould you be open to receiving the analysis?" }, "Example")

    expect(candidate.message).toBe(`${manualFormGreeting("Example")}\n\nI reviewed the public product pages.\n\nWould you be open to receiving the analysis?\n\n${MANUAL_FORM_SIGNATURE}`)
    expect(inspectManualFormCopyEnvelope(candidate.message, "Example")).toMatchObject({
      greetingValid: true,
      signatureValid: true,
      bodyParagraphs: ["I reviewed the public product pages.", "Would you be open to receiving the analysis?"],
    })
  })

  it("replaces a generated greeting and sender signature without duplicating them", () => {
    const generated = `Hello there,\n\nI reviewed Example's public pages.\n\nWould you be open to receiving the analysis?\n\nKind regards,\nSato\nParadigm LLC`
    const candidate = withManualFormCopyReadyEnvelope({ message: generated }, "Example")

    expect(candidate.message.match(/^Hello/gm)).toHaveLength(1)
    expect(candidate.message.match(/Best regards,/g)).toHaveLength(1)
    expect(candidate.message).not.toContain("Sato")
    expect(candidate.message).toContain("contact@paradigmjp.com")
  })
})

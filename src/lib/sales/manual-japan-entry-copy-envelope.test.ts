import { describe, expect, it } from "vitest"
import {
  inspectManualFormCopyEnvelope,
  MANUAL_FORM_SIGNATURE,
  manualFormCompanyName,
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

  it.each([
    ["aaapnea.com", "Aaapnea"],
    ["482.solutions", "482 Solutions"],
    ["AIPath.one", "AIPath One"],
    ["ASP.NET", "ASP NET"],
    ["Aires A.T", "Aires AT"],
  ])("turns a domain-like or dotted company label into URL-free form copy", (raw, expected) => {
    expect(manualFormCompanyName(raw)).toBe(expected)
    const candidate = withManualFormCopyReadyEnvelope({
      message: "The checked public product page documents a workflow for analytics teams.\n\nWould you like to receive the Japan opportunity analysis?",
    }, raw)

    expect(candidate.message).toContain(`Hello ${expected} team,`)
    expect(candidate.message.replace("contact@paradigmjp.com", "")).not.toMatch(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i)
  })
})

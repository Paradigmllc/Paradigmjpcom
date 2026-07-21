import { describe, expect, it } from "vitest"
import { applyManualCtaContract, buildManualCtaContracts } from "./manual-japan-entry-cta-contract"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import { reviewManualMessageDistinctness } from "./manual-japan-entry-message-similarity"

const priorMessage = `${manualFormGreeting("Alpha")}

Alpha documents approval workflows for independent software teams.

The checked public pages did not show a Japanese-language customer path. Whether that observation matters for Alpha remains unverified.

I can share a detailed Japan opportunity analysis based on this public evidence. Could you forward this to the founder or person responsible for international growth at Alpha?

${MANUAL_FORM_SIGNATURE}`

describe("manual CTA contract", () => {
  it("keeps every selectable route inside the deterministic analysis CTA contract", () => {
    const observed = new Map<string, string>()
    for (let index = 0; index < 200; index += 1) {
      const contracts = buildManualCtaContracts({
        companyName: `Company ${index}`,
        requiredAnchor: `Product ${index}`,
        customerPathAnchor: "Japanese-language",
        priorMessages: [],
      })
      for (const contract of contracts) observed.set(contract.id, contract.paragraph)
    }

    expect(observed.size).toBeGreaterThanOrEqual(120)
    for (const paragraph of observed.values()) {
      expect(paragraph).toMatch(/Japan (?:opportunity )?analysis/i)
      expect(paragraph).toMatch(/(?:share|send|receive|forward|right person|appropriate person|who owns|owner|responsible)/i)
      expect(paragraph).toMatch(/Product \d+/)
      expect(paragraph).toMatch(/Japanese-language/)
      expect(paragraph).toMatch(/\?$/)
    }
  })

  it("selects a company-specific final paragraph that is distinct from recent copy", () => {
    const contracts = buildManualCtaContracts({
      companyName: "Beta",
      requiredAnchor: "Beta Flow",
      customerPathAnchor: "Japanese-language",
      priorMessages: [{ id: "prior", companyName: "Alpha", domain: "alpha.example", message: priorMessage }],
    })

    expect(contracts).toHaveLength(3)
    expect(new Set(contracts.map((contract) => contract.paragraph)).size).toBe(3)
    for (const contract of contracts) {
      expect(contract.paragraph).toContain("Beta Flow")
      expect(contract.paragraph).toContain("Japanese-language")
      expect(contract.question).toMatch(/Beta Flow.*\?$/)
    }
  })

  it("replaces only the final body paragraph and passes the rolling-history CTA gate", () => {
    const [contract] = buildManualCtaContracts({
      companyName: "Beta",
      requiredAnchor: "Beta Flow",
      customerPathAnchor: "Japanese-language",
      priorMessages: [{ id: "prior", companyName: "Alpha", domain: "alpha.example", message: priorMessage }],
      count: 1,
    })
    const candidate = {
      message: `${manualFormGreeting("Beta")}

Beta documents a review workflow for software teams.

The checked public pages did not show a Japanese-language customer path. Whether that observation matters for Beta remains unverified.

Generic final paragraph?

${MANUAL_FORM_SIGNATURE}`,
      cta_type: "legacy_unspecified",
    }
    const applied = applyManualCtaContract(candidate, "Beta", contract!)
    const review = reviewManualMessageDistinctness({
      message: applied.message,
      companyName: "Beta",
      priorMessages: [{ id: "prior", companyName: "Alpha", domain: "alpha.example", message: priorMessage }],
    })

    expect(applied.message).toContain("Beta documents a review workflow")
    expect(applied.message).toContain(contract!.paragraph)
    expect(applied.cta_type).toBe(contract!.ctaType)
    expect(review.passed).toBe(true)
  })
})

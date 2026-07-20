import { describe, expect, it } from "vitest"
import { manualMessageSimilarity, reviewManualMessageDistinctness } from "./manual-japan-entry-message-similarity"

describe("manual inquiry-form copy distinctness", () => {
  it("rejects a company-name swap of the same message architecture", () => {
    const prior = "Hello, I’m Sato from Paradigm LLC in Japan. I reviewed Alpha's workflow platform. The checked public pages did not show a Japanese-language customer path. I can share a Japan opportunity analysis. Would you be open to receiving it?"
    const next = "Hello, I’m Sato from Paradigm LLC in Japan. I reviewed Beta's workflow platform. The checked public pages did not show a Japanese-language customer path. I can share a Japan opportunity analysis. Would you be open to receiving it?"
    const result = reviewManualMessageDistinctness({ message: next, companyName: "Beta", priorMessages: [{ id: "prior-1", companyName: "Alpha", domain: "alpha.example", message: prior }] })
    expect(result.passed).toBe(false)
    expect(result.matchedMessageId).toBe("prior-1")
  })

  it("accepts copy built from a materially different company observation and CTA", () => {
    const prior = "I reviewed Alpha's workflow platform and found no Japanese-language customer path. I can share a Japan opportunity analysis. Would you like it?"
    const next = "Beta documents an API-first fraud review flow for marketplace operators. I’m Sato at Paradigm LLC in Japan. The public pages explain the risk workflow clearly, but the checked path does not show how a Japanese marketplace team would evaluate it. I mapped that decision gap in a short Japan analysis. Are you the right person for me to send it to?"
    expect(manualMessageSimilarity(prior, next, ["Alpha", "Beta"])).toBeLessThan(0.2)
    expect(reviewManualMessageDistinctness({ message: next, companyName: "Beta", priorMessages: [{ id: "prior-1", companyName: "Alpha", domain: "alpha.example", message: prior }] }).passed).toBe(true)
  })

  it("rejects drafts that swap the product paragraph but reuse the same diagnosis and routing CTA", () => {
    const prior = `Hello Alpha team,

Alpha lets customers create a bespoke perfume through online sessions and personalized kits.

A review of your public pages showed no Japanese-language customer path. Whether this gap affects Alpha's Japanese customer path remains unverified.

I can share a one-page Japan Opportunity Snapshot based on this public evidence to inform an Alpha Japanese-language decision. Could you forward this to the founder or person responsible for international growth at Alpha?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const next = `Hello Beta team,

Beta provides customer journey analytics across onsite search and email.

A review of your public pages showed no Japanese-language customer path. Whether this gap affects Beta's Japanese customer path remains unverified.

I can share a one-page Japan Opportunity Snapshot based on this public evidence to inform a Beta Japanese-language decision. Could you forward this to the founder or person responsible for international growth at Beta?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`

    const result = reviewManualMessageDistinctness({
      message: next,
      companyName: "Beta",
      priorMessages: [{ id: "prior-1", companyName: "Alpha", domain: "alpha.example", message: prior }],
    })

    expect(result.maxSimilarity).toBeGreaterThanOrEqual(0.35)
    expect(result.passed).toBe(false)
  })
})

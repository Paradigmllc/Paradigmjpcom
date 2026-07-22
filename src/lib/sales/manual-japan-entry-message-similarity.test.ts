import { describe, expect, it } from "vitest"
import { manualMessageSimilarity, reviewManualMessageDistinctness, stripRejectedManualMessageSentences } from "./manual-japan-entry-message-similarity"

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

  it("allows the same required audit fact when the overall draft and CTA are distinct", () => {
    const prior = `Hello Alpha team,

Alpha documents inventory reconciliation for independent shops.

The checked public pages did not show a Japanese-language customer path.

Whether that gap matters for Alpha remains unverified.

I mapped the open localization decision in an analysis. Would the Alpha product owner like me to send it?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const next = `Hello Beta team,

Beta provides approval routing for security review teams.

The implementation question for Beta is how the current evaluation flow should be presented in Japan; that remains open.

The checked public pages did not show a Japanese-language customer path.

My Japan analysis separates that public-page evidence from the decisions still requiring validation. Who owns Beta's Japanese-language customer-path review?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`

    const result = reviewManualMessageDistinctness({
      message: next,
      companyName: "Beta",
      priorMessages: [{ id: "prior-audit", companyName: "Alpha", domain: "alpha.example", message: prior }],
      allowedRepeatedSentences: ["The checked public pages did not show a Japanese-language customer path."],
    })

    expect(result.passed).toBe(true)
  })

  it("rejects an exact reusable diagnosis sentence even when the full messages differ", () => {
    const stock = "That observation is limited to what the pages display; it does not confirm demand, buyer behavior, or commercial readiness in Japan."
    const prior = `Hello Alpha team,\n\nAlpha documents inventory reconciliation for independent shops.\n\n${stock}\n\nI can send Alpha's analysis. Would you like it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`
    const next = `Hello Beta team,\n\nBeta documents API approval routing for security teams.\n\n${stock}\n\nI can prepare Beta's analysis. Who should receive it?\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`

    const result = reviewManualMessageDistinctness({
      message: next,
      companyName: "Beta",
      priorMessages: [{ id: "prior-stock", companyName: "Alpha", domain: "alpha.example", message: prior }],
    })

    expect(result.passed).toBe(false)
    expect(result.matchedMessageId).toBe("prior-stock")
    expect(result.reasons.join(" ")).toContain("duplicates prior company copy")
    const stripped = stripRejectedManualMessageSentences(next, result.reasons)
    expect(stripped).not.toContain(stock)
    expect(stripped).toContain("Beta documents API approval routing")
    expect(stripped).toContain("Best regards")
  })

  it("does not compare the approved final CTA sentence as diagnosis copy", () => {
    const sharedCta = "I can send a short Japan opportunity analysis focused on the Japanese-language question. Would you like me to send it?"
    const prior = `Hello Alpha team,\n\nAlpha documents inventory reconciliation for independent shops.\n\nThe storefront review leaves catalog localization as the unverified decision.\n\n${sharedCta}\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`
    const next = `Hello Beta team,\n\nBeta documents API approval routing for security teams.\n\nThe security workflow review leaves Japanese administrator onboarding as the open validation decision.\n\n${sharedCta}\n\nBest regards,\nTomohiro H\nParadigm LLC\ncontact@paradigmjp.com`

    const result = reviewManualMessageDistinctness({
      message: next,
      companyName: "Beta",
      priorMessages: [{ id: "prior-cta", companyName: "Alpha", domain: "alpha.example", message: prior }],
      ctaThreshold: 1.01,
    })

    expect(result.passed).toBe(true)
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

  it("rejects the live Paperform and SavvyCal drafts because their CTA paragraph is the same template", () => {
    const paperform = `Hello Paperform team,

Paperform provides a doc-style form builder where you can create forms and surveys, take payments, automate workflows and send documents for signing, all from one easy, doc-style form builder FOR FREE. The platform also supports surveys, quizzes, tests, payment forms, scheduling forms, and a whole lot more.

A review of your public pages showed no Japanese-language customer path. The pages we checked did not include Japanese-language content or a localized experience for Japanese-speaking visitors.

Whether this gap affects Paperform's Japanese customer path remains unverified. The decision about how Paperform would serve Japanese-speaking users is still open.

I can share a detailed Japan opportunity analysis based on this public evidence to inform a Paperform Japanese-language decision. Could you forward this to the founder or person responsible for international growth at Paperform?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const savvycal = `Hello SavvyCal team,

SavvyCal's scheduling tool includes a feature where the recipient can view their calendar events on top of your scheduling link, to save them the hassle of clicking back and forth. Additionally, you can adjust the colors, banner image, and avatar that appear on your links to match your unique style.

We reviewed your public pages and found no Japanese-language customer path. The checked pages lacked a Japanese interface, localized content, or any indication of how Japanese-speaking prospects might evaluate SavvyCal.

The decision about whether this gap impacts SavvyCal's Japanese customer path remains unverified. Without a Japanese-language presence, the quality of the evaluation experience for Japanese prospects is uncertain.

I can share a detailed Japan opportunity analysis based on this public evidence to inform a SavvyCal Japanese-language decision. Could you forward this to the founder or person responsible for international growth at SavvyCal?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`

    const result = reviewManualMessageDistinctness({
      message: savvycal,
      companyName: "SavvyCal",
      priorMessages: [{ id: "paperform-live", companyName: "Paperform", domain: "paperform.co", message: paperform }],
    })

    expect(result.passed).toBe(false)
    expect(result.maxSimilarity).toBe(1)
    expect(result.reasons.join(" ")).toContain("routing or permission paragraph")
  })

  it("rejects a repeated product phrase inside one sentence even without history", () => {
    const result = reviewManualMessageDistinctness({
      message: "Paperform provides a doc-style form builder for teams, all from one doc-style form builder for free.",
      companyName: "Paperform",
      priorMessages: [],
    })

    expect(result.passed).toBe(false)
    expect(result.reasons.join(" ")).toContain("Repeated phrase")
  })

  it("does not treat a repeated legal company identity as reusable template copy", () => {
    const result = reviewManualMessageDistinctness({
      message: "Affirmo Technology Pte Ltd documents an IoT tracking workflow that Affirmo Technology Pte Ltd provides for logistics teams.",
      companyName: "Affirmo Technology Pte Ltd",
      priorMessages: [],
    })

    expect(result.passed).toBe(true)
    expect(result.reasons).toEqual([])
  })
})

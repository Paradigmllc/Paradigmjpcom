import { describe, expect, it } from "vitest"
import { criticMessages, generationMessages, initialInterestGenerationPrompt } from "./japan-entry-personalized-message-prompts"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const fact: JapanEntryPersonalizationFact = { id: "japan-audit-language", statement: "The checked public pages did not show a Japanese-language customer path.", source: "https://example.com/contact", confidence: 0.76, anchors: ["Japanese-language"] }

describe("manual Japan Entry personalization contract", () => {
  it("requires a company strategy without a fixed opening or fixed CTA", () => {
    const prompt = initialInterestGenerationPrompt({ includeEstimate: false, includePrice: false, founderForwardCta: true })
    expect(prompt).toContain("Build the strategy before drafting")
    expect(prompt).toContain("one to three candidates")
    expect(prompt).toContain("must not share the same opening")
    expect(prompt).toContain("Tomohiro H / Paradigm LLC / contact@paradigmjp.com")
    expect(prompt).not.toContain("identify Sato")
    expect(prompt).not.toContain("Paragraph 1 must be exactly")
    expect(prompt).not.toContain("Paragraph 4 must be exactly")
  })

  it("uses the company-strategy contract when initial-interest options are omitted", () => {
    const messages = generationMessages({
      companyName: "Example",
      industry: "SaaS / AI / Developer Tools",
      productContext: "Example provides an API-first fraud review workflow for marketplaces.",
      targetCountry: "US",
      businessModel: "saas",
      purpose: "initial_interest",
    }, [fact], "audit")

    expect(messages[0]?.content).toContain("Build the strategy before drafting")
    expect(messages[0]?.content).toContain("strategy:{primary_observation")
    expect(messages[0]?.content).not.toContain("Paragraph 1 must be exactly")
  })

  it("never exposes internal evidence sources to generation or critic payloads", () => {
    const messages = generationMessages({ companyName: "Example", industry: "SaaS / AI / Developer Tools", productContext: "Example provides an API-first fraud review workflow for marketplaces.", targetCountry: "US", businessModel: "saas", purpose: "initial_interest", initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true }, messageAngle: "problem", outreachPlaybook: "saas_ai_devtools" }, [fact], "audit")
    const payload = messages[1]?.content ?? ""
    expect(payload).not.toContain("https://example.com/contact")
    expect(payload).not.toContain('"source"')
    const criticPayload = criticMessages("Example", [fact], [{ message: "Example message", fact_ids: [fact.id], product_evidence: "fraud review workflow", angle: "problem" }], "audit", "initial_interest")[1]?.content ?? ""
    expect(criticPayload).not.toContain("https://example.com/contact")
    expect(criticPayload).not.toContain('"source"')
  })

  it("fails closed when form copy contains a citation even without a URL", () => {
    const message = `Example documents an API-first fraud review workflow for marketplaces. I’m Sato from Paradigm LLC in Japan.\n\nAccording to the public source, the checked public pages did not show a Japanese-language customer path.\n\nI mapped this as an unverified Japan customer-path question in a short opportunity analysis. Would you be open to receiving it?`
    const result = reviewPersonalizedJapanEntryMessage({ message, companyName: "Example", productContext: "Example documents an API-first fraud review workflow for marketplaces.", productEvidence: "API-first fraud review workflow", factIds: [fact.id], facts: [fact], purpose: "initial_interest", initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false }, messageAngle: "problem", candidateAngle: "problem" })
    expect(result.passed).toBe(false)
    expect(result.issues).toContain("Sources, citations, and reference markers are prohibited in form copy")
  })
})

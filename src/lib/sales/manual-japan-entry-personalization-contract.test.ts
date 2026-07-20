import { describe, expect, it } from "vitest"
import { criticMessages, generationMessages, initialInterestGenerationPrompt } from "./japan-entry-personalized-message-prompts"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"

const fact: JapanEntryPersonalizationFact = { id: "japan-audit-language", statement: "The checked public pages did not show a Japanese-language customer path.", source: "https://example.com/contact", confidence: 0.76, anchors: ["Japanese-language"] }

describe("manual Japan Entry personalization contract", () => {
  it("requires a company strategy without a fixed opening or fixed CTA", () => {
    const prompt = initialInterestGenerationPrompt({ includeEstimate: false, includePrice: false, founderForwardCta: true })
    expect(prompt).toContain("Build the strategy before drafting")
    expect(prompt).toContain("one to three candidates")
    expect(prompt).toContain("must not share the same opening")
    expect(prompt).toContain("Use the supplied evidence_contract exactly")
    expect(prompt).toContain("A CTA that could be pasted unchanged into another company's message is invalid")
    expect(prompt).toContain("This is not a partnership proposal")
    expect(prompt).toContain("Tomohiro H / Paradigm LLC / contact@paradigmjp.com")
    expect(prompt).not.toContain("identify Sato")
    expect(prompt).not.toContain("Paragraph 1 must be exactly")
    expect(prompt).not.toContain("Paragraph 4 must be exactly")
  })

  it("makes the critic reject template-shaped or data-dump copy", () => {
    const prompt = criticMessages("Example", [fact], [{ message: "Example message", fact_ids: [fact.id], product_evidence: "fraud review workflow", angle: "problem" }], "audit", "initial_interest")[0]?.content ?? ""
    expect(prompt).toContain("Reject stock outreach openings")
    expect(prompt).toContain("reject more than four fact_ids")
    expect(prompt).toContain("feel written for this company")
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
    expect(payload).toContain('"required_product_evidence":"API-first fraud review workflow for marketplaces."')
    expect(payload).toContain('"requiredFactIds":["japan-audit-language"]')
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

  it("rejects speculative product-market fit while allowing a final routing question", () => {
    const message = `${manualFormGreeting("Example")}\n\nExample documents an API-first fraud review workflow for marketplaces that could help Japanese teams.\n\nThe public pages did not show a Japanese-language customer path, so Japan applicability remains unverified.\n\nI can share a one-page Japan Opportunity Snapshot focused on Example's Japanese-language path. Could you forward it to the person responsible for international growth?\n\n${MANUAL_FORM_SIGNATURE}`
    const result = reviewPersonalizedJapanEntryMessage({ message, companyName: "Example", productContext: "Example documents an API-first fraud review workflow for marketplaces.", productEvidence: "API-first fraud review workflow", factIds: [fact.id], facts: [fact], purpose: "initial_interest", initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true }, messageAngle: "problem", candidateAngle: "problem" })
    expect(result.issues).toContain("Speculative product-market-fit language is prohibited outside the final permission question")
  })

  it("rejects praise and a barrier claim inferred from a missing public path", () => {
    const message = `${manualFormGreeting("Example")}\n\nExample's API-first fraud review workflow is valuable for marketplace teams.\n\nThe public pages did not show a Japanese-language customer path, which could be a barrier for Japanese evaluators.\n\nI can share a one-page Japan Opportunity Snapshot focused on Example's Japanese-language path. Could you forward it to the person responsible for international growth?\n\n${MANUAL_FORM_SIGNATURE}`
    const result = reviewPersonalizedJapanEntryMessage({ message, companyName: "Example", productContext: "Example documents an API-first fraud review workflow for marketplaces.", productEvidence: "API-first fraud review workflow", factIds: [fact.id], facts: [fact], purpose: "initial_interest", initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true }, messageAngle: "problem", candidateAngle: "problem" })
    expect(result.issues).toContain("Generic, promotional, invented, or unsupported market phrasing is prohibited")
    expect(result.issues).toContain("Unsupported causal inference or invented package deliverable is prohibited")
  })
})

import { describe, expect, it } from "vitest"
import { generationMessages } from "./japan-entry-personalized-message-prompts"
import { reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message-review"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

const facts: JapanEntryPersonalizationFact[] = [
  {
    id: "japan-audit-language",
    statement: "The checked public pages did not show a Japanese-language customer path.",
    source: "Japan market public-page audit",
    confidence: 0.76,
    anchors: ["Japanese-language"],
  },
  {
    id: "prepared-positioning-concept",
    statement: "A draft Japanese positioning concept is prepared and stored for this review.",
    source: "Stored manual-work positioning draft",
    confidence: 0.9,
    anchors: ["draft Japanese positioning concept"],
  },
]

describe("Japan Entry evidence-gated angle prompts", () => {
  it("passes the exact industry playbook and mockup angle to DeepSeek", () => {
    const messages = generationMessages({
      companyName: "Example",
      industry: "Technology / IT",
      productContext: "security architecture platform for technology teams",
      targetCountry: "US",
      businessModel: "saas",
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "mockup",
      outreachPlaybook: "cyber_b2b_infrastructure",
    }, facts, "audit")

    expect(messages[0]?.content).toContain("exact outreach angle 'mockup'")
    expect(messages[0]?.content).toContain("security overview, architecture, technical evaluation")
    expect(messages[0]?.content).toContain("remains unpublished")
    expect(messages[1]?.content).toContain('"outreach_angle":"mockup"')
    expect(messages[1]?.content).toContain('"outreach_playbook":"cyber_b2b_infrastructure"')
  })

  it("rejects a mockup claim unless the candidate selects the stored concept and labels it unpublished", () => {
    const reviewed = reviewPersonalizedJapanEntryMessage({
      message: `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example and its security architecture platform for technology teams.

In a public-page review, the checked pages did not show a Japanese-language customer path.

I can share a one-page Japan Opportunity Snapshot based on this public evidence. Could you forward this to the founder or person responsible for international growth?`,
      companyName: "Example",
      productContext: "security architecture platform for technology teams",
      productEvidence: "security architecture platform",
      factIds: ["japan-audit-language"],
      facts,
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "mockup",
      candidateAngle: "mockup",
    })

    expect(reviewed.passed).toBe(false)
    expect(reviewed.issues).toContain("The mockup angle requires a stored positioning concept")
  })
})

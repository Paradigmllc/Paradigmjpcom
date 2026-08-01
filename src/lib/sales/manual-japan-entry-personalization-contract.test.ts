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
    expect(prompt).toContain("must not share the same paragraph count")
    expect(prompt).toContain("Use the supplied evidence_contract exactly")
    expect(prompt).toContain("Follow copy_plan.architecture")
    expect(prompt).toContain("one original permission or routing question")
    expect(prompt).toContain("four to five short paragraphs")
    expect(prompt).toContain("Do not copy any complete sentence from recent_copy_to_avoid")
    expect(prompt).toContain("Satisfy every required_cta_contract field")
    expect(prompt).toContain("Never write 'I can share a detailed Japan opportunity analysis based on this public evidence'")
    expect(prompt).toContain("This is not a partnership proposal")
    expect(prompt).toContain("Tomohiro H / Paradigm LLC / contact@paradigmjp.com")
    expect(prompt).not.toContain("identify Sato")
    expect(prompt).not.toContain("Paragraph 1 must be exactly")
    expect(prompt).not.toContain("Paragraph 4 must be exactly")
  })

  it("makes the critic reject template-shaped or data-dump copy", () => {
    const prompt = criticMessages("Example", [fact], [{ message: "Example message", fact_ids: [fact.id], product_evidence: "fraud review workflow", product_evidence_rendering: "fraud review workflow", angle: "problem" }], "audit", "initial_interest")[0]?.content ?? ""
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

  it("keeps non-English source evidence exact while requiring a faithful English rendering", () => {
    const messages = generationMessages({
      companyName: "Altairis",
      industry: "Technology / IT",
      productContext: "Altairis développe et accompagne sur le logiciel ERP/CRM Dolibarr pour la gestion d'entreprise.",
      productNames: ["Dolibarr"],
      targetCountry: "FR",
      businessModel: "saas",
      purpose: "initial_interest",
    }, [fact], "audit")
    const payload = messages[1]?.content ?? ""

    expect(messages[0]?.content).toContain("natural English that faithfully preserves")
    expect(messages[0]?.content).toContain("use the rendering verbatim")
    expect(payload).toContain('"preserve_source_phrase_exactly_in_product_evidence":true')
    expect(payload).toContain('"render_source_faithfully_in_english":true')
  })

  it("never exposes internal evidence sources to generation or critic payloads", () => {
    const messages = generationMessages({ companyName: "Example", industry: "SaaS / AI / Developer Tools", productContext: "Example provides an API-first fraud review workflow for marketplaces.", targetCountry: "US", businessModel: "saas", purpose: "initial_interest", initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true }, messageAngle: "problem", outreachPlaybook: "saas_ai_devtools" }, [fact], "audit")
    const payload = messages[1]?.content ?? ""
    expect(payload).toContain('"required_product_evidence":"API-first fraud review workflow for marketplaces."')
    expect(payload).toContain('"requiredFactIds":["japan-audit-language"]')
    expect(payload).toContain('"required_cta_contract":{"final_question_must_be_permission_or_routing":true')
    expect(payload).toContain('"final_paragraph_must_contain_exact":["Example","Japanese-language"]')
    expect(payload).toContain('"final_question_may_use_natural_pronoun":true')
    expect(payload).toContain('"copy_plan":{')
    expect(payload).toContain('"required_question_decision_anchor":"Japanese-language evaluation-path decision"')
    expect(payload).toContain('"narrativeInstruction"')
    expect(payload).not.toContain('"approved_cta_contracts"')
    expect(payload).not.toContain('"exact_final_paragraph"')
    expect(payload).not.toContain("https://example.com/contact")
    expect(payload).not.toContain('"source"')
    const criticPayload = criticMessages("Example", [fact], [{ message: "Example message", fact_ids: [fact.id], product_evidence: "fraud review workflow", product_evidence_rendering: "fraud review workflow", angle: "problem" }], "audit", "initial_interest")[1]?.content ?? ""
    expect(criticPayload).not.toContain("https://example.com/contact")
    expect(criticPayload).not.toContain('"source"')
  })

  it("sends only the selected safe product phrases instead of unsafe raw storefront context", () => {
    const messages = generationMessages({
      companyName: "Airvida",
      industry: "Consumer Products",
      productContext: [
        "ible Airvida’s high-concentration negative ions cause PM2.5 and pollen to fall to the ground.",
        "Sorry, this product is unavailable. Please choose a different combination.",
        "Airvida – Wearable Air Purifier",
        "99% pollen removal rate",
      ].join(" | "),
      targetCountry: "US",
      businessModel: "ecommerce",
      purpose: "initial_interest",
    }, [fact], "audit")
    const payload = JSON.parse(messages[1]?.content ?? "{}") as {
      product_context?: string
      required_product_evidence?: string
    }

    expect(payload.required_product_evidence).toBe("Wearable Air Purifier")
    expect(payload.product_context).toBe("Wearable Air Purifier")
    expect(payload.product_context).not.toMatch(/PM2\.5|unavailable|99%|\bible\b/i)
  })

  it("sends bounded recent-copy digests instead of repeating full messages in every repair prompt", () => {
    const reusableSentence = "This diagnosis sentence is long enough and should not be reused across company messages."
    const longMiddle = `${reusableSentence} `.repeat(40)
    const priorMessage = `${manualFormGreeting("Prior")}\n\nPrior documents a workflow.\n\n${longMiddle}\n\nWho owns the Prior decision?\n\n${MANUAL_FORM_SIGNATURE}`
    const messages = generationMessages({
      companyName: "Example",
      industry: "SaaS / AI / Developer Tools",
      productContext: "Example provides an API-first fraud review workflow for marketplaces.",
      targetCountry: "US",
      businessModel: "saas",
      purpose: "initial_interest",
      priorMessages: [{ companyName: "Prior", message: priorMessage }, { companyName: "Earlier", message: priorMessage }],
    }, [fact], "audit")
    const payload = JSON.parse(messages[1]?.content ?? "{}") as {
      recent_copy_to_avoid?: Array<{ opening: string; diagnosis: string; cta: string; message?: string }>
      verbatim_sentences_to_avoid?: string[]
    }

    expect(payload.recent_copy_to_avoid?.[0]).toMatchObject({
      opening: "Prior documents a workflow.",
      cta: "Who owns the Prior decision?",
    })
    expect(payload.recent_copy_to_avoid?.[0]?.diagnosis.length).toBeLessThanOrEqual(480)
    expect(payload.recent_copy_to_avoid?.[0]).not.toHaveProperty("message")
    expect(payload.verbatim_sentences_to_avoid).toContain(reusableSentence)
  })

  it("fails closed when form copy contains a citation even without a URL", () => {
    const message = `Example documents an API-first fraud review workflow for marketplaces. I’m Sato from Paradigm LLC in Japan.\n\nAccording to the public source, the checked public pages did not show a Japanese-language customer path.\n\nI mapped this as an unverified Japan customer-path question in a short opportunity analysis. Would you be open to receiving it?`
    const result = reviewPersonalizedJapanEntryMessage({ message, companyName: "Example", productContext: "Example documents an API-first fraud review workflow for marketplaces.", productEvidence: "API-first fraud review workflow", factIds: [fact.id], facts: [fact], purpose: "initial_interest", initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false }, messageAngle: "problem", candidateAngle: "problem" })
    expect(result.passed).toBe(false)
    expect(result.issues).toContain("Sources, citations, and reference markers are prohibited in form copy")
  })

  it("accepts an exact foreign-language source phrase represented by a faithful English message phrase", () => {
    const sourceEvidence = "logiciel ERP/CRM Dolibarr pour la gestion d'entreprise"
    const englishRendering = "Dolibarr ERP/CRM software for business management"
    const message = `${manualFormGreeting("Altairis")}

Altairis develops and supports ${englishRendering}. The public description identifies the product as business-management software rather than making a claim about results or customers.

My public-page review did not show a Japanese-language customer path. Whether that observed gap matters for Altairis and its Japan customer path remains unverified, so the immediate question is whether a localized evaluation route warrants evidence-led testing.

I can share a one-page Japan Opportunity Snapshot focused on Altairis's Japanese-language customer path and the market-entry decision it would inform. May I send the Altairis analysis?

${MANUAL_FORM_SIGNATURE}`
    const result = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Altairis",
      productContext: `Altairis développe et accompagne sur le ${sourceEvidence}.`,
      productEvidence: sourceEvidence,
      productEvidenceRendering: englishRendering,
      productNames: ["Dolibarr"],
      factIds: [fact.id],
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(result.issues).not.toContain("Product evidence is not grounded in the supplied product context")
    expect(result.issues).not.toContain("The faithful English product-evidence rendering is missing from the message")
    expect(result.issues).not.toContain("The opening product section must contain the company or exact product name and faithful English product-evidence rendering")
  })

  it("accepts an exact product brand in the opening and a natural Japan analysis CTA", () => {
    const productEvidence = "unlimited forms and submissions for free"
    const message = `${manualFormGreeting("Tally Forms")}

Tally documents ${productEvidence}. The public description also explains that forms can be built by typing questions without code.

My public-page review did not show a Japanese-language customer path. Whether that observed gap matters for Tally's Japan customer path remains unverified, so the decision is whether a localized evaluation route warrants testing.

I prepared a Japan opportunity analysis focused on Tally's Japanese-language customer path and the decision it would inform. Who owns the Tally Japan customer-path decision?

${MANUAL_FORM_SIGNATURE}`
    const result = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Tally Forms",
      productContext: `Tally gives you ${productEvidence}. Tally makes it simple to build forms by typing questions without code.`,
      productEvidence,
      productEvidenceRendering: productEvidence,
      productNames: ["Tally"],
      factIds: [fact.id],
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(result.issues).not.toContain("The first body paragraph must open with a company-specific observation")
    expect(result.issues).not.toContain("The opening product section must contain the company or exact product name and faithful English product-evidence rendering")
    expect(result.issues).not.toContain("Low-pressure report or 15-minute CTA is missing")
  })

  it("normalizes grounded product-term inflections without allowing a new need claim", () => {
    const productEvidence = "unlimited forms and submissions for free"
    const grounded = reviewPersonalizedJapanEntryMessage({
      message: `${manualFormGreeting("Tally Forms")}

Tally documents ${productEvidence} and a workflow that needs no coding.

My public-page review did not show a Japanese-language customer path. Whether that observed gap matters for Tally's Japan customer path remains unverified, so the decision is whether a localized route warrants testing.

I prepared a Japan opportunity analysis focused on Tally's Japanese-language customer path. Who owns the Tally Japan customer-path decision?

${MANUAL_FORM_SIGNATURE}`,
      companyName: "Tally Forms",
      productContext: `Tally gives you ${productEvidence}. No need to code; just type your questions.`,
      productEvidence,
      productEvidenceRendering: productEvidence,
      productNames: ["Tally"],
      factIds: [fact.id],
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "problem",
      candidateAngle: "problem",
    })
    const invented = reviewPersonalizedJapanEntryMessage({
      message: `${manualFormGreeting("Example")}

Example documents an API-first fraud review workflow that meets marketplace needs.

My public-page review did not show a Japanese-language customer path. Whether that observed gap matters for Example remains unverified.

I prepared a Japan opportunity analysis focused on Example's Japanese-language customer path. Who owns the Example Japan customer-path decision?

${MANUAL_FORM_SIGNATURE}`,
      companyName: "Example",
      productContext: "Example documents an API-first fraud review workflow.",
      productEvidence: "API-first fraud review workflow",
      productEvidenceRendering: "API-first fraud review workflow",
      factIds: [fact.id],
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(grounded.issues).not.toContain("Unsupported product-context terms in paragraph 2: need")
    expect(invented.issues).toContain("Unsupported product-context terms in paragraph 2: need")
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

  it("rejects a product sentence repeated with a lightly changed lead-in", () => {
    const repeated = `${manualFormGreeting("Altairis")}

Altairis provides the Dolipro offering, where your Dolibarr is supplemented with essential external modules and you are on our secure servers. With the Dolipro offering, your Dolibarr is supplemented with essential external modules and you are on our secure servers.

My public-page review did not show a Japanese-language customer path. Whether that observed gap matters for Altairis remains unverified.

The decision is whether a localized evaluation route warrants evidence-led testing before a broader commitment.

I can share a one-page Japan Opportunity Snapshot focused on Altairis's Japanese-language customer path. May I send the Altairis analysis?

${MANUAL_FORM_SIGNATURE}`
    const result = reviewPersonalizedJapanEntryMessage({
      message: repeated,
      companyName: "Altairis",
      productContext: "Altairis provides the Dolipro offering, where your Dolibarr is supplemented with essential external modules and you are on our secure servers.",
      productEvidence: "Dolipro offering",
      productEvidenceRendering: "Dolipro offering",
      productNames: ["Dolipro", "Dolibarr"],
      factIds: [fact.id],
      facts: [fact],
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
      candidateAngle: "problem",
    })

    expect(result.passed).toBe(false)
    expect(result.issues).toContain("Repeated or near-duplicate sentences are prohibited; each sentence must add a distinct company-specific point")
  })
})

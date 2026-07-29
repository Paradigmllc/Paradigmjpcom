import { describe, expect, it } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import {
  buildManualChatGptHandoffPrompt,
  isManualChatGptBriefReady,
  MANUAL_CHATGPT_BATCH_MAX,
} from "./manual-work-chatgpt-handoff"

function row(index = 1): ManualJapanEntryWorkRow {
  const workId = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
  return {
    id: workId,
    company_name: `Northstar ${index}`,
    domain: `northstar-${index}.example`,
    country_code: "SG",
    business_model: "saas",
    product_context: "AI workflow automation for ecommerce operations teams",
    evidence: {
      analysis_mode: "chatgpt_brief_ready",
      editorialBrief: {
        version: "chatgpt-pro-handoff-v1",
        workId,
        domain: `northstar-${index}.example`,
        companyName: `Northstar ${index}`,
        countryCode: "SG",
        businessModel: "saas",
        productNames: [`Northstar Flow ${index}`],
        productContext: "AI workflow automation for ecommerce operations teams",
        collectedAt: "2026-07-29T00:00:00.000Z",
        contactUrl: `https://northstar-${index}.example/contact`,
        publicEmail: null,
        pages: [{
          url: `https://northstar-${index}.example/product`,
          kind: "product",
          title: `Northstar Flow ${index}`,
          description: "Automates fulfillment exceptions and customer-support routing",
          headings: ["Resolve operations exceptions automatically"],
        }],
        evidence: [
          { id: "e01", pageKind: "product", statement: "Automates fulfillment exceptions and customer-support routing", sourceUrl: `https://northstar-${index}.example/product` },
          { id: "e02", pageKind: "pricing", statement: "A self-serve Pro plan is available for ecommerce teams", sourceUrl: `https://northstar-${index}.example/pricing` },
          { id: "e03", pageKind: "news", statement: "The company recently expanded integrations for Shopify merchants", sourceUrl: `https://northstar-${index}.example/news` },
        ],
      },
    },
    message_review: { purpose: "chatgpt_handoff", generation_status: "brief_ready" },
    manually_sent_at: null,
    reply_received_at: null,
    founder_forwarded_at: null,
    meeting_converted_at: null,
    updated_at: "2026-07-29T00:00:00.000Z",
  } as unknown as ManualJapanEntryWorkRow
}

describe("manual ChatGPT handoff", () => {
  it("recognizes an unsent evidence-backed brief", () => {
    expect(isManualChatGptBriefReady(row())).toBe(true)
  })

  it("builds strict JSON-only instructions with company-specific evidence", () => {
    const prompt = buildManualChatGptHandoffPrompt([row()])
    expect(prompt).toContain("Return STRICT JSON only")
    expect(prompt).toContain("00000000-0000-4000-8000-000000000001")
    expect(prompt).toContain("Northstar Flow 1")
    expect(prompt).toContain("ecommerce operations teams")
    expect(prompt).toContain("Never invent Japan traffic")
    expect(prompt).toContain('"status":"ready or insufficient"')
  })

  it("limits one handoff to the bounded batch maximum", () => {
    const prompt = buildManualChatGptHandoffPrompt(Array.from({ length: 20 }, (_, index) => row(index + 1)))
    const matches = prompt.match(/00000000-0000-4000-8000-/g) ?? []
    expect(matches).toHaveLength(MANUAL_CHATGPT_BATCH_MAX)
    expect(prompt).not.toContain("000000000016")
  })

  it("does not expose a sent record as handoff-ready", () => {
    const sent = { ...row(), manually_sent_at: "2026-07-29T01:00:00.000Z" }
    expect(isManualChatGptBriefReady(sent)).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  recent: vi.fn(),
  update: vi.fn(),
  similarity: vi.fn(),
}))

vi.mock("./manual-japan-entry-store", () => ({
  findManualWorkById: mocks.find,
  listRecentManualMessages: mocks.recent,
  updateManualWork: mocks.update,
}))
vi.mock("./manual-japan-entry-message-similarity", () => ({
  reviewManualMessageDistinctness: mocks.similarity,
}))

import { importManualChatGptItem } from "./manual-work-chatgpt-import"

const workId = "106db008-80af-4c56-93ee-916643d84c1b"

function row(overrides: Record<string, unknown> = {}): ManualJapanEntryWorkRow {
  return {
    id: workId,
    company_name: "Northstar Flow",
    domain: "northstar.example",
    country_code: "SG",
    is_japanese_company: false,
    status: "completed",
    stage: "complete",
    evidence: {
      analysis_mode: "chatgpt_brief_ready",
      editorialBrief: {
        version: "chatgpt-pro-handoff-v1",
        workId,
        domain: "northstar.example",
        companyName: "Northstar Flow",
        countryCode: "SG",
        businessModel: "saas",
        productNames: ["Northstar Flow"],
        productContext: "AI operations automation for ecommerce teams",
        collectedAt: "2026-07-29T00:00:00.000Z",
        contactUrl: "https://northstar.example/contact",
        publicEmail: null,
        pages: [],
        evidence: [
          { id: "e01", pageKind: "product", statement: "Automates fulfillment exceptions", sourceUrl: "https://northstar.example/product" },
          { id: "e02", pageKind: "pricing", statement: "Offers a self-serve Pro plan", sourceUrl: "https://northstar.example/pricing" },
          { id: "e03", pageKind: "news", statement: "Expanded Shopify integrations", sourceUrl: "https://northstar.example/news" },
        ],
      },
    },
    message_review: { purpose: "chatgpt_handoff", generation_status: "brief_ready" },
    manually_sent_at: null,
    reply_received_at: null,
    founder_forwarded_at: null,
    meeting_converted_at: null,
    ...overrides,
  } as unknown as ManualJapanEntryWorkRow
}

const validBody = [
  "Northstar Flow already handles fulfillment exceptions and customer-support routing inside one operating layer for ecommerce teams.",
  "That combination creates a specific Japan question: whether a localized proof-of-value around exception handling could open the market before a broader product translation project, especially while the self-serve Pro plan keeps the first test commercially bounded.",
  "Would it be useful if I sent a short note outlining the first Japanese customer segment, the entry channel I would test, and the minimum localization needed to evaluate it?",
].join("\n\n")

beforeEach(() => {
  vi.clearAllMocks()
  mocks.find.mockResolvedValue(row())
  mocks.recent.mockResolvedValue([])
  mocks.similarity.mockReturnValue({
    passed: true,
    maxSimilarity: 0.05,
    maxCtaSimilarity: 0.08,
    matchedMessageId: null,
    matchedCompany: null,
    reasons: [],
  })
  mocks.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({ ...row(), ...patch }))
})

describe("manual ChatGPT output import", () => {
  it("wraps and stores a valid evidence-backed message", async () => {
    const result = await importManualChatGptItem({
      workId,
      status: "ready",
      subject: "A bounded Japan test for Northstar Flow",
      body: validBody,
      evidenceIds: ["e01", "e02"],
      score: 93,
      reasoningSummary: "Uses the product's exception-handling workflow and self-serve plan to frame a bounded Japan validation.",
      insufficiencyReason: null,
    })

    expect(result.ok).toBe(true)
    expect(mocks.update).toHaveBeenCalledWith(workId, expect.objectContaining({
      status: "completed",
      initial_message: expect.stringContaining("Hello Northstar Flow team,"),
      evidence: expect.objectContaining({ analysis_mode: "chatgpt_manual_import" }),
      message_review: expect.objectContaining({
        generation_status: "imported_chatgpt_pro",
        generation_engine: "chatgpt_pro_manual_handoff",
        api_used: false,
      }),
    }))
    const stored = mocks.update.mock.calls.at(-1)?.[1]?.initial_message as string
    expect(stored).toContain("Best regards,")
    expect(stored).toContain("Paradigm LLC")
  })

  it("rejects stock copy before persisting", async () => {
    const result = await importManualChatGptItem({
      workId,
      status: "ready",
      subject: null,
      body: `I reviewed your website. ${validBody}`,
      evidenceIds: ["e01", "e02"],
      score: 95,
      reasoningSummary: null,
      insufficiencyReason: null,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain("定型句")
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("rejects unknown evidence IDs", async () => {
    const result = await importManualChatGptItem({
      workId,
      status: "ready",
      subject: null,
      body: validBody,
      evidenceIds: ["e99", "e98"],
      score: 95,
      reasoningSummary: null,
      insufficiencyReason: null,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain("根拠ID")
  })

  it("stores an insufficient decision without fabricating copy", async () => {
    const result = await importManualChatGptItem({
      workId,
      status: "insufficient",
      subject: null,
      body: null,
      evidenceIds: [],
      score: 62,
      reasoningSummary: null,
      insufficiencyReason: "The public pages do not expose enough commercial detail for a company-specific first touch.",
    })

    expect(result.ok).toBe(true)
    expect(mocks.update).toHaveBeenCalledWith(workId, expect.objectContaining({
      status: "needs_review",
      initial_message: null,
      message_review: expect.objectContaining({ generation_status: "chatgpt_insufficient" }),
    }))
  })

  it("never overwrites a sent record", async () => {
    mocks.find.mockResolvedValue(row({ manually_sent_at: "2026-07-29T01:00:00.000Z" }))
    const result = await importManualChatGptItem({
      workId,
      status: "ready",
      subject: null,
      body: validBody,
      evidenceIds: ["e01", "e02"],
      score: 95,
      reasoningSummary: null,
      insufficiencyReason: null,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain("上書きできません")
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

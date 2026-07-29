import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  importItem: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-work-chatgpt-import", () => ({ importManualChatGptItem: mocks.importItem }))

import { POST } from "./route"

const item = {
  workId: "106db008-80af-4c56-93ee-916643d84c1b",
  status: "ready",
  subject: null,
  body: "Northstar Flow combines fulfillment exception handling with customer support routing for ecommerce teams. That operating model creates a practical Japan question: whether a localized proof-of-value around exception handling can validate demand before a broad translation project. The self-serve Pro plan also keeps the initial test bounded. Would it be useful if I sent a concise note on the first customer segment, entry channel, and minimum localization needed to evaluate that path?",
  evidenceIds: ["e01", "e02"],
  score: 93,
  reasoningSummary: "A bounded exception-handling validation angle.",
  insufficiencyReason: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.importItem.mockResolvedValue({ workId: item.workId, ok: true, item: { id: item.workId, message_review: { generation_status: "imported_chatgpt_pro" } } })
})

describe("ChatGPT output import API", () => {
  it("requires admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/import", {
      method: "POST",
      body: JSON.stringify({ raw: JSON.stringify({ items: [item] }) }),
    }))
    expect(response.status).toBe(401)
    expect(mocks.importItem).not.toHaveBeenCalled()
  })

  it("accepts strict JSON and imports each item", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw: JSON.stringify({ items: [item] }) }),
    }))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.imported).toBe(1)
    expect(body.failed).toBe(0)
    expect(mocks.importItem).toHaveBeenCalledWith(item)
  })

  it("strips a Markdown JSON fence before validation", async () => {
    const raw = `\`\`\`json\n${JSON.stringify({ items: [item] })}\n\`\`\``
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.importItem).toHaveBeenCalledTimes(1)
  })

  it("rejects malformed pasted JSON before any DB call", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw: "not-json" }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.importItem).not.toHaveBeenCalled()
  })

  it("returns multi-status when one item fails a server-side quality gate", async () => {
    const second = { ...item, workId: "206db008-80af-4c56-93ee-916643d84c1b" }
    mocks.importItem
      .mockResolvedValueOnce({ workId: item.workId, ok: true, item: { id: item.workId, message_review: { generation_status: "imported_chatgpt_pro" } } })
      .mockResolvedValueOnce({ workId: second.workId, ok: false, error: "根拠IDが不足しています" })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw: JSON.stringify({ items: [item, second] }) }),
    }))
    const body = await response.json()
    expect(response.status).toBe(207)
    expect(body.imported).toBe(1)
    expect(body.failed).toBe(1)
  })
})

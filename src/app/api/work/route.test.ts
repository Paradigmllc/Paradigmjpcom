import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  summary: vi.fn(),
  sources: vi.fn(),
  outcome: vi.fn(),
  fast: vi.fn(),
  brief: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-store", () => ({
  listManualJapanEntryWorkPage: mocks.list,
  getManualWorkDashboardSummary: mocks.summary,
  listManualLeadSourceCatalog: mocks.sources,
  MANUAL_WORK_OUTCOMES: ["manually_sent", "reply_received", "founder_forwarded", "meeting_converted"],
  recordManualWorkOutcome: mocks.outcome,
}))
vi.mock("@/lib/sales/manual-work-fast-service", () => ({ processFastManualWorkUrl: mocks.fast }))
vi.mock("@/lib/sales/manual-work-editorial-service", () => ({ processManualEditorialMessage: mocks.brief }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { GET, PATCH, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.OPENAI_API_KEY
  delete process.env.OPENROUTER_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  mocks.authorize.mockResolvedValue(true)
  mocks.list.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0, hasMore: false })
  mocks.summary.mockResolvedValue({ total: 0, actionRequired: 0, completed: 0, formReady: 0, manuallySent: 0, meetings: 0 })
  mocks.sources.mockResolvedValue([])
  mocks.outcome.mockResolvedValue({ id: "106db008-80af-4c56-93ee-916643d84c1b", manually_sent_at: "2026-07-16T00:00:00.000Z" })
  mocks.fast.mockResolvedValue({ item: { id: "work-1", domain: "example.com", status: "completed" }, duplicate: false, artifactsPreserved: false })
  mocks.brief.mockResolvedValue({ item: { id: "work-1", domain: "example.com", status: "completed" }, duplicate: false, artifactsPreserved: false })
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("manual work API", () => {
  it("requires admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(new NextRequest("https://paradigmjp.com/api/work"))
    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it("returns server-paginated history without obsolete experiment queries", async () => {
    mocks.list.mockResolvedValue({ items: [{ id: "row-101" }], page: 2, pageSize: 100, total: 401, hasMore: true })
    const response = await GET(new NextRequest("https://paradigmjp.com/api/work?page=2&filter=completed&q=acme"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith({ page: 2, pageSize: 100, filter: "completed", query: "acme" })
    expect(body).toMatchObject({ page: 2, total: 401, hasMore: true, items: [{ id: "row-101" }] })
    expect(body.metrics).toBeUndefined()
    expect(body.angleMetrics).toBeUndefined()
  })

  it("fast-qualifies exactly one explicit new URL without a writing API", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    }))
    expect(response.status).toBe(201)
    expect(mocks.fast).toHaveBeenCalledWith("https://example.com", "auto", "auto", {
      sourceSlug: "manual_input",
      sourcePageUrl: null,
      observedOn: null,
    })
    expect(mocks.brief).not.toHaveBeenCalled()
  })

  it("passes optional variant, angle, and source metadata only to deterministic fast qualification", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com",
        variant: "estimate_on_price_on",
        angle: "mockup",
        sourceSlug: "product_hunt",
        sourcePageUrl: "https://www.producthunt.com/products/example",
      }),
    }))
    expect(response.status).toBe(201)
    expect(mocks.fast).toHaveBeenCalledWith("https://example.com", "estimate_on_price_on", "mockup", {
      sourceSlug: "product_hunt",
      sourcePageUrl: "https://www.producthunt.com/products/example",
      observedOn: null,
    })
  })

  it("prepares a first-party ChatGPT brief for an explicit retry identity", async () => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", retry: true, workId }),
    }))

    expect(response.status).toBe(201)
    expect(mocks.brief).toHaveBeenCalledWith({ rawUrl: "https://example.com", expectedWorkId: workId })
    expect(mocks.fast).not.toHaveBeenCalled()
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({
      message: expect.stringContaining("外部AI API 0件"),
    }))
  })

  it("does not require OpenAI, OpenRouter, or DeepSeek credentials", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com",
        retry: true,
        workId: "106db008-80af-4c56-93ee-916643d84c1b",
      }),
    }))
    expect(response.status).toBe(201)
    expect(mocks.brief).toHaveBeenCalledTimes(1)
  })

  it("rejects a retry without its persistent history identity", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", retry: true }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.brief).not.toHaveBeenCalled()
  })

  it("rejects implicit or malformed batches", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["https://example.com"] }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.fast).not.toHaveBeenCalled()
  })

  it("records only an explicit operator outcome", async () => {
    const response = await PATCH(new NextRequest("https://paradigmjp.com/api/work", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "106db008-80af-4c56-93ee-916643d84c1b",
        outcome: "manually_sent",
        value: true,
      }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.outcome).toHaveBeenCalledWith({
      id: "106db008-80af-4c56-93ee-916643d84c1b",
      outcome: "manually_sent",
      value: true,
    })
  })
})

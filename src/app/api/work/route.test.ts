import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  metrics: vi.fn(),
  outcome: vi.fn(),
  process: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-store", () => ({
  listManualJapanEntryWork: mocks.list,
  listManualWorkExperimentMetrics: mocks.metrics,
  MANUAL_WORK_OUTCOMES: ["manually_sent", "reply_received", "founder_forwarded", "meeting_converted"],
  recordManualWorkOutcome: mocks.outcome,
}))
vi.mock("@/lib/sales/manual-japan-entry-service", () => ({ processManualJapanEntryUrl: mocks.process }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { GET, PATCH, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.list.mockResolvedValue([])
  mocks.metrics.mockResolvedValue([])
  mocks.outcome.mockResolvedValue({ id: "106db008-80af-4c56-93ee-916643d84c1b", manually_sent_at: "2026-07-16T00:00:00.000Z" })
  mocks.process.mockResolvedValue({ item: { id: "work-1", domain: "example.com" }, duplicate: false })
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("manual Japan Entry work API", () => {
  it("requires admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(new NextRequest("https://paradigmjp.com/api/work"))
    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it("processes exactly one explicit URL per request", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    }))
    expect(response.status).toBe(201)
    expect(mocks.process).toHaveBeenCalledWith("https://example.com", "auto")
  })

  it("passes an explicit experiment cell to the processor", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", variant: "estimate_on_price_on" }),
    }))
    expect(response.status).toBe(201)
    expect(mocks.process).toHaveBeenCalledWith("https://example.com", "estimate_on_price_on")
  })

  it("rejects implicit or malformed batches", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["https://example.com"] }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.process).not.toHaveBeenCalled()
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

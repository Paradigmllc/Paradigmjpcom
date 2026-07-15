import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  process: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-store", () => ({ listManualJapanEntryWork: mocks.list }))
vi.mock("@/lib/sales/manual-japan-entry-service", () => ({ processManualJapanEntryUrl: mocks.process }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { GET, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.list.mockResolvedValue([])
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
    expect(mocks.process).toHaveBeenCalledWith("https://example.com")
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
})

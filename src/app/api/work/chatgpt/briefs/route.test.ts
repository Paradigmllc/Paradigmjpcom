import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  find: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-store", () => ({ findManualWorkById: mocks.find }))
vi.mock("@/lib/sales/manual-work-editorial-service", () => ({ processManualEditorialMessage: mocks.prepare }))

import { POST } from "./route"

const firstId = "106db008-80af-4c56-93ee-916643d84c1b"
const secondId = "206db008-80af-4c56-93ee-916643d84c1b"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.find.mockImplementation(async (id: string) => ({ id, canonical_url: `https://${id}.example/` }))
  mocks.prepare.mockImplementation(async ({ expectedWorkId }: { expectedWorkId: string }) => ({
    item: { id: expectedWorkId, status: "completed", error_message: null },
    duplicate: false,
    artifactsPreserved: false,
  }))
})

describe("ChatGPT brief preparation API", () => {
  it("requires admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/briefs", {
      method: "POST",
      body: JSON.stringify({ workIds: [firstId] }),
    }))
    expect(response.status).toBe(401)
    expect(mocks.find).not.toHaveBeenCalled()
  })

  it("prepares selected records without invoking a writing API", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workIds: [firstId, secondId] }),
    }))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.prepared).toBe(2)
    expect(mocks.prepare).toHaveBeenCalledTimes(2)
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ expectedWorkId: firstId }))
  })

  it("deduplicates repeated work IDs", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workIds: [firstId, firstId] }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.prepare).toHaveBeenCalledTimes(1)
  })

  it("returns multi-status when one company cannot be prepared", async () => {
    mocks.find.mockImplementation(async (id: string) => id === secondId ? null : ({ id, canonical_url: `https://${id}.example/` }))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workIds: [firstId, secondId] }),
    }))
    const body = await response.json()
    expect(response.status).toBe(207)
    expect(body.prepared).toBe(1)
    expect(body.failed).toBe(1)
  })

  it("rejects more than the bounded batch size", async () => {
    const ids = Array.from({ length: 16 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/chatgpt/briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workIds: ids }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.prepare).not.toHaveBeenCalled()
  })
})

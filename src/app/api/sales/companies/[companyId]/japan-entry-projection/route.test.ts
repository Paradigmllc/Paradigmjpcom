import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  generate: vi.fn(),
  latest: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/japan-entry-projection-service", () => ({
  generateJapanEntryProjection: mocks.generate,
  getLatestJapanEntryProjection: mocks.latest,
}))

import { GET, POST } from "./route"

const companyId = "11111111-1111-4111-8111-111111111111"

function context(id = companyId) {
  return { params: Promise.resolve({ companyId: id }) }
}

beforeEach(() => {
  mocks.authorize.mockReset().mockResolvedValue(true)
  mocks.generate.mockReset()
  mocks.latest.mockReset()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("Japan Entry projection route error handling", () => {
  it("rejects malformed JSON without invoking generation", async () => {
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "POST",
      body: "{broken",
      headers: { "content-type": "application/json" },
    })
    const response = await POST(request, context())
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, error: "invalid json body" })
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it("rejects an invalid company id", async () => {
    const request = new NextRequest("http://localhost/api/sales/companies/not-a-uuid/japan-entry-projection", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    })
    const response = await POST(request, context("not-a-uuid"))
    expect(response.status).toBe(400)
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it("returns 502 when strict DeepSeek V4 Pro generation fails", async () => {
    mocks.generate.mockResolvedValue({ ok: false, error: "DeepSeek V4 Pro message generation failed" })
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    })
    const response = await POST(request, context())
    expect(response.status).toBe(502)
  })

  it("returns a JSON 500 for an unexpected GET exception", async () => {
    mocks.latest.mockRejectedValue(new Error("database offline"))
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection")
    const response = await GET(request, context())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ ok: false, error: "projection lookup failed" })
  })

  it("returns 201 only after a reviewed draft is stored", async () => {
    mocks.generate.mockResolvedValue({ ok: true, projection: { status: "needs_review" } })
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    })
    const response = await POST(request, context())
    expect(response.status).toBe(201)
    expect(mocks.generate).toHaveBeenCalledTimes(1)
  })
})

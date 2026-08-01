import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  generate: vi.fn(),
  latest: vi.fn(),
  syncTwenty: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/japan-entry-projection-service", () => ({
  generateJapanEntryProjection: mocks.generate,
  getLatestJapanEntryProjection: mocks.latest,
  syncJapanEntryProjectionToTwenty: mocks.syncTwenty,
}))

import { GET, POST, PUT } from "./route"

const companyId = "11111111-1111-4111-8111-111111111111"

function context(id = companyId) {
  return { params: Promise.resolve({ companyId: id }) }
}

beforeEach(() => {
  mocks.authorize.mockReset().mockResolvedValue(true)
  mocks.generate.mockReset()
  mocks.latest.mockReset()
  mocks.syncTwenty.mockReset()
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
    mocks.generate.mockResolvedValue({
      ok: true,
      projection: { status: "needs_review" },
      twentySync: { ok: true, status: "synced" },
    })
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    })
    const response = await POST(request, context())
    expect(response.status).toBe(201)
    expect(mocks.generate).toHaveBeenCalledTimes(1)
  })

  it("returns 207 with the saved draft when Twenty sync needs operator attention", async () => {
    mocks.generate.mockResolvedValue({
      ok: true,
      projection: { status: "needs_review" },
      twentySync: { ok: false, configured: true, status: "failed", error: "Twenty API HTTP 503" },
    })
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    })
    const response = await POST(request, context())
    expect(response.status).toBe(207)
    expect(await response.json()).toMatchObject({
      ok: true,
      projection: { status: "needs_review" },
      twentySync: { ok: false, status: "failed" },
    })
  })

  it("retries only the latest saved Japan Entry draft through PUT", async () => {
    mocks.latest.mockResolvedValue({ ok: true, projection: { id: "projection-1" } })
    mocks.syncTwenty.mockResolvedValue({
      ok: true,
      configured: true,
      status: "synced",
      projectionId: "projection-1",
      sent: false,
    })
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "PUT",
    })
    const response = await PUT(request, context())
    expect(response.status).toBe(200)
    expect(mocks.syncTwenty).toHaveBeenCalledWith(companyId, "projection-1")
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({
      ok: true,
      projectionId: "projection-1",
      twentySync: { status: "synced", sent: false },
    })
  })

  it("does not retry Twenty when no saved Japan Entry draft exists", async () => {
    mocks.latest.mockResolvedValue({ ok: true, projection: null })
    const request = new NextRequest("http://localhost/api/sales/companies/x/japan-entry-projection", {
      method: "PUT",
    })
    const response = await PUT(request, context())
    expect(response.status).toBe(404)
    expect(mocks.syncTwenty).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  sync: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/portal-sources/service", () => ({ listPortalCandidates: mocks.list }))
vi.mock("@/lib/sales/portal-sources/twenty-sync", () => ({ syncPortalCandidatesToTwenty: mocks.sync }))

import { POST } from "./route"

const candidateId = "11111111-1111-4111-8111-111111111111"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.list.mockResolvedValue([{ id: candidateId }])
  mocks.sync.mockResolvedValue({ requested: 1, synced: 1, reused: 0, skipped: 0, failed: 0, deferred: 0, results: [] })
})

describe("portal candidate Twenty sync API", () => {
  it("syncs a bounded explicit batch and never enables sending", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates/twenty-sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "ekiten", candidateIds: [candidateId] }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith("ekiten", 1, { ids: [candidateId] })
    expect(mocks.sync).toHaveBeenCalledWith([{ id: candidateId }], { force: false, concurrency: 1 })
    expect(await response.json()).toMatchObject({ ok: true, synced: 1, sendingEnabled: false })
  })

  it("rejects a candidate id that is not in the selected source", async () => {
    mocks.list.mockResolvedValue([])
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates/twenty-sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "ekiten", candidateIds: [candidateId] }),
    }))
    expect(response.status).toBe(404)
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it("returns a retryable multi-status when Twenty applies backpressure", async () => {
    mocks.sync.mockResolvedValue({ requested: 1, synced: 0, reused: 0, skipped: 0, failed: 0, deferred: 1, results: [] })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates/twenty-sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "ekiten", candidateIds: [candidateId] }),
    }))
    expect(response.status).toBe(207)
    expect(await response.json()).toMatchObject({ ok: false, deferred: 1, sendingEnabled: false })
  })
})

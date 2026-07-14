import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  after: vi.fn((callback: () => Promise<void>) => { void callback() }),
  approve: vi.fn(),
  authorize: vi.fn(),
  dispatch: vi.fn(),
  importUrls: vi.fn(),
  list: vi.fn(),
  notify: vi.fn(),
  snapshot: vi.fn(),
}))

vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: mocks.after,
}))
vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/demo-batch-drain", () => ({ dispatchDemoBatchDrain: mocks.dispatch }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/sales/portal-sources/service", () => ({
  approvePortalCandidateForDemo: mocks.approve,
  ingestPortalCandidateUrls: mocks.importUrls,
  listPortalCandidates: mocks.list,
  readPortalSnapshot: mocks.snapshot,
}))

import { GET, POST, PUT } from "./route"

const candidateId = "11111111-1111-4111-8111-111111111111"

function assets() {
  return [1, 2, 3].map((index) => ({
    id: `asset-${index}`,
    kind: "image",
    sourceUrl: `https://cdn.example.jp/work-${index}.webp`,
    ownerLabel: "匠リフォーム",
    sourceAccount: "https://www.houzz.jp/pro/takumi",
    useBasis: "private_proposal",
    officialSource: true,
    peopleVisible: false,
    watermarkVisible: false,
    alt: `施工例${index}`,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.dispatch.mockResolvedValue({ ok: true, status: 202 })
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.list.mockResolvedValue([])
})

describe("portal candidate API", () => {
  it("requires sales API authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates?source=houzz"))
    expect(response.status).toBe(401)
  })

  it("imports only through the selected portal adapter and keeps sending disabled", async () => {
    mocks.importUrls.mockResolvedValue({ ok: true, imported: 1, failed: 0, results: [] })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "houzz", urls: ["https://www.houzz.jp/pro/takumi"] }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.importUrls).toHaveBeenCalledWith("houzz", ["https://www.houzz.jp/pro/takumi"])
    expect(await response.json()).toMatchObject({ ok: true, imported: 1, sendingEnabled: false })
  })

  it("starts the existing automatic demo drain after a reviewed candidate is queued", async () => {
    mocks.approve.mockResolvedValue({ ok: true, reused: false, jobId: "job-1", companyId: "company-1", companyName: "匠リフォーム", sendingEnabled: false })
    const response = await PUT(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId, industry: "construction", prefecture: "東京都", assets: assets() }),
    }))
    await vi.waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1))
    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ ok: true, automated: true, sendingEnabled: false })
  })

  it("does not start a duplicate drain when an identical demo is reused", async () => {
    mocks.approve.mockResolvedValue({ ok: true, reused: true, companyId: "company-1", companyName: "匠リフォーム", sendingEnabled: false })
    const response = await PUT(new NextRequest("https://paradigmjp.com/api/sales/demo-site/portal-candidates", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId, industry: "construction", assets: assets() }),
    }))
    expect(response.status).toBe(202)
    expect(mocks.dispatch).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ ok: true, automated: false, sendingEnabled: false })
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), preview: vi.fn(), audit: vi.fn(), notify: vi.fn() }))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-source-records", () => ({ previewLeadSourceConfig: mocks.preview }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

const sourceId = "11111111-1111-4111-8111-111111111111"
const context = { params: Promise.resolve({ sourceId }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.preview.mockResolvedValue({ sourceId, rawCount: 10, accepted: 8, rejected: 2, acceptanceRate: 80, sample: [], previewedAt: "2026-07-14T00:00:00.000Z" })
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("lead source preview route", () => {
  it("previews and audits without ingesting source records", async () => {
    const response = await POST(new NextRequest(`https://paradigmjp.com/api/sales/lead-sources/${sourceId}/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operatorName: "Sato" }),
    }), context)

    expect(response.status).toBe(200)
    expect(mocks.preview).toHaveBeenCalledWith(sourceId)
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "previewed", operatorName: "Sato" }))
  })

  it("rejects unauthenticated preview requests", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest(`https://paradigmjp.com/api/sales/lead-sources/${sourceId}/preview`, { method: "POST" }), context)

    expect(response.status).toBe(401)
    expect(mocks.preview).not.toHaveBeenCalled()
  })
})

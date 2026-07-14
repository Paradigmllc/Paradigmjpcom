import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), preflight: vi.fn(), audit: vi.fn(), notify: vi.fn() }))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-source-preflight", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/sales/lead-source-preflight")>()
  return { ...original, runLeadSourcePreflightChunk: mocks.preflight }
})
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

const sourceId = "11111111-1111-4111-8111-111111111111"
const context = { params: Promise.resolve({ sourceId }) }

function request(mode: string) {
  return new NextRequest(`https://paradigmjp.com/api/sales/lead-sources/${sourceId}/preflight`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operatorName: "Sato", mode }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.preflight.mockResolvedValue({
    sourceId,
    processed: 9,
    remaining: 0,
    summary: { total: 9, pending: 0, checking: 0, eligible: 7, retryable: 1, rejected: 1, reasonCounts: {}, completed: true, checkedAt: "2026-07-15T00:00:00.000Z" },
  })
})

describe("lead source preflight route", () => {
  it("audits a completed bounded preflight and reports that no send occurred", async () => {
    const response = await POST(request("pending"), context)
    const payload = await response.json() as { ok?: boolean; summary?: { eligible?: number } }

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ ok: true, summary: { eligible: 7 } })
    expect(mocks.preflight).toHaveBeenCalledWith({ sourceId, mode: "pending" })
    expect(mocks.audit).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: "preflight_pending_requested", operatorName: "Sato" }))
    expect(mocks.audit).toHaveBeenNthCalledWith(2, expect.objectContaining({ action: "preflight_completed", operatorName: "Sato" }))
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({ type: "lead_source_preflight_completed", message: expect.stringContaining("外部送信は実行していません") }))
  })

  it("does not duplicate a start audit for continuation chunks", async () => {
    mocks.preflight.mockResolvedValueOnce({
      sourceId,
      processed: 50,
      remaining: 25,
      summary: { total: 75, pending: 25, checking: 0, eligible: 50, retryable: 0, rejected: 0, reasonCounts: {}, completed: false, checkedAt: "2026-07-15T00:00:00.000Z" },
    })

    const response = await POST(request("continue"), context)

    expect(response.status).toBe(200)
    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.notify).not.toHaveBeenCalled()
  })

  it("rejects invalid modes and unauthenticated requests", async () => {
    const invalid = await POST(request("unsafe"), context)
    mocks.authorize.mockResolvedValue(false)
    const unauthorized = await POST(request("pending"), context)

    expect(invalid.status).toBe(400)
    expect(unauthorized.status).toBe(401)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  reconcile: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-work-artifact-reconcile", () => ({
  reconcileManualWorkArtifacts: mocks.reconcile,
}))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.reconcile.mockResolvedValue({
    checked: 27,
    repaired: 27,
    skipped: 0,
    failed: 0,
    errors: [],
    sent: 0,
  })
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("manual work artifact reconciliation API", () => {
  it("requires sales admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/artifacts/reconcile", { method: "POST" }))
    expect(response.status).toBe(401)
    expect(mocks.reconcile).not.toHaveBeenCalled()
  })

  it("repairs up to 500 stored artifacts without sending", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/artifacts/reconcile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 500 }),
    }))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, result: { checked: 27, repaired: 27, failed: 0, sent: 0 } })
    expect(mocks.reconcile).toHaveBeenCalledWith({ limit: 500 })
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({
      message: expect.stringContaining("外部送信0件"),
    }))
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { authorizeWebhookRequest, notifyBothChannels, runLaunchAudit } = vi.hoisted(() => ({
  authorizeWebhookRequest: vi.fn(),
  notifyBothChannels: vi.fn(),
  runLaunchAudit: vi.fn(),
}))

vi.mock("@/lib/admin-auth", () => ({ authorizeWebhookRequest }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels }))
vi.mock("@/lib/shopify-ops/launch-control", () => ({ runLaunchAudit }))

import { POST } from "./route"

function request(): NextRequest {
  return new NextRequest("https://paradigmjp.com/api/shopify-ops/launch/audit", { method: "POST" })
}

const audit = {
  id: "audit-1",
  triggerSource: "scheduled" as const,
  status: "blocked" as const,
  readyGateCount: 2,
  totalGateCount: 12,
  catalogProductCount: 0,
  eligibleProductCount: 0,
  storefrontPasswordProtected: true,
  publicReleaseApproved: false,
  fingerprint: "fingerprint",
  gates: [],
  blockers: ["BASE未接続", "実商品なし"],
  startedAt: "2026-08-03T00:00:00.000Z",
  completedAt: "2026-08-03T00:00:01.000Z",
}

describe("SERICIA launch audit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWebhookRequest.mockReturnValue({ ok: true })
    notifyBothChannels.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated requests", async () => {
    authorizeWebhookRequest.mockReturnValue({ ok: false })
    const response = await POST(request())
    expect(response.status).toBe(401)
    expect(runLaunchAudit).not.toHaveBeenCalled()
  })

  it("persists a safe block and notifies only on a state change", async () => {
    runLaunchAudit.mockResolvedValue({ audit, notifyOperator: true })
    const response = await POST(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.result.audit.status).toBe("blocked")
    expect(notifyBothChannels).toHaveBeenCalledOnce()
  })

  it("does not repeat notifications for an unchanged snapshot", async () => {
    runLaunchAudit.mockResolvedValue({ audit, notifyOperator: false })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(notifyBothChannels).not.toHaveBeenCalled()
  })
})

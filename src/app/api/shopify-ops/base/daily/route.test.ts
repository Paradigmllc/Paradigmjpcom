import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { authorizeWebhookRequest, notifyBothChannels, runScheduledBaseSync } = vi.hoisted(() => ({
  authorizeWebhookRequest: vi.fn(),
  notifyBothChannels: vi.fn(),
  runScheduledBaseSync: vi.fn(),
}))

vi.mock("@/lib/admin-auth", () => ({ authorizeWebhookRequest }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels }))
vi.mock("@/lib/shopify-ops/base-sync-automation", () => ({ runScheduledBaseSync }))

import { POST } from "./route"

const run = {
  id: "run-1",
  mode: "apply" as const,
  status: "blocked" as const,
  triggeredBy: "scheduled" as const,
  sourceCount: 0,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  errorMessage: "BASEの商品が0件です",
  startedAt: "2026-08-03T00:00:00.000Z",
  completedAt: "2026-08-03T00:00:01.000Z",
}

function request(): NextRequest {
  return new NextRequest("https://paradigmjp.com/api/shopify-ops/base/daily", { method: "POST" })
}

describe("SERICIA scheduled BASE sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWebhookRequest.mockReturnValue({ ok: true })
    notifyBothChannels.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated requests", async () => {
    authorizeWebhookRequest.mockReturnValue({ ok: false })
    const response = await POST(request())
    expect(response.status).toBe(401)
    expect(runScheduledBaseSync).not.toHaveBeenCalled()
  })

  it("returns a recorded safety block and notifies the operator", async () => {
    runScheduledBaseSync.mockResolvedValue({ status: "blocked", reason: run.errorMessage, run, notifyOperator: true })
    const response = await POST(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.result.status).toBe("blocked")
    expect(notifyBothChannels).toHaveBeenCalledOnce()
  })

  it("returns 503 when the scheduled sync fails", async () => {
    runScheduledBaseSync.mockResolvedValue({
      status: "failed",
      reason: "BASE API timeout",
      run: { ...run, status: "failed", failedCount: 1, errorMessage: "BASE API timeout" },
      notifyOperator: true,
    })
    const response = await POST(request())
    expect(response.status).toBe(503)
  })
})

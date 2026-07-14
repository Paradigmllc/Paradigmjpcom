import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  processRun: vi.fn(),
  assertEvidenceFirst: vi.fn(),
  markFailed: vi.fn(),
  startFallback: vi.fn(),
  audit: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-candidate-runs", () => ({
  assertEvidenceFirstLeadCandidateRun: mocks.assertEvidenceFirst,
  processLeadCandidateRun: mocks.processRun,
  markLeadCandidateRunFailed: mocks.markFailed,
}))
vi.mock("@/lib/sales/lead-candidate-runner", () => ({ startLeadCandidateRunFallback: mocks.startFallback }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

const context = { params: Promise.resolve({ runId: "run-stale" }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.processRun.mockResolvedValue({ ok: true, processed: 24, hasMore: false, twentySynced: 3 })
  mocks.assertEvidenceFirst.mockResolvedValue(undefined)
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("lead candidate run processing route", () => {
  it("runs an authenticated synchronous recovery with bounded batches", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/runs/run-stale/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ async: false, batchSize: 24, maxBatches: 10, operatorName: "Sato" }),
    }), context)

    expect(response.status).toBe(200)
    expect(mocks.assertEvidenceFirst).toHaveBeenCalledWith("run-stale")
    expect(mocks.processRun).toHaveBeenCalledWith("run-stale", { batchSize: 24, maxBatches: 10 })
    expect(mocks.startFallback).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ ok: true, hasMore: false }))
  })

  it("rejects unauthenticated recovery before processing", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/runs/run-stale/process", {
      method: "POST",
      body: JSON.stringify({ async: false }),
    }), context)

    expect(response.status).toBe(401)
    expect(mocks.processRun).not.toHaveBeenCalled()
  })

  it("refuses a legacy run before starting an asynchronous fallback", async () => {
    mocks.assertEvidenceFirst.mockRejectedValue(new Error("Legacy lead candidate runs cannot be processed"))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/runs/run-stale/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ async: true, operatorName: "Sato" }),
    }), context)

    expect(response.status).toBe(409)
    expect(mocks.startFallback).not.toHaveBeenCalled()
    expect(mocks.markFailed).not.toHaveBeenCalled()
  })
})

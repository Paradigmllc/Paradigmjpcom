import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  get: vi.fn(),
  claimDrain: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  refresh: vi.fn(),
  notified: vi.fn(),
  promote: vi.fn(),
  releaseDrain: vi.fn(),
  findWork: vi.fn(),
  processFull: vi.fn(),
  processEditorial: vi.fn(),
  processFast: vi.fn(),
  notify: vi.fn(),
  schedule: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-batch-store", () => ({
  getManualWorkBatchCompact: mocks.get,
  claimManualWorkBatchDrain: mocks.claimDrain,
  claimManualWorkBatchItems: mocks.claim,
  completeManualWorkBatchItem: mocks.complete,
  refreshManualWorkBatch: mocks.refresh,
  markManualWorkBatchNotified: mocks.notified,
  promoteNextManualWorkBatch: mocks.promote,
  releaseManualWorkBatchDrain: mocks.releaseDrain,
}))
vi.mock("@/lib/sales/manual-japan-entry-store", () => ({ findManualWorkById: mocks.findWork }))
vi.mock("@/lib/sales/manual-japan-entry-service", () => ({ processManualJapanEntryUrl: mocks.processFull }))
vi.mock("@/lib/sales/manual-work-editorial-service", () => ({ processManualEditorialMessage: mocks.processEditorial }))
vi.mock("@/lib/sales/manual-work-fast-service", () => ({ processFastManualWorkUrl: mocks.processFast }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/sales/manual-japan-entry-batch-schedule", () => ({ scheduleManualWorkBatchDrain: mocks.schedule }))

import { POST } from "./route"

const batchId = "11111111-1111-4111-8111-111111111111"
const before = {
  batch: { id: batchId, status: "running", total_count: 2, message_variant_requested: "auto", message_angle_requested: "auto", source_slug: "manual_input", source_page_url: null, observed_on: null },
  items: [],
  counts: { queued: 2, processing: 0, completed: 0, needs_review: 0, rejected: 0, failed: 0, duplicate: 0 },
  finished: 0,
  remaining: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.get.mockResolvedValue(before)
  mocks.claimDrain.mockResolvedValue("drain-claim-1")
  mocks.claim.mockResolvedValue([
    { id: "item-1", canonical_url: "https://one.example/", claim_token: "claim-1", retry_requested: false },
    { id: "item-2", canonical_url: "https://two.example/", claim_token: "claim-2", retry_requested: false },
  ])
  mocks.findWork.mockResolvedValue({ evidence: { analysis_mode: "legacy_full" } })
  mocks.processFast.mockImplementation(async (url: string) => ({
    item: { id: url.includes("one") ? "work-1" : "work-2", status: url.includes("one") ? "completed" : "rejected", error_message: null },
    duplicate: false,
    artifactsPreserved: false,
  }))
  mocks.processEditorial.mockResolvedValue({
    item: { id: "work-editorial", status: "completed", error_message: null },
    duplicate: false,
    artifactsPreserved: false,
  })
  mocks.processFull.mockResolvedValue({
    item: { id: "work-full", status: "completed", error_message: null },
    duplicate: false,
    artifactsPreserved: false,
  })
  mocks.complete.mockResolvedValue(undefined)
  mocks.refresh.mockResolvedValue({ ...before, batch: { ...before.batch, status: "completed" }, remaining: 0, finished: 2, counts: { ...before.counts, queued: 0, completed: 1, rejected: 1 } })
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.notified.mockResolvedValue(true)
  mocks.promote.mockResolvedValue(null)
  mocks.releaseDrain.mockResolvedValue(undefined)
})

describe("manual work durable batch drain", () => {
  it("claims bounded items, fast-qualifies them concurrently, and persists terminal outcomes", async () => {
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.processFast).toHaveBeenCalledTimes(2)
    expect(mocks.processEditorial).not.toHaveBeenCalled()
    expect(mocks.processFull).not.toHaveBeenCalled()
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ itemId: "item-1", claimToken: "claim-1", status: "completed", workId: "work-1" }))
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ itemId: "item-2", claimToken: "claim-2", status: "rejected", workId: "work-2" }))
    expect(mocks.releaseDrain).toHaveBeenCalledWith(batchId, "drain-claim-1")
    expect(mocks.notify).toHaveBeenCalledTimes(1)
  })

  it("persists a failed fast item instead of abandoning its DB claim", async () => {
    mocks.claim.mockResolvedValue([{ id: "item-1", canonical_url: "https://one.example/", claim_token: "claim-1", retry_requested: false }])
    mocks.processFast.mockRejectedValue(new Error("Homepage temporarily unavailable"))
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({
      itemId: "item-1",
      status: "failed",
      errorMessage: "Homepage temporarily unavailable",
    }))
  })

  it("routes a selected fast-qualified row to the GPT-5.6 editorial service", async () => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    mocks.findWork.mockResolvedValue({ evidence: { analysis_mode: "fast_qualification" } })
    mocks.claim.mockResolvedValue([{
      id: "item-1",
      canonical_url: "https://one.example/",
      claim_token: "claim-1",
      retry_requested: true,
      expected_work_id: workId,
    }])
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.processFast).not.toHaveBeenCalled()
    expect(mocks.processFull).not.toHaveBeenCalled()
    expect(mocks.processEditorial).toHaveBeenCalledWith({
      rawUrl: "https://one.example/",
      expectedWorkId: workId,
    })
  })

  it("keeps a non-fast retry on the legacy full-analysis path", async () => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    mocks.claim.mockResolvedValue([{
      id: "item-1",
      canonical_url: "https://one.example/",
      claim_token: "claim-1",
      retry_requested: true,
      expected_work_id: workId,
    }])
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.processEditorial).not.toHaveBeenCalled()
    expect(mocks.processFull).toHaveBeenCalledWith(
      "https://one.example/",
      "auto",
      "auto",
      expect.objectContaining({ sourceSlug: "manual_input" }),
      { retryRequested: true, expectedWorkId: workId },
    )
  })

  it("chains the next server-side drain for an automated non-terminal batch", async () => {
    mocks.refresh.mockResolvedValue({ ...before, remaining: 1, finished: 1, counts: { ...before.counts, queued: 1, completed: 1 } })
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ automated: true }),
      }),
      { params: Promise.resolve({ batchId }) },
    )

    expect(response.status).toBe(202)
    expect(mocks.schedule).toHaveBeenCalledWith(batchId)
  })

  it("does not double-drain when another request owns the batch lease", async () => {
    mocks.claimDrain.mockResolvedValue(null)
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    const body = await response.json()
    expect(response.status).toBe(202)
    expect(body.processing).toBe(true)
    expect(mocks.claim).not.toHaveBeenCalled()
    expect(mocks.processFast).not.toHaveBeenCalled()
    expect(mocks.processEditorial).not.toHaveBeenCalled()
    expect(mocks.processFull).not.toHaveBeenCalled()
  })

  it("promotes and dispatches the next queued batch after completion", async () => {
    const nextId = "22222222-2222-4222-8222-222222222222"
    mocks.promote.mockResolvedValue({
      promoted: true,
      snapshot: { ...before, batch: { ...before.batch, id: nextId, status: "running" } },
    })
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.schedule).toHaveBeenCalledWith(nextId)
  })
})
